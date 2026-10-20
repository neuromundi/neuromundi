import concurrent.futures as cf, time, json, urllib.request, urllib.error, statistics, sys

K='sb_publishable_KLvFtNYPXOMJ-83vD0rs0g_oHa7WhRs'
BASE='https://sboagswcehuxwfjdbhdn.supabase.co/rest/v1'

def pedir(ruta):
    req=urllib.request.Request(BASE+ruta, headers={'apikey':K,'Accept':'application/json'})
    t0=time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            n=len(r.read())
            return (time.perf_counter()-t0, r.status, n)
    except urllib.error.HTTPError as e:
        return (time.perf_counter()-t0, e.code, 0)
    except Exception as e:
        return (time.perf_counter()-t0, 'error:'+type(e).__name__, 0)

# Lo que hace UN visitante al abrir /directorio, en el mismo orden que la app.
def visitante(_):
    pasos=[]
    pasos.append(('directorio', pedir('/directorio_publico_seguro?select=*&limit=1000')))
    pasos.append(('categorias_catalogo', pedir('/categories?select=*')))
    pasos.append(('rpc_fundadores', pedir('/rpc/founder_provider_ids')))
    return pasos

def correr(n_visitantes):
    t0=time.perf_counter()
    with cf.ThreadPoolExecutor(max_workers=n_visitantes) as ex:
        res=list(ex.map(visitante, range(n_visitantes)))
    total=time.perf_counter()-t0
    por_paso={}
    fallos=[]
    for pasos in res:
        for nombre,(dur,cod,by) in pasos:
            por_paso.setdefault(nombre,[]).append(dur)
            if cod!=200: fallos.append((nombre,cod))
    print(f'\n=== {n_visitantes} visitantes simultaneos — {total:.1f}s en total ===')
    for nombre,durs in por_paso.items():
        durs=sorted(durs)
        p95=durs[max(0,int(len(durs)*0.95)-1)]
        print(f'  {nombre:22} mediana {statistics.median(durs):5.2f}s   p95 {p95:5.2f}s   peor {durs[-1]:5.2f}s')
    print(f'  peticiones: {sum(len(v) for v in por_paso.values())}   fallidas: {len(fallos)}')
    if fallos:
        from collections import Counter
        for k,v in Counter(fallos).items(): print('   FALLO', k, 'x', v)
    return len(fallos)

if __name__=='__main__':
    for n in (1,10,25,50):
        correr(n)
        time.sleep(3)
