/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * export.js
 * Gera os arquivos para exportar: lista de resultados por turma em PDF,
 * planilha Excel (.xlsx) e a folha de respostas em branco.
 */
(function (root) {
  'use strict';
  var L = root.GabLayout, Store = root.GabStore, R = root.GabReports;

  function jsPDFCtor() {
    var C = root.jspdf.jsPDF;
    // registra as tabelas (jsPDF-AutoTable) no jsPDF, uma vez só
    if (!C.API.autoTable && typeof root.applyPlugin === 'function') root.applyPlugin(C);
    return C;
  }

  function slug(s) {
    return String(s || 'arquivo').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'arquivo';
  }
  function hoje() {
    var d = new Date();
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
  }

  /* ---------- folha em branco ---------- */
  function folha(opts) {
    var doc = root.GabSheet.build(jsPDFCtor(), opts);
    return { blob: doc.output('blob'), nome: 'folha-respostas-' + slug(opts.prova || 'em-branco') + '.pdf' };
  }

  /* ---------- PDF de resultados + relatórios ---------- */
  // blocos: lista de turmas (Store.porTurma) — todas ou só uma
  function pdfResultados(p, blocos) {
    var JsPDF = jsPDFCtor(), doc = new JsPDF({ unit: 'mm', format: 'a4' });
    var escola = Store.getEscola();
    var azul = [29, 58, 95];

    function cabecalho(titulo, sub) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90);
      doc.text((escola || '').toUpperCase(), 14, 14);
      doc.text('Gerado em ' + hoje(), 196, 14, { align: 'right' });
      doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
      doc.text(titulo, 14, 23);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(sub, 14, 29.5);
    }
    function rodape() {
      var n = doc.getNumberOfPages();
      for (var i = 1; i <= n; i++) {
        doc.setPage(i); doc.setFontSize(7); doc.setTextColor(130);
        doc.text('Corretor de Gabaritos · criado pelo Prof. Artur', 14, 290);
        doc.text('Página ' + i + ' de ' + n, 196, 290, { align: 'right' });
      }
      doc.setTextColor(0);
    }

    var anuladas = p.anuladas.length ? ' · anuladas: ' + p.anuladas.slice().sort(function (a, b) { return a - b; }).join(', ') : '';

    blocos.forEach(function (b, i) {
      if (i > 0) doc.addPage();
      var rel = R.calcular(p, b.alunos);
      cabecalho(p.nome + (p.disciplina ? ' · ' + p.disciplina : ''), b.nome + ' · ' + rel.n + ' aluno(s) · ' + rel.total + ' questões válidas' + anuladas);

      // Resumo
      doc.setFontSize(10);
      var resumo = [
        ['Média de acertos', R.num(rel.media) + ' de ' + rel.total],
        ['Percentual médio de acerto', R.pct(rel.pctMedio)],
        ['Maior / menor nota', rel.maior + ' / ' + rel.menor]
      ];
      doc.autoTable({
        startY: 34, body: resumo, theme: 'plain', styles: { fontSize: 10, cellPadding: 1.2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }, margin: { left: 14 }
      });

      // Lista de alunos por número
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 4,
        head: [['Nº', 'Acertos', 'Percentual', 'Posição']],
        body: rel.ranking.slice().sort(function (a, c) { return (a.numero || 999) - (c.numero || 999); })
          .map(function (x) { return [x.numero == null ? '?' : x.numero, x.acertos + ' / ' + x.total, R.pct(x.pct), x.posicao + 'º']; }),
        headStyles: { fillColor: azul }, styles: { fontSize: 9.5, halign: 'center' }, margin: { left: 14, right: 14 }
      });

      // Questões mais erradas
      if (rel.maisErradas.length) {
        doc.autoTable({
          startY: doc.lastAutoTable.finalY + 6,
          head: [['Questões mais erradas', 'Gabarito', 'Acerto', 'Alternativa errada mais marcada']],
          body: rel.maisErradas.map(function (x) {
            return ['Questão ' + x.q, x.gab, R.pct(x.pct), x.erradaTop ? x.erradaTop + ' (' + R.pct(x.erradaTopPct) + ')' : '-'];
          }),
          headStyles: { fillColor: [180, 83, 9] }, styles: { fontSize: 9.5 }, margin: { left: 14, right: 14 }
        });
      }

      // Percentual de acerto por questão
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 6,
        head: [['Questão', 'Gabarito', 'Acertos', '% de acerto', 'A', 'B', 'C', 'D', 'E', 'Branco', 'Dupla']],
        body: rel.porQuestao.map(function (x) {
          return [x.q, x.gab, x.acertos + '/' + x.n, R.pct(x.pct), x.contagem.A, x.contagem.B, x.contagem.C, x.contagem.D, x.contagem.E, x.brancos, x.multiplas];
        }),
        headStyles: { fillColor: azul }, styles: { fontSize: 8.5, halign: 'center', cellPadding: 1.1 }, margin: { left: 14, right: 14 }
      });
    });

    // Se houver mais de uma turma, inclui o ranking geral
    if (blocos.length > 1) {
      doc.addPage();
      var todos = [];
      blocos.forEach(function (b) { todos = todos.concat(b.alunos); });
      var g = R.calcular(p, todos);
      cabecalho(p.nome, 'Todas as turmas · ' + g.n + ' aluno(s) · média ' + R.num(g.media) + ' de ' + g.total + ' (' + R.pct(g.pctMedio) + ')');
      doc.autoTable({
        startY: 35, head: [['Posição', 'Turma', 'Nº', 'Acertos', '%']],
        body: g.ranking.map(function (x) { return [x.posicao + 'º', x.turma, x.numero == null ? '?' : x.numero, x.acertos + ' / ' + x.total, R.pct(x.pct)]; }),
        headStyles: { fillColor: azul }, styles: { fontSize: 9 }, margin: { left: 14, right: 14 }
      });
    }

    rodape();
    var sufixo = blocos.length === 1 ? '-' + slug(blocos[0].nome) : '';
    return { blob: doc.output('blob'), nome: 'resultados-' + slug(p.nome) + sufixo + '.pdf' };
  }

  /* ---------- planilha ---------- */
  function planilha(p, blocos) {
    var XLSX = root.XLSX, wb = XLSX.utils.book_new(), qs = Store.questoesValidas(p);
    var nomes = {};
    blocos.forEach(function (b) {
      var linhas = [['Nº', 'Acertos', 'Total', '%'].concat(qs.map(function (q) { return 'Q' + q; }))];
      b.alunos.forEach(function (r) {
        var c = Store.corrigir(p, r);
        linhas.push([r.numero, c.acertos, c.total, Math.round(c.pct * 1000) / 10].concat(qs.map(function (q) {
          var v = r.respostas[q - 1];
          return v === '*' ? 'dupla' : (v || '');
        })));
      });
      linhas.push([]);
      linhas.push(['Gabarito', '', '', ''].concat(qs.map(function (q) { return p.gabarito[q - 1]; })));
      var nome = b.nome.replace(/[\\\/\?\*\[\]:]/g, '').slice(0, 28), base = nome, k = 2;
      while (nomes[nome]) nome = base.slice(0, 26) + ' ' + (k++);
      nomes[nome] = 1;
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linhas), nome);
    });
    // Aba de resumo por questão
    var todos = []; blocos.forEach(function (b) { todos = todos.concat(b.alunos); });
    var g = R.calcular(p, todos);
    var resumo = [['Questão', 'Gabarito', 'Acertos', 'Alunos', '% de acerto', 'Errada mais marcada']];
    g.porQuestao.forEach(function (x) {
      resumo.push([x.q, x.gab, x.acertos, x.n, Math.round(x.pct * 1000) / 10, x.erradaTop || '']);
    });
    resumo.push([]);
    resumo.push(['Criado com o Corretor de Gabaritos, do Prof. Artur']);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo por questão');
    var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    var blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var sufixo = blocos.length === 1 ? '-' + slug(blocos[0].nome) : '';
    return { blob: blob, nome: 'resultados-' + slug(p.nome) + sufixo + '.xlsx' };
  }

  root.GabExport = { folha: folha, pdfResultados: pdfResultados, planilha: planilha, slug: slug };
})(typeof self !== 'undefined' ? self : this);
