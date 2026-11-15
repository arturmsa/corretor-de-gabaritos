import json, subprocess, numpy as np, cv2
L=json.loads(subprocess.check_output(['node','-e',"process.stdout.write(JSON.stringify(require('../www/js/mini.js').layout('mini-c',10)))"]))
s=300/25.4; m=2
for nome,resp in [('c1','ABADEABEDE'),('c2','ABCDEABCDE')]:
    img=cv2.imread('dl_compacto.png')
    for q in range(1,11):
        for b in L['groups']['q%d'%q]:
            if b['value']==resp[q-1]: cv2.circle(img,(int((b['x']+m)*s),int((b['y']+m)*s)),int(1.6*s),(110,40,25),-1,cv2.LINE_AA)
    page=cv2.resize(cv2.imread('pg-3.png'),(2480,3508)); y0,x0=600,1500
    page[y0:y0+img.shape[0],x0:x0+img.shape[1]]=img
    crop=page[y0-250:y0+img.shape[0]+300, x0-500:x0+img.shape[1]+150]
    H0,W0=crop.shape[:2]; W,H=1600,2133; sc=0.85*min(W/W0,H/H0)
    base=np.array([[0,0],[W0,0],[W0,H0],[0,H0]],dtype=np.float32)
    dst=(base*sc+np.array([(W-W0*sc)/2,(H-H0*sc)/2],dtype=np.float32)+np.array([[20,-10],[-25,15],[10,30],[-15,-10]],dtype=np.float32)).astype(np.float32)
    out=cv2.warpPerspective(crop,cv2.getPerspectiveTransform(base,dst),(W,H),borderValue=(70,110,150))
    out=np.clip(out*np.outer(np.linspace(0.8,1,H),np.linspace(0.85,1,W))[...,None]+np.random.normal(0,5,out.shape),0,255).astype(np.uint8)
    cv2.imwrite('foto_%s.jpg'%nome,cv2.GaussianBlur(out,(0,0),1.0),[cv2.IMWRITE_JPEG_QUALITY,85])
