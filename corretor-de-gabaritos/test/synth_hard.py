# Simula fotos de folhas preenchidas (perspectiva, luz desigual, ruído, cabeça para baixo)
import json, random, numpy as np, cv2, sys
random.seed(int(sys.argv[2]) if len(sys.argv) > 2 else 1); np.random.seed(random.randint(0, 99999))
lay = json.load(open('layout.json'))
base = cv2.imread('folha.png')            # 150 dpi
pxmm = base.shape[1] / 210.0
def P(x, y): return (int(round(x * pxmm)), int(round(y * pxmm)))

def fill(img, x, y, kind):
    cx, cy = x * pxmm, y * pxmm
    r = 2.4 * pxmm
    color = random.choice([(120, 40, 20), (40, 40, 40), (90, 60, 50), (150, 150, 150), (130, 130, 135)])  # azul/preto/grafite (BGR)
    if kind == 'full':
        cv2.circle(img, (int(cx), int(cy)), int(r * random.uniform(0.75, 1.0)), color, -1, cv2.LINE_AA)
    elif kind == 'scribble':  # rabisco que cobre a maior parte
        for k in range(14):
            a = random.uniform(0, 6.28); b = a + random.uniform(2, 3.5)
            p1 = (int(cx + r*0.8*np.cos(a)), int(cy + r*0.8*np.sin(a)))
            p2 = (int(cx + r*0.8*np.cos(b)), int(cy + r*0.8*np.sin(b)))
            cv2.line(img, p1, p2, color, max(2, int(pxmm*0.9)), cv2.LINE_AA)
    elif kind == 'x':  # aluno fez só um X (marcação fraca)
        d = int(r*0.7)
        cv2.line(img, (int(cx-d), int(cy-d)), (int(cx+d), int(cy+d)), color, max(1, int(pxmm*0.5)))
        cv2.line(img, (int(cx-d), int(cy+d)), (int(cx+d), int(cy-d)), color, max(1, int(pxmm*0.5)))

def make(idx, nq):
    img = base.copy()
    exp = {}
    for g, vals in [('serie', lay['SERIES']), ('turma', lay['TURMAS']), ('turno', lay['TURNOS'])]:
        i = random.randrange(len(vals)); b = lay['groups'][g][i]; fill(img, b['x'], b['y'], 'full'); exp[g] = vals[i]
    num = random.randint(1, 45)
    for g, d in [('dezena', num // 10), ('unidade', num % 10)]:
        b = lay['groups'][g][d]; fill(img, b['x'], b['y'], 'full'); exp[g] = str(d)
    for q in range(1, nq + 1):
        r = random.random()
        if r < 0.05: exp['q%d' % q] = None; continue                # em branco
        i = random.randrange(5); b = lay['groups']['q%d' % q][i]
        if r < 0.10:                                                  # duas marcações
            j = (i + random.randrange(1, 5)) % 5; b2 = lay['groups']['q%d' % q][j]
            fill(img, b['x'], b['y'], 'full'); fill(img, b2['x'], b2['y'], 'full'); exp['q%d' % q] = '*'; continue
        fill(img, b['x'], b['y'], random.choice(['full', 'full', 'full', 'scribble'])); exp['q%d' % q] = 'ABCDE'[i]
    # foto: fundo, perspectiva, rotação
    H0, W0 = img.shape[:2]
    W, H = 1600, 2133 if random.random() < 0.8 else 1600
    bg = np.full((H, W, 3), (60, 100, 140), np.uint8)     # mesa de madeira
    cv2.rectangle(bg, (0, 0), (W//5, H//3), (20, 20, 20), -1)   # objeto escuro
    s = random.uniform(0.42, 0.6) * min(W / W0, H / H0)
    cx, cy = W / 2 + random.uniform(-60, 60), H / 2 + random.uniform(-60, 60)
    ang = np.radians(random.uniform(-15, 15) + (180 if idx % 5 == 4 else 0))
    corners = np.array([[-W0/2, -H0/2], [W0/2, -H0/2], [W0/2, H0/2], [-W0/2, H0/2]]) * s
    rot = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
    dst = corners @ rot.T + [cx, cy]
    dst += np.random.uniform(-0.1, 0.1, dst.shape) * W0 * s     # perspectiva
    M = cv2.getPerspectiveTransform(np.float32([[0, 0], [W0, 0], [W0, H0], [0, H0]]), np.float32(dst))
    out = cv2.warpPerspective(img, M, (W, H), dst=bg, borderMode=cv2.BORDER_TRANSPARENT)
    # luz desigual + sombra + ruído + desfoque
    gx = np.linspace(random.uniform(0.6, 1.0), random.uniform(0.85, 1.1), W)
    gy = np.linspace(random.uniform(0.7, 1.05), random.uniform(0.7, 1.05), H)
    light = np.outer(gy, gx)[..., None]
    light = light * np.where((np.add.outer(np.arange(H), np.arange(W)) % 1200) < 350, 0.62, 1.0)[..., None]
    out = np.clip(out * light, 0, 255)
    out = cv2.GaussianBlur(out.astype(np.uint8), (0, 0), random.uniform(1.2, 2.4))
    out = np.clip(out + np.random.normal(0, 10, out.shape), 0, 255).astype(np.uint8)
    gray = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
    cv2.imwrite('foto_%d.jpg' % idx, out, [cv2.IMWRITE_JPEG_QUALITY, 80])
    gray = cv2.cvtColor(cv2.imread('foto_%d.jpg' % idx), cv2.COLOR_BGR2GRAY)
    gray.tofile('foto_%d.raw' % idx)
    json.dump({'w': W, 'h': H, 'exp': exp, 'nq': nq}, open('foto_%d.json' % idx, 'w'))

n = int(sys.argv[1])
for i in range(n): make(i, random.choice([10, 20, 30, 50]))
