"""Genera el distintivo 'Neuromundi Global Member' desde el SVG oficial.
El SVG compone 3 imágenes de respaldo con máscaras de luminancia que cairosvg
no aplica; horneamos el alpha en cada imagen y quitamos solo esas 3 máscaras,
conservando la máscara vectorial del texto. Salida: PNG (transparente) 1080/512/256
+ WebP 1080. Uso: python3 scripts/gen_global_member_badge.py <ruta_svg>"""
import re, base64, io, sys, os
from PIL import Image
import cairosvg
SVG=sys.argv[1] if len(sys.argv)>1 else 'Global Member (1).svg'
svg=open(SVG,encoding='utf-8').read()
uris=re.findall(r'data:image/(?:png|jpeg);base64,[A-Za-z0-9+/=]+', svg)
def load(i): return Image.open(io.BytesIO(base64.b64decode(uris[i].split(',',1)[1])))
def datauri(im):
    b=io.BytesIO(); im.save(b,'PNG'); return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
for col,msk in {4:0,5:1,6:2}.items():
    c=load(col).convert('RGB'); a=load(msk).convert('L').resize(c.size)
    r=c.convert('RGBA'); r.putalpha(a); svg=svg.replace(uris[col], datauri(r))
for mid in ('fdeca1e9dc','b3d2ffa39c','2e657ce5ce'):
    svg=svg.replace(f'mask="url(#{mid})"','')
svg=re.sub(r'\sfilter="url\([^)]*\)"','',svg)
cairosvg.svg2png(bytestring=svg.encode(), write_to='/tmp/_badge_hi.png', output_width=2160, output_height=2160)  # transparente
hi=Image.open('/tmp/_badge_hi.png').convert('RGBA')
os.makedirs('public/badge',exist_ok=True)
for s in (1080,512,256):
    hi.resize((s,s),Image.LANCZOS).save(f'public/badge/neuromundi-global-member-{s}.png','PNG',optimize=True)
hi.resize((1080,1080),Image.LANCZOS).save('public/badge/neuromundi-global-member-1080.webp','WEBP',quality=92,method=6)
print('badge assets generated')
