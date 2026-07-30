import json, os, re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display

DJ="/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("Body", f"{DJ}/DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("Bold", f"{DJ}/DejaVuSans-Bold.ttf"))

W,H=letter                      # 612 x 792
ML,MR,MT,MB=54,54,64,58
RIGHT=W-MR                      # right text edge (RTL start)
LEFT=ML
CW=RIGHT-LEFT                   # content width
# palette
INK=(0.13,0.15,0.20); MUT=(0.42,0.45,0.52); LINE=(0.85,0.87,0.91)
BRAND=(0.30,0.20,0.55)          # violet
TONES={
 'calm':((0.93,0.96,1.0),(0.20,0.40,0.72)),
 'care':((0.98,0.93,0.97),(0.62,0.24,0.55)),
 'tip' :((1.0,0.97,0.90),(0.72,0.52,0.10)),
}
MODCOLOR={'A':(0.16,0.55,0.60),'B':(0.20,0.55,0.35),'C':(0.35,0.30,0.62),'D':(0.72,0.30,0.45),'E':(0.70,0.52,0.12)}

def shape(t, lang):
    t=str(t)
    if lang=='ar':
        t=arabic_reshaper.reshape(t)
    try: return get_display(t, base_dir='R')
    except TypeError: return get_display(t)

def wrap(text, font, size, maxw, lang):
    words=str(text).split(' ')
    lines=[]; cur=""
    for wd in words:
        cand=(cur+" "+wd).strip()
        if pdfmetrics.stringWidth(shape(cand,lang),font,size)<=maxw or not cur:
            cur=cand
        else:
            lines.append(cur); cur=wd
    if cur: lines.append(cur)
    return lines

class Doc:
    def __init__(s,path,lang,mod):
        s.c=canvas.Canvas(path,pagesize=letter); s.lang=lang; s.mod=mod; s.y=0; s.first=True
        s.header()
    def header(s):
        c=s.c
        c.setFillColorRGB(*BRAND); c.setFont("Bold",17)
        c.drawRightString(RIGHT,H-42,shape("Neuromundi",s.lang))
        c.setFillColorRGB(*MUT); c.setFont("Body",8.5)
        tag={"he":"מצא. התחבר. גדל.","ar":"اعثر. تواصل. انمُ."}[s.lang]
        c.drawRightString(RIGHT,H-54,shape(tag,s.lang))
        c.setStrokeColorRGB(*MODCOLOR[s.mod]); c.setLineWidth(2.4)
        c.line(LEFT,H-60,LEFT+70,H-60)
        s.y=H-MT-24
    def footer(s):
        c=s.c; c.setStrokeColorRGB(*LINE); c.setLineWidth(0.6); c.line(LEFT,MB+14,RIGHT,MB+14)
        c.setFillColorRGB(*MUT); c.setFont("Body",7.5)
        note={"he":"Neuromundi · חומר תומך, לא אבחון. במקרה של ספק, התייעץ עם מומחה.","ar":"Neuromundi · مادة داعمة، لا تشخيص. عند الشك، استشر أخصائيًا."}[s.lang]
        c.drawRightString(RIGHT,MB+3,shape(note,s.lang))
        c.drawString(LEFT,MB+3,"neuromundi.com")
    def need(s,h):
        if s.y-h<MB+26:
            s.footer(); s.c.showPage(); s.header()
    def gap(s,g): s.y-=g
    def para(s,text,size=10.2,font="Body",color=INK,indent=0,lead_factor=1.42,mark=None,markcolor=None):
        maxw=CW-indent-(16 if mark else 0)
        lines=wrap(text,font,size,maxw,s.lang)
        lh=size*lead_factor
        for i,ln in enumerate(lines):
            s.need(lh)
            s.c.setFillColorRGB(*color); s.c.setFont(font,size)
            xr=RIGHT-indent-(16 if mark else 0)
            s.c.drawRightString(xr,s.y,shape(ln,s.lang))
            if i==0 and mark:
                s.c.setFillColorRGB(*(markcolor or MODCOLOR[s.mod])); s.c.setFont("Bold",size)
                s.c.drawRightString(RIGHT-indent,s.y,shape(mark,s.lang))
            s.y-=lh
    def h1(s,text):
        s.need(30)
        s.c.setFillColorRGB(*MODCOLOR[s.mod]); s.c.setFont("Bold",15)
        for ln in wrap(text,"Bold",15,CW,s.lang):
            s.need(20); s.c.drawRightString(RIGHT,s.y,shape(ln,s.lang)); s.y-=19
        s.gap(4)
    def h2(s,text):
        s.gap(6); s.need(20)
        s.c.setFillColorRGB(*INK); s.c.setFont("Bold",11.5)
        for ln in wrap(text,"Bold",11.5,CW,s.lang):
            s.need(16); s.c.drawRightString(RIGHT,s.y,shape(ln,s.lang)); s.y-=15
        s.gap(2)
    def callout(s,tone,title,text):
        bg,ac=TONES.get(tone,TONES['calm'])
        lines=wrap(text,"Body",9.8,CW-26,s.lang)
        tl=wrap(title,"Bold",10,CW-26,s.lang) if title else []
        boxh=10+len(tl)*14+len(lines)*13+10
        s.need(boxh+8); s.gap(4)
        top=s.y+4; s.c.setFillColorRGB(*bg); s.c.roundRect(LEFT,top-boxh,CW,boxh,7,fill=1,stroke=0)
        s.c.setFillColorRGB(*ac); s.c.rect(RIGHT-3,top-boxh,3,boxh,fill=1,stroke=0)
        yy=top-16
        for ln in tl:
            s.c.setFillColorRGB(*ac); s.c.setFont("Bold",10); s.c.drawRightString(RIGHT-12,yy,shape(ln,s.lang)); yy-=14
        for ln in lines:
            s.c.setFillColorRGB(*INK); s.c.setFont("Body",9.8); s.c.drawRightString(RIGHT-12,yy,shape(ln,s.lang)); yy-=13
        s.y=top-boxh-8
    def glossary(s,items):
        for it in items:
            s.gap(3)
            s.para(it["term"],size=10.5,font="Bold",color=MODCOLOR[s.mod])
            s.para(it["plain"],size=9.8,color=(0.30,0.33,0.40))
    def table(s,cols,rows,caption=None):
        n=len(cols); gap=6
        # equal-ish columns; first col a bit wider
        base=CW/n
        widths=[base]*n
        pad=6
        def cell_lines(txt,w,font,size): return wrap(txt,font,size,w-2*pad,s.lang)
        def row_h(cells,font,size):
            return max(len(cell_lines(c,widths[i],font,size)) for i,c in enumerate(cells))*(size*1.3)+8
        # header
        hh=row_h(cols,"Bold",9)
        s.need(hh+4); s.gap(2)
        def draw_row(cells,font,size,fill=None,tcolor=INK):
            nonlocal_h=row_h(cells,font,size)
            s.need(nonlocal_h)
            top=s.y+2
            x=RIGHT
            if fill:
                s.c.setFillColorRGB(*fill); s.c.rect(LEFT,top-nonlocal_h,CW,nonlocal_h,fill=1,stroke=0)
            s.c.setStrokeColorRGB(*LINE); s.c.setLineWidth(0.5)
            for i,cell in enumerate(cells):
                w=widths[i]; x0=x-w
                s.c.setFillColorRGB(*tcolor); s.c.setFont(font,size)
                yy=top-size-3
                for ln in cell_lines(cell,w,font,size):
                    s.c.drawRightString(x-pad,yy,shape(ln,s.lang)); yy-=size*1.3
                s.c.line(x0,top-nonlocal_h,x0,top)  # left border of cell
                x=x0
            s.c.line(LEFT,top-nonlocal_h,RIGHT,top-nonlocal_h)
            s.c.line(LEFT,top,RIGHT,top)
            s.y=top-nonlocal_h
        draw_row(cols,"Bold",9,fill=(0.94,0.95,0.97),tcolor=MODCOLOR[s.mod])
        for r in rows: draw_row(r,"Body",8.8)
        if caption:
            s.gap(2); s.para(caption,size=8.5,color=MUT)
    def block(s,b):
        k=b["kind"]
        if k=="lead": s.para(b["text"],size=11,color=(0.22,0.25,0.32),lead_factor=1.5); s.gap(3)
        elif k=="p": s.para(b["text"],size=10.2); s.gap(4)
        elif k=="list":
            chk = b.get("variant")=="check"
            for it in b["items"]:
                s.para(it,size=10,mark=("✓" if chk else "•"),markcolor=MODCOLOR[s.mod]); s.gap(2)
            s.gap(3)
        elif k=="steps":
            for i,it in enumerate(b["items"],1):
                s.para(it,size=10,mark=f"{i}.",markcolor=MODCOLOR[s.mod]); s.gap(2)
            s.gap(3)
        elif k=="callout": s.callout(b["tone"],b.get("title"),b["text"])
        elif k=="glossary": s.glossary(b["items"])
        elif k=="table": s.table(b["columns"],b["rows"],b.get("caption"))
        # resource blocks skipped (self-reference)
    def section(s,sec):
        s.h2(sec["title"])
        for b in sec["blocks"]:
            if b["kind"]!="resource": s.block(b)
    def render(s,title,summary,sections):
        s.h1(title)
        if summary: s.para(summary,size=10.5,color=MUT); s.gap(6)
        for sec in sections: s.section(sec)
        s.footer(); s.c.save()

def load(lang):
    raw=open(f"src/data/toolkitContent/content.{lang}.ts",encoding="utf-8").read()
    st=raw.index("= [")+2
    j=raw[st:raw.rindex("]")+1]
    return json.loads(j)

# PDF -> list of (moduleId, sectionId)
MAP={
 "glosario":[("A","glosario")],
 "matriz-especialidades":[("A","matriz")],
 "bitacora-abc":[("A","bitacora-abc")],
 "carta-escuela-familia":[("B","carta")],
 "adecuaciones-acceso":[("B","adecuaciones")],
 "perfil-sensorial":[("C","necesidades"),("C","entorno")],
 "contencion-cuidadores":[("D","contencion")],
 "explicar-hermanos":[("D","hermanos")],
 "tramites-apoyos":[("E","derechos"),("E","tramites")],
}
# nice document titles per pdf (from resource labels)
for lang in ("he","ar"):
    mods={m["id"]:m for m in load(lang)}
    for fname,secs in MAP.items():
        mid=secs[0][0]; mod=mods[mid]
        # title = the module title for single-section clinical? use resource label if exists else section title
        # find resource label matching this fname within module
        label=None
        for m in mods.values():
            for sec in m["sections"]:
                for b in sec["blocks"]:
                    if b["kind"]=="resource" and b["file"].endswith(f"/{fname}.pdf"):
                        label=b["label"]
        chosen=[s for (mm,sid) in secs for s in mods[mm]["sections"] if s["id"]==sid]
        d=Doc(f"public/kit/{lang}/{fname}.pdf",lang,mid)
        d.render(label or mod["title"], mod["summary"], chosen)
        print("wrote",lang,fname)
print("DONE")
