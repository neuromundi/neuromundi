# -*- coding: utf-8 -*-
"""
Genera los PDF descargables de los kits nuevos (Neurodesarrollo y Afecciones)
en los 11 idiomas, a partir de scripts/kit_content.json (volcado por
dump_kit_content.mjs). Cada bloque `resource` produce un PDF que renderiza el
MÓDULO que lo contiene como una guía imprimible (portada + secciones).

Tipografía:
  · latín (es,en,pt,fr,it,de): DejaVu Sans.
  · ar/he: DejaVu Sans + reshaping/bidi (RTL, alineado a la derecha).
  · ja: HeiseiKakuGo-W5 · zh: STSong-Light · ko: HYGothic-Medium (CID de reportlab).

Uso:  python3 scripts/gen_new_kit_pdfs.py
"""
import json, os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
import arabic_reshaper
from bidi.algorithm import get_display

DJ = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Body", f"{DJ}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Bold", f"{DJ}/DejaVuSans-Bold.ttf"))
for cid in ("HeiseiKakuGo-W5", "STSong-Light", "HYGothic-Medium"):
    pdfmetrics.registerFont(UnicodeCIDFont(cid))

# Fuente (body, bold) y sentido por idioma.
FONTS = {
    'es': ("Body", "Bold", False), 'en': ("Body", "Bold", False), 'pt': ("Body", "Bold", False),
    'fr': ("Body", "Bold", False), 'it': ("Body", "Bold", False), 'de': ("Body", "Bold", False),
    'ar': ("Body", "Bold", True),  'he': ("Body", "Bold", True),
    'ja': ("HeiseiKakuGo-W5", "HeiseiKakuGo-W5", False),
    'zh': ("STSong-Light", "STSong-Light", False),
    'ko': ("HYGothic-Medium", "HYGothic-Medium", False),
}
TAG = {  # lema por idioma para el encabezado
    'es': 'Encuentra. Conecta. Crece.', 'en': 'Find. Connect. Grow.',
    'pt': 'Encontre. Conecte. Cresça.', 'fr': 'Trouvez. Connectez. Grandissez.',
    'it': 'Trova. Connetti. Cresci.', 'de': 'Finden. Verbinden. Wachsen.',
    'ar': 'اعثر. تواصل. انمُ.', 'he': 'מצא. התחבר. גדל.',
    'ja': '見つける。つながる。育つ。', 'zh': '发现。连接。成长。', 'ko': '찾다. 연결하다. 성장하다.',
}
NOTE = {  # pie: material de apoyo, no diagnóstico
    'es': 'Neuromundi · Material de apoyo, no diagnóstico. Ante la duda, consulta a un profesional.',
    'en': 'Neuromundi · Supportive material, not a diagnosis. When in doubt, consult a professional.',
    'pt': 'Neuromundi · Material de apoio, não diagnóstico. Na dúvida, consulte um profissional.',
    'fr': 'Neuromundi · Matériel de soutien, non un diagnostic. En cas de doute, consultez un professionnel.',
    'it': 'Neuromundi · Materiale di supporto, non una diagnosi. Nel dubbio, consulta un professionista.',
    'de': 'Neuromundi · Unterstützungsmaterial, keine Diagnose. Im Zweifel eine Fachperson fragen.',
    'ar': 'Neuromundi · مادة داعمة، لا تشخيص. عند الشك، استشر أخصائيًا.',
    'he': 'Neuromundi · חומר תומך, לא אבחון. במקרה של ספק, התייעץ עם מומחה.',
    'ja': 'Neuromundi · 支援用の資料であり診断ではありません。迷ったら専門家に相談を。',
    'zh': 'Neuromundi · 支持性材料，非诊断。如有疑问，请咨询专业人士。',
    'ko': 'Neuromundi · 지원 자료이며 진단이 아닙니다. 의심되면 전문가와 상담하세요.',
}
MODCOLOR = {'A': (0.16, 0.55, 0.60), 'B': (0.20, 0.55, 0.35), 'C': (0.35, 0.30, 0.62),
            'D': (0.72, 0.30, 0.45), 'E': (0.70, 0.52, 0.12)}
TONES = {'calm': ((0.93, 0.96, 1.0), (0.20, 0.40, 0.72)),
         'care': ((0.98, 0.93, 0.97), (0.62, 0.24, 0.55)),
         'tip':  ((1.0, 0.97, 0.90), (0.72, 0.52, 0.10))}
INK = (0.13, 0.15, 0.20); MUT = (0.42, 0.45, 0.52); LINE = (0.85, 0.87, 0.91)
BRAND = (0.30, 0.20, 0.55)

W, H = letter
ML, MR, MT, MB = 54, 54, 64, 52
RIGHT, LEFT = W - MR, ML
CW = RIGHT - LEFT


def shape(t, lang):
    t = str(t)
    if lang == 'ar':
        t = arabic_reshaper.reshape(t)
    if lang in ('ar', 'he'):
        try:
            return get_display(t, base_dir='R')
        except TypeError:
            return get_display(t)
    return t


def wrap(text, font, size, maxw, lang):
    # Para CJK se corta por carácter; para el resto por palabra.
    if lang in ('ja', 'zh', 'ko'):
        lines, cur = [], ""
        for ch in str(text):
            if pdfmetrics.stringWidth(cur + ch, font, size) <= maxw or not cur:
                cur += ch
            else:
                lines.append(cur); cur = ch
        if cur:
            lines.append(cur)
        return lines
    words = str(text).split(' ')
    lines, cur = [], ""
    for wd in words:
        cand = (cur + " " + wd).strip()
        if pdfmetrics.stringWidth(shape(cand, lang), font, size) <= maxw or not cur:
            cur = cand
        else:
            lines.append(cur); cur = wd
    if cur:
        lines.append(cur)
    return lines


class Doc:
    def __init__(s, path, lang, mod):
        s.c = canvas.Canvas(path, pagesize=letter)
        s.lang = lang; s.mod = mod
        s.body, s.bold, s.rtl = FONTS[lang]
        s.y = 0
        s.header()

    def header(s):
        c = s.c
        c.setFillColorRGB(*BRAND); c.setFont(s.bold, 16)
        s._t(c, "Neuromundi", H - 42, s.bold, 16, BRAND)
        c.setFont(s.body, 8.5)
        s._t(c, TAG[s.lang], H - 54, s.body, 8.5, MUT)
        c.setStrokeColorRGB(*MODCOLOR.get(s.mod, BRAND)); c.setLineWidth(2.4)
        if s.rtl:
            c.line(RIGHT, H - 60, RIGHT - 70, H - 60)
        else:
            c.line(LEFT, H - 60, LEFT + 70, H - 60)
        s.y = H - MT - 20

    def footer(s):
        c = s.c
        c.setStrokeColorRGB(*LINE); c.setLineWidth(0.6); c.line(LEFT, MB + 14, RIGHT, MB + 14)
        c.setFont(s.body, 7.5)
        s._t(c, NOTE[s.lang], MB + 3, s.body, 7.5, MUT)

    def _t(s, c, text, y, font, size, color, indent=0):
        c.setFillColorRGB(*color); c.setFont(font, size)
        if s.rtl:
            c.drawRightString(RIGHT - indent, y, shape(text, s.lang))
        else:
            c.drawString(LEFT + indent, y, shape(text, s.lang))

    def need(s, h):
        if s.y - h < MB + 26:
            s.footer(); s.c.showPage(); s.header()

    def para(s, text, font=None, size=10.5, color=INK, gap=4, indent=0, lead=13):
        font = font or s.body
        for ln in wrap(text, font, size, CW - indent, s.lang):
            s.need(lead)
            s._t(s.c, ln, s.y, font, size, color, indent)
            s.y -= lead
        s.y -= gap

    def bullet(s, text, marker='•', size=10.5, lead=13):
        first = True
        for ln in wrap(text, s.body, size, CW - 16, s.lang):
            s.need(lead)
            if first:
                s._t(s.c, marker, s.y, s.body, size, MODCOLOR.get(s.mod, INK))
                first = False
            s._t(s.c, ln, s.y, s.body, size, INK, indent=16)
            s.y -= lead
        s.y -= 2

    def callout(s, tone, title, text):
        bg, fg = TONES.get(tone, TONES['calm'])
        lines = []
        if title:
            lines += wrap(title, s.bold, 10, CW - 20, s.lang)
        lines += wrap(text, s.body, 10, CW - 20, s.lang)
        boxh = 12 + len(lines) * 13 + 8
        s.need(boxh + 6)
        s.c.setFillColorRGB(*bg); s.c.roundRect(LEFT, s.y - boxh + 8, CW, boxh, 7, stroke=0, fill=1)
        yy = s.y - 6
        if title:
            for ln in wrap(title, s.bold, 10, CW - 20, s.lang):
                s._t(s.c, ln, yy, s.bold, 10, fg, indent=10); yy -= 13
        for ln in wrap(text, s.body, 10, CW - 20, s.lang):
            s._t(s.c, ln, yy, s.body, 10, INK, indent=10); yy -= 13
        s.y = s.y - boxh - 4

    def table(s, columns, rows):
        # Render sencillo: encabezado en negrita + filas, separadores suaves.
        s.para(" · ".join(columns), font=s.bold, size=9.5, color=MUT, gap=2)
        for r in rows:
            s.need(14)
            s.para(" — ".join(r), size=9.5, color=INK, gap=1, lead=12)
        s.y -= 3


def render(path, lang, module, res):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    d = Doc(path, lang, module['id'])
    # Portada del recurso
    d.para(res.get('label', module['title']), font=d.bold, size=16, color=INK, gap=3, lead=19)
    if res.get('description'):
        d.para(res['description'], size=10, color=MUT, gap=6)
    d.para(module['title'], font=d.bold, size=12, color=MODCOLOR.get(module['id'], INK), gap=1, lead=15)
    d.para(module.get('summary', ''), size=10, color=MUT, gap=8)
    for sec in module['sections']:
        d.need(20)
        d.para(sec['title'], font=d.bold, size=12, color=INK, gap=4, lead=15)
        for b in sec['blocks']:
            k = b.get('kind')
            if k == 'lead':
                d.para(b['text'], size=11, color=INK, gap=5)
            elif k == 'p':
                d.para(b['text'], size=10.5, color=INK, gap=5)
            elif k == 'list':
                mark = '✓' if b.get('variant') == 'check' else '•'
                for it in b['items']:
                    d.bullet(it, marker=mark)
                d.y -= 3
            elif k == 'steps':
                for i, it in enumerate(b['items'], 1):
                    d.bullet(it, marker=f"{i}.")
                d.y -= 3
            elif k == 'callout':
                d.callout(b.get('tone', 'calm'), b.get('title', ''), b['text'])
            elif k == 'glossary':
                for it in b['items']:
                    d.para(it['term'], font=d.bold, size=10, color=INK, gap=0, lead=13)
                    d.para(it['plain'], size=10, color=MUT, gap=4, indent=10)
            elif k == 'table':
                d.table(b['columns'], b['rows'])
            # 'resource' se omite: es el propio archivo.
        d.y -= 4
    d.footer(); d.c.save()


def main():
    data = json.load(open('scripts/kit_content.json', encoding='utf-8'))
    made = 0
    for key, modules in data.items():
        kit, lang = key.split('.')
        for m in modules:
            for sec in m['sections']:
                for b in sec['blocks']:
                    if b.get('kind') == 'resource':
                        out = 'public' + b['file']  # /kit/nd/es/...
                        render(out, lang, m, b)
                        made += 1
    print('PDFs generados:', made)


if __name__ == '__main__':
    main()
