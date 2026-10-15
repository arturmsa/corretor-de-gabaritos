/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * sheet-pdf.js
 * Desenha a folha de respostas em PDF (A4) com o nome da escola,
 * usando as medidas de layout.js. Imprima sem "ajustar à página"
 * (tamanho real / 100%) para a leitura sair perfeita.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout.js'));
  else root.GabSheet = factory(root.GabLayout);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  // opts: { escola, prova, numQuestoes, copias }
  function build(JsPDF, opts) {
    opts = opts || {};
    var doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var copias = Math.max(1, Math.min(60, opts.copias || 1));
    for (var i = 0; i < copias; i++) {
      if (i > 0) doc.addPage();
      drawPage(doc, opts);
    }
    doc.setProperties({ title: 'Folha de respostas', creator: 'Corretor de Gabaritos (Prof. Artur)' });
    return doc;
  }

  function drawPage(doc, opts) {
    var n = Math.max(1, Math.min(L.MAX_Q, opts.numQuestoes || L.MAX_Q));
    doc.setDrawColor(0); doc.setFillColor(0); doc.setTextColor(0);

    // Cantos e barra de orientação (essenciais para a leitura)
    ['tl', 'tr', 'bl', 'br'].forEach(function (k) {
      var m = L.markers[k];
      doc.rect(m.x, m.y, L.MARKER, L.MARKER, 'F');
    });
    var b = L.orientBar;
    doc.rect(b.x, b.y, b.w, b.h, 'F');

    // Cabeçalho
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(70);
    doc.text((opts.escola || 'NOME DA ESCOLA').toUpperCase(), 20, 22, { maxWidth: 120 });
    doc.text('Questões: 1 a ' + n, 194, 22, { align: 'right' });
    doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
    doc.text('Folha de Respostas', 20, 30);
    if (opts.prova) {
      doc.setFontSize(10);
      doc.text(String(opts.prova), 194, 30, { align: 'right', maxWidth: 80 });
    }
    doc.setLineWidth(0.5); doc.line(20, 33, 194, 33);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setLineWidth(0.2);
    doc.text('Nome:', 20, 42); doc.line(32, 42.5, 194, 42.5);
    doc.text('Simulado de:', 20, 50); doc.line(42, 50.5, 124, 50.5);
    doc.text('Data:  ____/____/______', 130, 50);

    // Caixas
    doc.setLineWidth(0.35);
    ['turma', 'chamada', 'questoes'].forEach(function (k) {
      var bx = L.boxes[k]; doc.rect(bx.x, bx.y, bx.w, bx.h, 'S');
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('TURMA', L.boxes.turma.x + 3, L.boxes.turma.y + 5);
    doc.text('Nº DE CHAMADA', L.boxes.chamada.x + 3, L.boxes.chamada.y + 5);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    var rowLabel = { serie: 'Ano/Série', turma: 'Turma', turno: 'Turno', dezena: 'Dezena', unidade: 'Unidade' };
    ['serie', 'turma', 'turno', 'dezena', 'unidade'].forEach(function (g) {
      var bs = L.groups[g];
      var lx = (g === 'dezena' || g === 'unidade') ? L.boxes.chamada.x + 3 : L.boxes.turma.x + 3;
      doc.setFontSize(8); doc.text(rowLabel[g], lx, bs[0].y + 1.1);
      bs.forEach(function (bb) {
        bubble(doc, bb.x, bb.y);
        doc.setFontSize(6.5);
        doc.text(bb.label, bb.x, bb.y + 5.8, { align: 'center' });
      });
    });

    // Instruções
    doc.setFillColor(238); doc.rect(16, 101.5, 178, 7.5, 'F');
    doc.setFontSize(7.4); doc.setTextColor(30);
    doc.text('Preencha TODA a bolinha, uma por questão, com caneta azul ou preta. Não rasure, não dobre. Marque ano/série,', 18, 104.6);
    doc.text('turma, turno e nº de chamada (ex.: nº 7 = dezena 0, unidade 7). Responda só até a questão ' + n + '.', 18, 107.6);
    doc.setTextColor(0); doc.setFillColor(0);

    // Questões
    L.questionColumns.forEach(function (col) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      L.LETTERS.forEach(function (letter, i) {
        doc.text(letter, col.bubbleX0 + i * L.Q_DX, L.Q_HEAD_Y, { align: 'center' });
      });
      for (var q = col.first; q <= col.last; q++) {
        var bs = L.groups['q' + q];
        var ativa = q <= n;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.setTextColor(ativa ? 0 : 175);
        doc.text((q < 10 ? '0' : '') + q, col.numX, bs[0].y + 1.2, { align: 'right' });
        bs.forEach(function (bb) { bubble(doc, bb.x, bb.y, !ativa); });
      }
      doc.setTextColor(0);
    });

    // Rodapé com crédito ao criador
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
    doc.text('Assinatura: ______________________________________', 24, 275.5);
    doc.setFontSize(6.5); doc.setTextColor(120);
    doc.text('Corretor de Gabaritos · criado pelo Prof. Artur · folha v' + L.VERSION, 186, 275.5, { align: 'right' });
    doc.setTextColor(0);
  }

  function bubble(doc, x, y, apagada) {
    doc.setLineWidth(0.3);
    doc.setDrawColor(apagada ? 185 : 0);
    doc.circle(x, y, L.BUBBLE_R, 'S');
    doc.setDrawColor(0);
  }

  return { build: build };
});
