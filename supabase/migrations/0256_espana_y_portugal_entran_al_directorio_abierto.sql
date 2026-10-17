-- 0256 · España y Portugal entran a la lista de paises con el directorio
-- abierto. (Decision de Enyoria, 17 oct 2026.)
--
-- Que cambia de verdad, medido antes de tocar nada: esa lista la usan SOLO las
-- dos colas de correo de la campana. La cortina que bloquea la plataforma se
-- gobierna con otra bandera, campaign_config.directory_open, que ya estaba
-- encendida, y ficha_visible() no mira el pais en ningun momento. O sea: una
-- organizacion espanola ya podia registrarse, reclamar su ficha y publicarla;
-- lo unico que decia lo contrario era la frase del correo ("el directorio abre
-- en su pais el 18 de enero de 2027"). Esta migracion la vuelve verdadera.
--
-- De paso desaparece una contradiccion que ya existia: el plazo de Miembro
-- Fundador de Espana y Portugal vence el 31 de diciembre de 2026, dieciocho
-- dias ANTES de la apertura que el correo les anunciaba.
--
-- Brasil ya estaba en la lista. El resto de Europa y los demas paises de habla
-- portuguesa quedan fuera a proposito: Enyoria pidio estos dos y nada mas.
-- Verificado despues de aplicar: Espana true, Portugal true, Brasil true,
-- Francia false, Angola false. 57 paises en la lista.

update public.campaign_config
   set paises_directorio_abierto = (
         select array(select distinct unnest(paises_directorio_abierto || array['España','Portugal']) order by 1)
       ),
       updated_at = now()
 where id = 1;
