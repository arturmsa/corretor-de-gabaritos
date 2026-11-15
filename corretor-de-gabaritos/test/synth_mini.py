# Simula fotos de provas com o mini gabarito preenchido.
# Uso: python3 synth_mini.py N SEED [crop|page|mix] [dificil]
import json, random, sys, subprocess, numpy as np, cv2
N=int(sys.argv[1]); random.seed(int(sys.argv[2])); np.random.seed(int(sys.argv[2]))
modo=sys.argv[3] if len(sys.argv)>3 else 'mix'; dificil=len(sys.argv)>4
info=json.load(open('exemplo-prova.json'))
DPI=150; pxmm=DPI/25.4
subprocess.run(['pdftoppm','-r',str(DPI),'-png','exemplo-prova.pdf','pg'],check=True)
pages=[cv2.imread('pg-1.png'),cv2.imread('pg-2.png')]
nq=info['numQ']
def fill(img,X,Y,r,kind):
    color=random.choice([(120,40,20),(40,40,40),(90,60,50)] + ([(150,150,150),(130,130,135)] if dificil else []))
    cx,cy=X*pxmm,Y*pxmm; R=r*pxmm
    if kind=='full': cv2.circle(img,(int(cx),int(cy)),int(R*random.uniform(0.75,1.0)),color,-1,cv2.LINE_AA)
    else:
        for k in range(14):
            a=random.uniform(0,6.28); b=a+random.uniform(2,3.5)
            cv2.line(img,(int(cx+R*.8*np.cos(a)),int(cy+R*.8*np.sin(a))),(int(cx+R*.8*np.cos(b)),int(cy+R*.8*np.sin(b))),color,max(2,int(pxmm*0.8)),cv2.LINE_AA)
for idx in range(N):
    pi=idx%2; P=info['pos'][pi]; L=info['layouts'][P['formato']]; img=pages[pi].copy(); exp={'formato':P['formato']}
    G=L['groups']; ox,oy=P['ox'],P['oy']; R=L['BUBBLE_R']
    def pick(g):
        i=random.randrange(len(G[g])); b=G[g][i]; fill(img,ox+b['x'],oy+b['y'],R,'full'); return b['value']
    for g in ['serie','turma','turno']: exp[g]=pick(g)
    num=random.randint(1,45)
    for g,dg in [('dezena',num//10),('unidade',num%10)]:
        b=G[g][dg]; fill(img,ox+b['x'],oy+b['y'],R,'full'); exp[g]=str(dg)
    for q in range(1,nq+1):
        r=random.random(); g='q%d'%q
        if r<0.05: exp[g]=None; continue
        i=random.randrange(5); b=G[g][i]
        if r<0.10:
            j=(i+random.randrange(1,5))%5; b2=G[g][j]
            fill(img,ox+b['x'],oy+b['y'],R,'full'); fill(img,ox+b2['x'],oy+b2['y'],R,'full'); exp[g]='*'; continue
        fill(img,ox+b['x'],oy+b['y'],R,random.choice(['full','full','full','scribble'])); exp[g]='ABCDE'[i]
    m=modo if modo!='mix' else random.choice(['crop','page'])
    if m=='crop':   # foto de perto: bloco com uma margem de texto da prova em volta
        mg=random.uniform(8,25)
        x0=max(0,int((ox-mg)*pxmm)); y0=max(0,int((oy-mg)*pxmm)); x1=int((ox+P['w']+mg)*pxmm); y1=int((oy+P['h']+mg)*pxmm)
        src=img[y0:y1,x0:x1]; tgt=0.8
    else:
        src=img; tgt=random.uniform(0.75,0.9)
    H0,W0=src.shape[:2]
    W,H=(1600,2133) if random.random()<0.7 else (2133,1600)
    bg=np.full((H,W,3),(60,100,140),np.uint8)
    s=tgt*min(W/W0,H/H0); cx,cy=W/2+random.uniform(-40,40),H/2+random.uniform(-40,40)
    ang=np.radians(random.uniform(-12,12)+(180 if idx%7==3 else 0))
    corners=np.array([[-W0/2,-H0/2],[W0/2,-H0/2],[W0/2,H0/2],[-W0/2,H0/2]])*s
    rot=np.array([[np.cos(ang),-np.sin(ang)],[np.sin(ang),np.cos(ang)]])
    dst=corners@rot.T+[cx,cy]; dst+=np.random.uniform(-0.05,0.05,dst.shape)*min(W0,H0)*s
    M=cv2.getPerspectiveTransform(np.float32([[0,0],[W0,0],[W0,H0],[0,H0]]),np.float32(dst))
    out=cv2.warpPerspective(src,M,(W,H),dst=bg,borderMode=cv2.BORDER_TRANSPARENT)
    light=np.outer(np.linspace(random.uniform(.65,1.05),random.uniform(.8,1.1),H),np.linspace(random.uniform(.65,1.0),random.uniform(.85,1.1),W))[...,None]
    if dificil: light=light*np.where((np.add.outer(np.arange(H),np.arange(W))%1200)<350,0.62,1.0)[...,None]
    out=np.clip(out*light,0,255).astype(np.uint8)
    out=cv2.GaussianBlur(out,(0,0),random.uniform(0.6,2.0 if dificil else 1.4))
    out=np.clip(out+np.random.normal(0,8 if dificil else 5,out.shape),0,255).astype(np.uint8)
    cv2.imwrite('mfoto_%d.jpg'%idx,out,[cv2.IMWRITE_JPEG_QUALITY,80])
    g=cv2.cvtColor(cv2.imread('mfoto_%d.jpg'%idx),cv2.COLOR_BGR2GRAY); g.tofile('mfoto_%d.raw'%idx)
    json.dump({'w':W,'h':H,'exp':exp,'nq':nq,'modo':m},open('mfoto_%d.json'%idx,'w'))
