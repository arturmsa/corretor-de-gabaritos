/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * omr.js
 * Leitura óptica da folha de respostas, feita 100% no celular (sem internet).
 * Passos:
 *   1. acha os 4 quadrados pretos dos cantos;
 *   2. calcula a "homografia" (a conta que liga milímetros da folha a pixels da foto),
 *      o que corrige foto torta, inclinada ou de longe;
 *   3. confere a barra de orientação (foto de cabeça para baixo é corrigida);
 *   4. mede o quanto cada bolinha está escura comparada ao papel ao redor.
 * Não depende de bibliotecas externas.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout.js'));
  else root.GabOMR = factory(root.GabLayout);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  // Limiares de decisão (ajustados nos testes com fotos simuladas)
  var TH_MARK = 0.25;      // a partir daqui a bolinha conta como marcada
  var TH_DOUBT_LO = 0.15;  // entre DOUBT_LO e DOUBT_HI o app pede conferência
  var TH_DOUBT_HI = 0.32;
  var MULT_RATIO = 0.4;    // segunda marcação forte = questão com duas respostas (anulada para o aluno)

  /* ---------- utilidades de imagem ---------- */

  // Converte RGBA (canvas) em tons de cinza
  function toGray(rgba, w, h) {
    var g = new Uint8ClampedArray(w * h);
    for (var i = 0, j = 0; i < g.length; i++, j += 4) {
      g[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000;
    }
    return g;
  }

  function downsample(gray, w, h, maxDim) {
    var s = Math.min(1, maxDim / Math.max(w, h));
    if (s === 1) return { g: gray, w: w, h: h, s: 1 };
    var sw = Math.max(1, Math.round(w * s)), sh = Math.max(1, Math.round(h * s));
    var out = new Uint8ClampedArray(sw * sh);
    var fx = w / sw, fy = h / sh;
    for (var y = 0; y < sh; y++) {
      var y0 = Math.floor(y * fy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * fy));
      for (var x = 0; x < sw; x++) {
        var x0 = Math.floor(x * fx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * fx));
        var sum = 0, n = 0;
        for (var yy = y0; yy < y1; yy++) {
          var row = yy * w;
          for (var xx = x0; xx < x1; xx++) { sum += gray[row + xx]; n++; }
        }
        out[y * sw + x] = sum / n;
      }
    }
    return { g: out, w: sw, h: sh, s: sw / w };
  }

  // Binarização adaptativa: pixel escuro se bem mais escuro que a média da vizinhança
  function adaptiveDark(g, w, h, win) {
    var I = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y++) {
      var rs = 0;
      for (var x = 0; x < w; x++) {
        rs += g[y * w + x];
        I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + rs;
      }
    }
    // Limite absoluto: perto de objetos pretos (mesa escura, estojo) a média local
    // fica baixa e o quadrado do canto "some"; por isso também vale "bem mais escuro que o papel".
    var hist = new Uint32Array(256);
    for (var k = 0; k < g.length; k++) hist[g[k]]++;
    var acc = 0, p90 = 255;
    for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc >= g.length * 0.9) { p90 = v; break; } }
    var absTh = p90 * 0.45, paperTh = p90 * 0.75;
    var r = Math.floor(win / 2), out = new Uint8Array(w * h);
    for (var y2 = 0; y2 < h; y2++) {
      var ya = Math.max(0, y2 - r), yb = Math.min(h, y2 + r + 1);
      for (var x2 = 0; x2 < w; x2++) {
        var xa = Math.max(0, x2 - r), xb = Math.min(w, x2 + r + 1);
        var area = (yb - ya) * (xb - xa);
        var sum = I[yb * (w + 1) + xb] - I[ya * (w + 1) + xb] - I[yb * (w + 1) + xa] + I[ya * (w + 1) + xa];
        var gv = g[y2 * w + x2];
        out[y2 * w + x2] = ((gv < (sum / area) * 0.72 && gv < paperTh) || gv < absTh) ? 1 : 0;
      }
    }
    return out;
  }

  // Componentes conexos (manchas escuras)
  function components(bin, w, h) {
    var lab = new Int32Array(w * h), comps = [], stack = new Int32Array(w * h), next = 1;
    for (var i = 0; i < bin.length; i++) {
      if (!bin[i] || lab[i]) continue;
      var c = { area: 0, minx: w, maxx: 0, miny: h, maxy: 0, sx: 0, sy: 0, border: false };
      var sp = 0; stack[sp++] = i; lab[i] = next;
      while (sp) {
        var p = stack[--sp], px = p % w, py = (p - px) / w;
        c.area++; c.sx += px; c.sy += py;
        if (px < c.minx) c.minx = px; if (px > c.maxx) c.maxx = px;
        if (py < c.miny) c.miny = py; if (py > c.maxy) c.maxy = py;
        if (px === 0 || py === 0 || px === w - 1 || py === h - 1) c.border = true;
        if (px > 0 && bin[p - 1] && !lab[p - 1]) { lab[p - 1] = next; stack[sp++] = p - 1; }
        if (px < w - 1 && bin[p + 1] && !lab[p + 1]) { lab[p + 1] = next; stack[sp++] = p + 1; }
        if (py > 0 && bin[p - w] && !lab[p - w]) { lab[p - w] = next; stack[sp++] = p - w; }
        if (py < h - 1 && bin[p + w] && !lab[p + w]) { lab[p + w] = next; stack[sp++] = p + w; }
      }
      c.cx = c.sx / c.area; c.cy = c.sy / c.area;
      comps.push(c); next++;
    }
    return comps;
  }

  /* ---------- geometria ---------- */

  // Resolve sistema linear (eliminação de Gauss)
  function solve(A, b) {
    var n = b.length, M = A.map(function (r, i) { return r.concat([b[i]]); });
    for (var c = 0; c < n; c++) {
      var piv = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      var t = M[c]; M[c] = M[piv]; M[piv] = t;
      if (Math.abs(M[c][c]) < 1e-12) return null;
      for (var r2 = 0; r2 < n; r2++) {
        if (r2 === c) continue;
        var f = M[r2][c] / M[c][c];
        for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    return M.map(function (r, i) { return r[n] / r[i]; });
  }

  // Homografia: pontos da folha (mm) -> pontos da foto (px)
  function homography(src, dst) {
    var A = [], b = [];
    for (var i = 0; i < 4; i++) {
      var X = src[i][0], Y = src[i][1], x = dst[i][0], y = dst[i][1];
      A.push([X, Y, 1, 0, 0, 0, -x * X, -x * Y]); b.push(x);
      A.push([0, 0, 0, X, Y, 1, -y * X, -y * Y]); b.push(y);
    }
    var h = solve(A, b);
    if (!h) return null;
    return function (X, Y) {
      var d = h[6] * X + h[7] * Y + 1;
      return [(h[0] * X + h[1] * Y + h[2]) / d, (h[3] * X + h[4] * Y + h[5]) / d];
    };
  }

  function sampler(gray, w, h) {
    return function (x, y) {
      if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return 255;
      var x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * w + x0;
      return gray[i] * (1 - fx) * (1 - fy) + gray[i + 1] * fx * (1 - fy) +
             gray[i + w] * (1 - fx) * fy + gray[i + w + 1] * fx * fy;
    };
  }

  function median(a) {
    var s = a.slice().sort(function (p, q) { return p - q; });
    return s[s.length >> 1];
  }

  // Pontos de amostra (em mm, relativos ao centro) para o miolo e para o papel ao redor
  var INNER = [], RING = [];
  (function () {
    for (var dy = -1.5; dy <= 1.5001; dy += 0.375)
      for (var dx = -1.5; dx <= 1.5001; dx += 0.375)
        if (dx * dx + dy * dy <= 1.55 * 1.55) INNER.push([dx, dy]);
    // papel acima e abaixo da bolinha (os vizinhos ficam dos lados)
    [3.0, 3.3].forEach(function (r) {
      for (var a = 60; a <= 120; a += 10) {
        var t = a * Math.PI / 180;
        RING.push([r * Math.cos(t), r * Math.sin(t)]);
        RING.push([r * Math.cos(t), -r * Math.sin(t)]);
      }
    });
  })();

  function bubbleScore(P, S, x, y) {
    var inn = 0;
    for (var i = 0; i < INNER.length; i++) { var p = P(x + INNER[i][0], y + INNER[i][1]); inn += S(p[0], p[1]); }
    inn /= INNER.length;
    var ring = [];
    for (var j = 0; j < RING.length; j++) { var q = P(x + RING[j][0], y + RING[j][1]); ring.push(S(q[0], q[1])); }
    var ref = Math.max(median(ring), 1);
    return Math.max(0, Math.min(1, 1 - inn / ref));
  }

  // Escuridão média de um retângulo (mm) comparada a um pedaço de papel de referência
  function rectDarkness(P, S, r, paper) {
    var v = 0, n = 0;
    for (var y = r.y + 0.8; y <= r.y + r.h - 0.8; y += 0.6)
      for (var x = r.x + 0.8; x <= r.x + r.w - 0.8; x += 0.8) { var p = P(x, y); v += S(p[0], p[1]); n++; }
    var pv = [];
    paper.forEach(function (pt) { var q = P(pt[0], pt[1]); pv.push(S(q[0], q[1])); });
    return 1 - (v / n) / Math.max(median(pv), 1);
  }

  // Confere se a homografia faz sentido: cantos e barra escuros, papel claro
  function verify(P, S) {
    var paper = [];
    for (var x = 58; x <= 120; x += 4) paper.push([x, 12]);
    var bar = rectDarkness(P, S, L.orientBar, paper);
    var m = L.markers, mk = 0;
    ['tl', 'tr', 'bl', 'br'].forEach(function (k) {
      mk += rectDarkness(P, S, { x: m[k].x + 2, y: m[k].y + 2, w: 6, h: 6 }, paper);
    });
    return { bar: bar, markers: mk / 4, ok: bar > 0.35 && mk / 4 > 0.35 };
  }

  /* ---------- marcadores ---------- */

  function findMarkerCombos(gray, w, h) {
    var d = downsample(gray, w, h, 1100);
    var win = Math.max(15, Math.round(Math.max(d.w, d.h) / 7)) | 1;
    var bin = adaptiveDark(d.g, d.w, d.h, win);
    var comps = components(bin, d.w, d.h);
    var mn = Math.min(d.w, d.h), minA = Math.pow(mn * 0.011, 2), maxA = Math.pow(mn * 0.13, 2);
    // quadrado cortado pela borda da foto: só serve para dar uma dica melhor ao professor
    var cut = comps.some(function (c) {
      if (!c.border || c.area < minA || c.area > maxA) return false;
      var bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
      return c.area / (bw * bh) >= 0.6 && Math.max(bw, bh) / Math.min(bw, bh) < 3;
    });
    var cand = comps.filter(function (c) {
      if (c.border || c.area < minA || c.area > maxA) return false;
      var bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
      if (bw < 4 || bh < 4) return false;
      if (Math.max(bw, bh) / Math.min(bw, bh) > 1.8) return false;
      return c.area / (bw * bh) >= 0.45;
    });
    if (cand.length < 4) return { combos: [], scale: d.s, candidates: cand.length, cut: cut };

    var corners = {
      tl: function (c) { return c.cx + c.cy; },
      tr: function (c) { return (d.w - c.cx) + c.cy; },
      bl: function (c) { return c.cx + (d.h - c.cy); },
      br: function (c) { return (d.w - c.cx) + (d.h - c.cy); }
    };
    var lists = {};
    Object.keys(corners).forEach(function (k) {
      lists[k] = cand.slice().sort(function (a, b) { return corners[k](a) - corners[k](b); }).slice(0, 4);
    });

    var combos = [], expected = (L.markers.bl.cy - L.markers.tl.cy) / (L.markers.tr.cx - L.markers.tl.cx);
    lists.tl.forEach(function (a) { lists.tr.forEach(function (b) { lists.bl.forEach(function (c) { lists.br.forEach(function (e) {
      var set = [a, b, c, e];
      if (new Set(set).size < 4) return;
      var areas = set.map(function (s) { return s.area; });
      var amin = Math.min.apply(null, areas), amax = Math.max.apply(null, areas);
      if (amax / amin > 4) return;
      var poly = [a, b, e, c], sign = 0, convex = true, area2 = 0;
      for (var i = 0; i < 4; i++) {
        var p = poly[i], q = poly[(i + 1) % 4], r = poly[(i + 2) % 4];
        var cr = (q.cx - p.cx) * (r.cy - q.cy) - (q.cy - p.cy) * (r.cx - q.cx);
        if (sign === 0) sign = Math.sign(cr); else if (Math.sign(cr) !== sign) convex = false;
        area2 += p.cx * q.cy - q.cx * p.cy;
      }
      var qa = Math.abs(area2) / 2;
      if (!convex || qa < 0.08 * d.w * d.h) return;
      var top = Math.hypot(b.cx - a.cx, b.cy - a.cy), bot = Math.hypot(e.cx - c.cx, e.cy - c.cy);
      var lef = Math.hypot(c.cx - a.cx, c.cy - a.cy), rig = Math.hypot(e.cx - b.cx, e.cy - b.cy);
      if (top / bot > 2 || bot / top > 2 || lef / rig > 2 || rig / lef > 2) return;
      var aspect = ((lef + rig) / 2) / ((top + bot) / 2);
      var ratio = Math.max(aspect / expected, expected / aspect);
      var score = (qa / (d.w * d.h)) * Math.exp(-Math.log(ratio) * 3) * (amin / amax);
      combos.push({ score: score, pts: set.map(function (s) { return [s.cx / d.s, s.cy / d.s]; }) });
    }); }); }); });
    combos.sort(function (x, y) { return y.score - x.score; });
    return { combos: combos.slice(0, 12), scale: d.s, candidates: cand.length, cut: cut };
  }

  /* ---------- decisão das bolinhas ---------- */

  function decide(scores, values) {
    var idx = scores.map(function (s, i) { return i; }).sort(function (a, b) { return scores[b] - scores[a]; });
    var top = scores[idx[0]], second = scores[idx[1]] || 0;
    var value, doubt = false;
    if (top < TH_MARK) value = null;
    else if (second >= TH_MARK && second >= MULT_RATIO * top) value = '*';
    else value = values[idx[0]];
    if (top >= TH_DOUBT_LO && top < TH_DOUBT_HI) doubt = true;
    if (value !== '*' && second >= TH_DOUBT_LO) doubt = true;
    return { value: value, doubt: doubt };
  }

  /* ---------- leitura completa ---------- */

  // gray: tons de cinza da foto; retorna respostas e identificação
  function read(gray, w, h) {
    var S = sampler(gray, w, h);
    var found = findMarkerCombos(gray, w, h);
    var CUT_MSG = 'Um dos quadrados pretos dos cantos ficou cortado na borda da foto. Afaste um pouco o celular e deixe uma margem em volta da folha.';
    if (!found.combos.length && found.cut) return { ok: false, error: CUT_MSG };
    if (!found.combos.length) {
      return { ok: false, error: 'Não encontrei os 4 quadrados pretos dos cantos. Fotografe a folha inteira, de cima, com boa luz.' };
    }
    var m = L.markers;
    var src = [[m.tl.cx, m.tl.cy], [m.tr.cx, m.tr.cy], [m.bl.cx, m.bl.cy], [m.br.cx, m.br.cy]];
    var P = null, check = null;
    for (var i = 0; i < found.combos.length && !P; i++) {
      var pts = found.combos[i].pts;
      // tenta a folha em pé e de cabeça para baixo
      var tries = [pts, [pts[3], pts[2], pts[1], pts[0]]];
      for (var t = 0; t < 2; t++) {
        var H = homography(src, tries[t]);
        if (!H) continue;
        var v = verify(H, S);
        if (v.ok) { P = H; check = v; break; }
      }
    }
    if (!P && found.cut) return { ok: false, error: CUT_MSG };
    if (!P) {
      return { ok: false, error: 'Achei manchas escuras, mas não reconheci a folha. Confira se é a folha do app e se os 4 cantos aparecem na foto.' };
    }

    var answers = {}, scores = {}, doubts = [], points = {};
    L.order.forEach(function (gname) {
      var bubbles = L.groups[gname];
      var sc = bubbles.map(function (b) { return bubbleScore(P, S, b.x, b.y); });
      var res = decide(sc, bubbles.map(function (b) { return b.value; }));
      answers[gname] = res.value;
      scores[gname] = sc;
      if (res.doubt) doubts.push(gname);
      points[gname] = bubbles.map(function (b) { return P(b.x, b.y); });
    });

    var numero = null;
    if (answers.dezena && answers.unidade && answers.dezena !== '*' && answers.unidade !== '*') {
      numero = parseInt(answers.dezena + answers.unidade, 10);
    } else if (!answers.dezena && answers.unidade && answers.unidade !== '*') {
      numero = parseInt(answers.unidade, 10); // aluno marcou só a unidade (ex.: nº 7)
    }

    return {
      ok: true,
      answers: answers, scores: scores, doubts: doubts, points: points,
      numero: numero, check: check, project: P
    };
  }

  return { read: read, toGray: toGray, homography: homography, decide: decide };
});
