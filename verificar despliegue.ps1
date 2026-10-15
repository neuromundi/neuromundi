# ============================================================================
#  verificar despliegue.ps1 — Neuromundi
#
#  Responde una sola pregunta: ¿queda algo sin publicar?
#
#  Comprueba cuatro cosas y las deja en verde o en rojo:
#    1. Que no haya cambios sin confirmar ni confirmados sin empujar.
#    2. Que el paquete que sirve www.neuromundi.com sea el que compila su
#       repositorio ahora mismo (el fallo del 14 de octubre: compilar sin
#       confirmar, empujar nada, y creer que el sitio estaba al día).
#    3. Que las funciones desplegadas en Supabase sean posteriores al ultimo
#       cambio local de cada archivo.
#    4. Que el proyecto siga compilando sin errores de tipos.
#
#  Uso:   .\'verificar despliegue.ps1'
# ============================================================================

$ErrorActionPreference = 'Continue'
$fallos = 0
function Ok   ($m) { Write-Host "  OK    $m" -ForegroundColor Green }
function Mal  ($m) { Write-Host "  FALTA $m" -ForegroundColor Red; $script:fallos++ }
function Nota ($m) { Write-Host "        $m" -ForegroundColor DarkGray }
function Titulo($m){ Write-Host ""; Write-Host $m -ForegroundColor Cyan }

Titulo "1. Git"
$sucio = git status --porcelain
if ($sucio) {
  Mal "hay cambios sin confirmar:"
  $sucio | ForEach-Object { Nota $_ }
  Nota "-> git add -A ; git commit -m '...' ; git push"
} else { Ok "nada sin confirmar" }

git fetch --quiet 2>$null
$adelante = (git rev-list --count '@{u}..HEAD' 2>$null)
if ($adelante -and $adelante -ne '0') {
  Mal "$adelante confirmacion(es) sin empujar  ->  git push"
} else { Ok "el remoto esta al dia" }

Titulo "2. Frontend publicado"
if (-not (Test-Path 'dist\index.html')) {
  Nota "no hay compilacion local; ejecutando npm run build ..."
  npm run build 2>&1 | Out-Null
}
$local = (Select-String -Path 'dist\index.html' -Pattern 'assets/index-[A-Za-z0-9_-]+\.js' -AllMatches |
          ForEach-Object { $_.Matches.Value } | Select-Object -First 1)
try {
  $html = (Invoke-WebRequest -Uri 'https://www.neuromundi.com/' -UseBasicParsing -Headers @{'Cache-Control'='no-cache'}).Content
  $vivo = ([regex]::Match($html, 'assets/index-[A-Za-z0-9_-]+\.js')).Value
} catch { $vivo = '(no se pudo consultar el sitio)' }
Nota "compilado local : $local"
Nota "sirviendo en web: $vivo"
if ($local -and $vivo -and $local -eq $vivo) {
  Ok "el sitio sirve exactamente lo que compila su repositorio"
} else {
  Mal "el sitio NO sirve su codigo actual"
  Nota "-> confirme, empuje, y espere a que termine el despliegue de GitHub Actions"
}

Titulo "3. Funciones de Supabase"
$funciones = @(
  'stripe-webhook',
  'create-membership-checkout',
  'create-consultation-checkout',
  'create-donation-checkout',
  'create-product-checkout',
  'enviar-invitaciones',
  'reclamar-ficha',
  'avisar-renovacion'
)
$lista = supabase functions list 2>$null | Out-String
foreach ($f in $funciones) {
  $archivo = "supabase\functions\$f\index.ts"
  if (-not (Test-Path $archivo)) { Nota "$f : no existe en el repositorio"; continue }
  $mtime = (Get-Item $archivo).LastWriteTime
  $linea  = ($lista -split "`n" | Where-Object { $_ -match [regex]::Escape($f) } | Select-Object -First 1)
  if (-not $linea) { Mal "$f : no aparece desplegada"; continue }
  # La CLI imprime la fecha de actualizacion en la fila de cada funcion.
  $fecha = [regex]::Match($linea, '\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}')
  if ($fecha.Success) {
    $desplegada = [datetime]::Parse($fecha.Value)
    if ($desplegada -ge $mtime) { Ok "$f  (desplegada $($fecha.Value))" }
    else { Mal "$f : el archivo local es mas nuevo que lo desplegado  ->  supabase functions deploy $f" }
  } else {
    Nota "$f : desplegada, no se pudo leer la fecha"
  }
}

Titulo "4. Tipos"
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) { Ok "sin errores de tipos" } else { Mal "hay errores de tipos" }

Write-Host ""
if ($fallos -eq 0) {
  Write-Host "TODO PUBLICADO. No queda nada atras." -ForegroundColor Green
} else {
  Write-Host "QUEDAN $fallos PUNTO(S) POR RESOLVER (ver arriba en rojo)." -ForegroundColor Red
}
Write-Host ""
Write-Host "Recuerde: las migraciones .sql NO se comprueban aqui." -ForegroundColor Yellow
Write-Host "Se aplican a mano en el editor SQL de Supabase; pidale a Claude que verifique" -ForegroundColor Yellow
Write-Host "cuales estan aplicadas, que el si puede consultarlo en la base." -ForegroundColor Yellow
