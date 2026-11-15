/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * mini.js
 * Mini gabarito: um bloco pequeno que o professor cola DENTRO da própria prova
 * (no Word, Google Docs etc.), em dois formatos:
 *   'mini-h'  faixa horizontal (questões em colunas, A a E de cima para baixo)
 *   'mini-q'  quadrado (questões em linhas, como na folha A4)
 *   'mini-c'  compacto: só as questões, sem identificação do aluno
 *             (o aluno escreve o nome na prova e o professor digita o nº no app)
 * O tamanho do bloco muda conforme o número de questões da prova.
 * As medidas estão em milímetros, com origem no canto superior esquerdo do bloco.
 * O mesmo desenho serve para o PDF, para a imagem PNG e para a leitura da foto.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout.js'));
  else root.GabMini = factory(root.GabLayout);
})(typeof self !== 'undefined' ? self : this, function (A4) {
  'use strict';

  var R = 1.9;          // raio da bolinha
  var MK = 6;           // lado dos quadrados pretos dos cantos
  var DX = 5.0;         // distância entre bolinhas na horizontal
  var ROW = 6.6;        // distância entre as linhas de identificação
  var LETTERS = A4.LETTERS;

  var FORMATOS = {
    'mini-h': 'Mini gabarito horizontal (faixa)',
    'mini-q': 'Mini gabarito quadrado',
    'mini-c': 'Mini gabarito compacto (só as questões)'
  };

  function base(id, W, H, numQ) {
    var L = {
      id: id, nome: FORMATOS[id], mini: true, numQ: numQ,
      PAGE: { w: W, h: H }, BUBBLE_R: R, MARKER: MK, LETTERS: LETTERS,
      markers: {
        tl: { x: 0, y: 0 }, tr: { x: W - MK, y: 0 },
        bl: { x: 0, y: H - MK }, br: { x: W - MK, y: H - MK }
      },
      // barra de orientação (preta) e conferências brancas ao redor dela
      orientBar: { x: 10, y: 1.5, w: 14, h: 3 },
      barEnds: [{ x: 7.2, y: 1.5, w: 2.3, h: 3 }, { x: 24.7, y: 1.5, w: 2.5, h: 3 }],
      antiBar: { x: W - 24, y: 1.5, w: 14, h: 3 },
      paperRef: [],
      groups: {}, order: [], labels: [], texts: [], lines: []
    };
    Object.keys(L.markers).forEach(function (k) {
      L.markers[k].cx = L.markers[k].x + MK / 2;
      L.markers[k].cy = L.markers[k].y + MK / 2;
    });
    for (var x = 14; x <= 60; x += 3) L.paperRef.push([x, 7.4]);
    return L;
  }

  function addGroup(L, name, values, pts, labels) {
    L.groups[name] = values.map(function (v, i) {
      return { value: v, label: labels ? labels[i] : v, x: pts[i][0], y: pts[i][1] };
    });
    L.order.push(name);
  }
  function row(x0, y, n, dx) { var a = []; for (var i = 0; i < n; i++) a.push([x0 + i * dx, y]); return a; }

  // Bloco de identificação (série, turma, turno e nº de chamada), igual nos dois formatos
  function blocoIdentificacao(L) {
    var x0 = 14, y1 = 11;
    addGroup(L, 'serie', A4.SERIES, row(x0, y1, 7, DX));
    addGroup(L, 'turma', A4.TURMAS, row(x0, y1 + ROW, 5, DX));
    addGroup(L, 'turno', A4.TURNOS, row(46, y1 + ROW, 3, DX), ['M', 'T', 'N']);
    addGroup(L, 'dezena', A4.DIGITOS, row(x0, y1 + 2 * ROW, 10, DX));
    addGroup(L, 'unidade', A4.DIGITOS, row(x0, y1 + 3 * ROW, 10, DX));
    L.texts.push({ t: 'Série', x: 1.5, y: y1 + 0.8, size: 5.2 });
    L.texts.push({ t: 'Turma', x: 1.5, y: y1 + ROW + 0.8, size: 5.2 });
    L.texts.push({ t: 'Turno', x: 37, y: y1 + ROW + 0.8, size: 5.2 });
    L.texts.push({ t: 'Nº dez.', x: 1.5, y: y1 + 2 * ROW + 0.8, size: 5.2 });
    L.texts.push({ t: 'Nº unid.', x: 1.5, y: y1 + 3 * ROW + 0.8, size: 5.2 });
    return y1 + 3 * ROW;   // y da última linha
  }

  /* ---------- faixa horizontal ---------- */
  function horizontal(numQ) {
    var PER = 20, BAND = 29;
    var bands = Math.ceil(numQ / PER);
    // largura só o necessário: com poucas questões a faixa fica mais curta
    var W = Math.max(110, 74 + (Math.min(numQ, PER) - 1) * DX + 10);
    var H = 45 + (bands - 1) * BAND;
    var L = base('mini-h', W, H, numQ);
    blocoIdentificacao(L);
    L.lines.push({ x1: 64, y1: 8, x2: 64, y2: H - 8 });
    var qx0 = 74;
    for (var b = 0; b < bands; b++) {
      var dy = b * BAND;
      LETTERS.forEach(function (l, i) { L.texts.push({ t: l, x: 69.5, y: 14 + dy + i * 5.4 + 0.8, size: 5.5, bold: true, align: 'center' }); });
      for (var k = 0; k < PER; k++) {
        var q = b * PER + k + 1;
        if (q > numQ) break;
        var x = qx0 + k * DX;
        L.texts.push({ t: String(q), x: x, y: 10.2 + dy, size: 5.2, bold: true, align: 'center' });
        var pts = [];
        for (var i = 0; i < 5; i++) pts.push([x, 14 + dy + i * 5.4]);
        addGroup(L, 'q' + q, LETTERS, pts);
      }
    }
    L.titulo = { t: 'GABARITO  ·  preencha toda a bolinha', x: W / 2 + 10, y: 4.6, size: 6.5 };
    L.credito = { t: 'Corretor de Gabaritos · Prof. Artur', x: W / 2, y: H - 1.6, size: 4 };
    return L;
  }

  /* ---------- compacto (só as questões) ---------- */
  // Para diferenciar do quadrado, a barra de orientação fica EMBAIXO, à esquerda.
  function compacto(numQ) {
    var PER = 20, BAND = 29, qx0 = 15;
    var bands = Math.ceil(numQ / PER);
    var W = qx0 + (Math.min(numQ, PER) - 1) * DX + R + 6.1;
    W = Math.max(W, 60);
    var H = 45 + (bands - 1) * BAND;
    var L = base('mini-c', W, H, numQ);
    L.orientBar = { x: 10, y: H - 4.5, w: 14, h: 3 };
    L.barEnds = [{ x: 7.2, y: H - 4.5, w: 2.3, h: 3 }, { x: 24.7, y: H - 4.5, w: 2.5, h: 3 }];
    L.antiBar = { x: W - 24, y: H - 4.5, w: 14, h: 3 };
    L.paperRef = [];
    for (var x = 9; x <= W - 9; x += 3) L.paperRef.push([x, 7.4]);
    for (var b = 0; b < bands; b++) {
      var dy = b * BAND;
      LETTERS.forEach(function (l, i) { L.texts.push({ t: l, x: 9.5, y: 14 + dy + i * 5.4 + 0.8, size: 5.5, bold: true, align: 'center' }); });
      for (var k = 0; k < PER; k++) {
        var q = b * PER + k + 1;
        if (q > numQ) break;
        var x2 = qx0 + k * DX;
        L.texts.push({ t: String(q), x: x2, y: 10.2 + dy, size: 5.2, bold: true, align: 'center' });
        var pts = [];
        for (var i = 0; i < 5; i++) pts.push([x2, 14 + dy + i * 5.4]);
        addGroup(L, 'q' + q, LETTERS, pts);
      }
    }
    L.titulo = { t: 'GABARITO', x: W / 2, y: 4.6, size: 6.5 };
    L.credito = { t: 'Prof. Artur', x: (27.5 + W - 24) / 2, y: H - 2, size: 3.6 };
    return L;
  }

  /* ---------- quadrado ---------- */
  function quadrado(numQ) {
    var COLW = 33, QY0 = 42, QDY = 5.6;
    var melhor = null;
    for (var C = 2; C <= 5; C++) {
      var W = Math.max(74, 8 + C * COLW);
      var rows = Math.ceil(numQ / C);
      var H = QY0 + (rows - 1) * QDY + R + 8;
      var nota = Math.abs(Math.log(H / W));
      if (W <= 180 && (!melhor || nota < melhor.nota - 0.02)) melhor = { C: C, W: W, H: H, rows: rows, nota: nota };
    }
    var L = base('mini-q', melhor.W, melhor.H, numQ);
    blocoIdentificacao(L);
    var C2 = melhor.C, rows2 = melhor.rows;
    var x0 = (melhor.W - C2 * COLW) / 2 + 2;
    L.lines.push({ x1: 2, y1: QY0 - 7.5, x2: melhor.W - 2, y2: QY0 - 7.5 });
    for (var c = 0; c < C2; c++) {
      var cx = x0 + c * COLW;
      LETTERS.forEach(function (l, i) { L.texts.push({ t: l, x: cx + 8 + i * DX, y: QY0 - 3.6, size: 5.5, bold: true, align: 'center' }); });
      for (var r = 0; r < rows2; r++) {
        var q = c * rows2 + r + 1;
        if (q > numQ) break;
        var y = QY0 + r * QDY;
        L.texts.push({ t: String(q), x: cx + 4.4, y: y + 0.9, size: 6, bold: true, align: 'right' });
        addGroup(L, 'q' + q, LETTERS, row(cx + 8, y, 5, DX));
      }
    }
    L.titulo = { t: 'GABARITO', x: melhor.W / 2 + 1, y: 4.6, size: 6.5 };
    L.credito = { t: 'Corretor de Gabaritos · Prof. Artur', x: melhor.W / 2, y: melhor.H - 1.6, size: 4 };
    return L;
  }

  function layout(formato, numQ) {
    numQ = Math.max(1, Math.min(A4.MAX_Q, numQ || 10));
    if (formato === 'mini-c') return compacto(numQ);
    return formato === 'mini-q' ? quadrado(numQ) : horizontal(numQ);
  }

  /* ---------- desenho ---------- */
  // "pen" é um pincel simples em milímetros; há um para jsPDF e outro para canvas.
  function desenhar(L, pen) {
    ['tl', 'tr', 'bl', 'br'].forEach(function (k) { pen.rect(L.markers[k].x, L.markers[k].y, MK, MK); });
    pen.rect(L.orientBar.x, L.orientBar.y, L.orientBar.w, L.orientBar.h);
    // moldura fina para recortar/colar com facilidade (fica fora da área lida)
    pen.frame(0, 0, L.PAGE.w, L.PAGE.h);
    L.lines.forEach(function (l) { pen.line(l.x1, l.y1, l.x2, l.y2, 0.2, 150); });
    pen.text(L.titulo.t, L.titulo.x, L.titulo.y, { size: L.titulo.size, bold: true, align: 'center' });
    L.texts.forEach(function (t) { pen.text(t.t, t.x, t.y, { size: t.size, bold: t.bold, align: t.align || 'left', gray: 30 }); });
    L.order.forEach(function (g) {
      L.groups[g].forEach(function (b) {
        pen.circle(b.x, b.y, R);
        pen.text(b.label, b.x, b.y + 0.75, { size: 4.2, align: 'center', gray: 160 });
      });
    });
    pen.text(L.credito.t, L.credito.x, L.credito.y, { size: L.credito.size, align: 'center', gray: 140 });
  }

  // Pincel para jsPDF (ox, oy = posição do bloco na página, em mm)
  function penPDF(doc, ox, oy) {
    return {
      rect: function (x, y, w, h) { doc.setFillColor(0); doc.rect(ox + x, oy + y, w, h, 'F'); },
      frame: function (x, y, w, h) {
        doc.setDrawColor(200); doc.setLineWidth(0.15);
        doc.setLineDashPattern([1, 1], 0); doc.rect(ox + x - 1.5, oy + y - 1.5, w + 3, h + 3, 'S');
        doc.setLineDashPattern([], 0); doc.setDrawColor(0);
      },
      line: function (x1, y1, x2, y2, lw, gray) { doc.setDrawColor(gray); doc.setLineWidth(lw); doc.line(ox + x1, oy + y1, ox + x2, oy + y2); doc.setDrawColor(0); },
      circle: function (x, y, r) { doc.setDrawColor(0); doc.setLineWidth(0.25); doc.circle(ox + x, oy + y, r, 'S'); },
      text: function (t, x, y, o) {
        doc.setFont('helvetica', o.bold ? 'bold' : 'normal'); doc.setFontSize(o.size);
        doc.setTextColor(o.gray || 0); doc.text(t, ox + x, oy + y, { align: o.align || 'left' }); doc.setTextColor(0);
      }
    };
  }

  // Pincel para canvas (s = pixels por milímetro; m = margem em mm)
  function penCanvas(ctx, s, m) {
    function X(v) { return (v + m) * s; }
    return {
      rect: function (x, y, w, h) { ctx.fillStyle = '#000'; ctx.fillRect(X(x), X(y), w * s, h * s); },
      frame: function (x, y, w, h) {
        ctx.save(); ctx.strokeStyle = '#c8c8c8'; ctx.lineWidth = 0.15 * s; ctx.setLineDash([s, s]);
        ctx.strokeRect(X(x - 1.5), X(y - 1.5), (w + 3) * s, (h + 3) * s); ctx.restore();
      },
      line: function (x1, y1, x2, y2, lw, gray) {
        ctx.strokeStyle = 'rgb(' + gray + ',' + gray + ',' + gray + ')'; ctx.lineWidth = lw * s;
        ctx.beginPath(); ctx.moveTo(X(x1), X(y1)); ctx.lineTo(X(x2), X(y2)); ctx.stroke();
      },
      circle: function (x, y, r) {
        ctx.strokeStyle = '#000'; ctx.lineWidth = 0.25 * s;
        ctx.beginPath(); ctx.arc(X(x), X(y), r * s, 0, Math.PI * 2); ctx.stroke();
      },
      text: function (t, x, y, o) {
        var g = o.gray || 0;
        ctx.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')';
        ctx.font = (o.bold ? 'bold ' : '') + (o.size * 0.3528 * s).toFixed(1) + 'px Helvetica, Arial, sans-serif';
        ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(t, X(x), X(y));
      }
    };
  }

  // PDF com o bloco em tamanho real, centralizado numa folha A4 (para imprimir ou recortar)
  function pdf(JsPDF, formato, numQ) {
    var L = layout(formato, numQ);
    var doc = new JsPDF({ unit: 'mm', format: 'a4' });
    var ox = (210 - L.PAGE.w) / 2, oy = 25;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
    doc.text('Mini gabarito (' + numQ + ' questões) · tamanho real · recorte na linha pontilhada', 105, 15, { align: 'center' });
    doc.setTextColor(0);
    desenhar(L, penPDF(doc, ox, oy));
    return doc;
  }

  // Imagem PNG do bloco (300 dpi) para colar na prova. Devolve Promise<Blob>.
  function png(formato, numQ) {
    var L = layout(formato, numQ), s = 300 / 25.4, m = 2;
    var cv = document.createElement('canvas');
    cv.width = Math.round((L.PAGE.w + 2 * m) * s); cv.height = Math.round((L.PAGE.h + 2 * m) * s);
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    desenhar(L, penCanvas(ctx, s, m));
    return new Promise(function (ok) {
      cv.toBlob(function (b) {
        b.arrayBuffer().then(function (buf) { ok(new Blob([pngComDpi(buf, 300)], { type: 'image/png' })); });
      }, 'image/png');
    });
  }

  // Grava os "pontos por polegada" no PNG, para o Word colar a imagem já no tamanho certo
  var CRC = null;
  function crc32(bytes) {
    if (!CRC) { CRC = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) crc = CRC[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function pngComDpi(buf, dpi) {
    var src = new Uint8Array(buf), ppm = Math.round(dpi / 0.0254);
    var chunk = new Uint8Array(21), dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9); chunk.set([0x70, 0x48, 0x59, 0x73], 4);   // "pHYs"
    dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    var at = 33;  // logo depois do cabeçalho IHDR
    var out = new Uint8Array(src.length + 21);
    out.set(src.subarray(0, at), 0); out.set(chunk, at); out.set(src.subarray(at), at + 21);
    return out;
  }

  return { FORMATOS: FORMATOS, layout: layout, desenhar: desenhar, penPDF: penPDF, penCanvas: penCanvas, pdf: pdf, png: png };
});
