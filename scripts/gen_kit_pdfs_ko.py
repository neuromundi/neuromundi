import json, re
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

pdfmetrics.registerFont(UnicodeCIDFont("HYGothic-Medium"))


W,H=letter
ML,MR,MT,MB=54,54,64,58
LEFT=ML; RIGHTX=W-MR; CW=RIGHTX-LEFT
INK=(0.13,0.15,0.20); MUT=(0.42,0.45,0.52); LINE=(0.85,0.87,0.91)
BRAND=(0.30,0.20,0.55)
TONES={'calm':((0.93,0.96,1.0),(0.20,0.40,0.72)),'care':((0.98,0.93,0.97),(0.62,0.24,0.55)),'tip':((1.0,0.97,0.90),(0.72,0.52,0.10))}
MODCOLOR={'A':(0.16,0.55,0.60),'B':(0.20,0.55,0.35),'C':(0.35,0.30,0.62),'D':(0.72,0.30,0.45),'E':(0.70,0.52,0.12)}

def wrap(text, font, size, maxw):
    # CJK: wrap by characters if no spaces; else by words
    text=str(text)
    lines=[]; cur=""
    tokens=re.findall(r'\s+|\S', text)  # char-level, keeps spaces
    for tk in tokens:
        cand=cur+tk
        if pdfmetrics.stringWidth(cand,font,size)<=maxw or not cur.strip():
            cur=cand
        else:
            lines.append(cur.rstrip()); cur=tk if tk.strip() else ""
    if cur.strip() or (cur and not lines): lines.append(cur.rstrip())
    return lines or [""]

class Doc:
    def __init__(s,path,mod):
        s.c=canvas.Canvas(path,pagesize=letter); s.mod=mod; s.y=0
        s.header()
    def header(s):
        c=s.c; c.setFillColorRGB(*BRAND); c.setFont("Helvetica-Bold",17)
        c.drawString(LEFT,H-42,"Neuromundi")
        c.setFillColorRGB(*MUT); c.setFont("HYGothic-Medium",8.5)
        c.drawString(LEFT,H-54,"찾고. 연결하고. 성장하세요.")
        c.setStrokeColorRGB(*MODCOLOR[s.mod]); c.setLineWidth(2.4); c.line(RIGHTX-70,H-60,RIGHTX,H-60)
        s.y=H-MT-24
    def footer(s):
        c=s.c; c.setStrokeColorRGB(*LINE); c.setLineWidth(0.6); c.line(LEFT,MB+14,RIGHTX,MB+14)
        c.setFillColorRGB(*MUT); c.setFont("HYGothic-Medium",7.5)
        c.drawString(LEFT,MB+3,"지원 자료이며 진단이 아닙니다. 의심스러우면 전문가와 상담하세요.")
        c.setFont("Helvetica",7.5); c.drawRightString(RIGHTX,MB+3,"neuromundi.com")
    def need(s,h):
        if s.y-h<MB+26: s.footer(); s.c.showPage(); s.header()
    def para(s,text,size=10.2,font="HYGothic-Medium",color=INK,indent=0,lead_factor=1.5,mark=None,markcolor=None):
        maxw=CW-indent-(16 if mark else 0)
        lines=wrap(text,font,size,maxw); lh=size*lead_factor
        for i,ln in enumerate(lines):
            s.need(lh); s.c.setFillColorRGB(*color); s.c.setFont(font,size)
            x0=LEFT+indent+(16 if mark else 0)
            s.c.drawString(x0,s.y,ln)
            if i==0 and mark:
                s.c.setFillColorRGB(*(markcolor or MODCOLOR[s.mod])); s.c.setFont("Helvetica-Bold",size)
                s.c.drawString(LEFT+indent,s.y,mark)
            s.y-=lh
    def h1(s,text):
        s.need(30); s.c.setFillColorRGB(*MODCOLOR[s.mod]); s.c.setFont("HYGothic-Medium",15)
        for ln in wrap(text,"HYGothic-Medium",15,CW): s.need(20); s.c.drawString(LEFT,s.y,ln); s.y-=20
        s.y-=4
    def h2(s,text):
        s.y-=6; s.need(20); s.c.setFillColorRGB(*INK); s.c.setFont("HYGothic-Medium",11.5)
        for ln in wrap(text,"HYGothic-Medium",11.5,CW): s.need(16); s.c.drawString(LEFT,s.y,ln); s.y-=16
        s.y-=2
    def callout(s,tone,title,text):
        bg,ac=TONES.get(tone,TONES['calm'])
        lines=wrap(text,"HYGothic-Medium",9.8,CW-26); tl=wrap(title,"HYGothic-Medium",10,CW-26) if title else []
        boxh=10+len(tl)*15+len(lines)*14+10
        s.need(boxh+8); s.y-=4; top=s.y+4
        s.c.setFillColorRGB(*bg); s.c.roundRect(LEFT,top-boxh,CW,boxh,7,fill=1,stroke=0)
        s.c.setFillColorRGB(*ac); s.c.rect(LEFT,top-boxh,3,boxh,fill=1,stroke=0)
        yy=top-16
        for ln in tl: s.c.setFillColorRGB(*ac); s.c.setFont("HYGothic-Medium",10); s.c.drawString(LEFT+12,yy,ln); yy-=15
        for ln in lines: s.c.setFillColorRGB(*INK); s.c.setFont("HYGothic-Medium",9.8); s.c.drawString(LEFT+12,yy,ln); yy-=14
        s.y=top-boxh-8
    def glossary(s,items):
        for it in items:
            s.y-=3; s.para(it["term"],size=10.5,font="HYGothic-Medium",color=MODCOLOR[s.mod]); s.para(it["plain"],size=9.8,color=(0.30,0.33,0.40))
    def table(s,cols,rows,caption=None):
        n=len(cols); widths=[CW/n]*n; pad=6
        def cl(txt,w,font,size): return wrap(txt,font,size,w-2*pad)
        def rh(cells,font,size): return max(len(cl(c,widths[i],font,size)) for i,c in enumerate(cells))*(size*1.35)+8
        def draw(cells,font,size,fill=None,tcolor=INK):
            h=rh(cells,font,size); s.need(h); top=s.y+2; x=LEFT
            if fill: s.c.setFillColorRGB(*fill); s.c.rect(LEFT,top-h,CW,h,fill=1,stroke=0)
            s.c.setStrokeColorRGB(*LINE); s.c.setLineWidth(0.5)
            for i,cell in enumerate(cells):
                w=widths[i]; s.c.setFillColorRGB(*tcolor); s.c.setFont(font,size); yy=top-size-3
                for ln in cl(cell,w,font,size): s.c.drawString(x+pad,yy,ln); yy-=size*1.35
                s.c.line(x,top-h,x,top); x+=w
            s.c.line(LEFT,top-h,RIGHTX,top-h); s.c.line(LEFT,top,RIGHTX,top); s.c.line(RIGHTX,top-h,RIGHTX,top)
            s.y=top-h
        draw(cols,"HYGothic-Medium",9,fill=(0.94,0.95,0.97),tcolor=MODCOLOR[s.mod])
        for r in rows: draw(r,"HYGothic-Medium",8.8)
        s.y-=8
        if caption: s.y-=2; s.para(caption,size=8.5,color=MUT)
    def block(s,b):
        k=b["kind"]
        if k=="lead": s.para(b["text"],size=11,color=(0.22,0.25,0.32)); s.y-=3
        elif k=="p": s.para(b["text"],size=10.2); s.y-=4
        elif k=="list":
            chk=b.get("variant")=="check"
            for it in b["items"]: s.para(it,size=10,mark=("✓" if chk else "•")); s.y-=2
            s.y-=3
        elif k=="steps":
            for i,it in enumerate(b["items"],1): s.para(it,size=10,mark=f"{i}."); s.y-=2
            s.y-=3
        elif k=="callout": s.callout(b["tone"],b.get("title"),b["text"])
        elif k=="glossary": s.glossary(b["items"])
        elif k=="table": s.table(b["columns"],b["rows"],b.get("caption"))
    def render(s,title,summary,sections):
        s.h1(title)
        if summary: s.para(summary,size=10.5,color=MUT); s.y-=6
        for sec in sections:
            s.h2(sec["title"])
            for b in sec["blocks"]:
                if b["kind"]!="resource": s.block(b)
        s.footer(); s.c.save()

def load():
    raw=open("src/data/toolkitContent/content.ko.ts",encoding="utf-8").read()
    st=raw.index("= [")+2; return json.loads(raw[st:raw.rindex("]")+1])
MAP={"glosario":[("A","glosario")],"matriz-especialidades":[("A","matriz")],"bitacora-abc":[("A","bitacora-abc")],
 "carta-escuela-familia":[("B","carta")],"adecuaciones-acceso":[("B","adecuaciones")],
 "perfil-sensorial":[("C","necesidades"),("C","entorno")],"contencion-cuidadores":[("D","contencion")],
 "explicar-hermanos":[("D","hermanos")],"tramites-apoyos":[("E","derechos"),("E","tramites")]}
mods={m["id"]:m for m in load()}
for fname,secs in MAP.items():
    mid=secs[0][0]
    label=None
    for m in mods.values():
        for sec in m["sections"]:
            for b in sec["blocks"]:
                if b["kind"]=="resource" and b["file"].endswith(f"/{fname}.pdf"): label=b["label"]
    chosen=[s for (mm,sid) in secs for s in mods[mm]["sections"] if s["id"]==sid]
    Doc(f"public/kit/ko/{fname}.pdf",mid).render(label or mods[mid]["title"], mods[mid]["summary"], chosen)
    print("wrote ko",fname)
print("DONE")
