/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * reports.js
 * Relatórios: média da turma, percentual de acerto por questão,
 * questões mais erradas e ranking dos alunos.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./store.js'));
  else root.GabReports = factory(root.GabStore);
})(typeof self !== 'undefined' ? self : this, function (Store) {
  'use strict';

  function calcular(p, alunos) {
    var qs = Store.questoesValidas(p), n = alunos.length;
    var notas = alunos.map(function (r) {
      var c = Store.corrigir(p, r);
      return { r: r, numero: r.numero, turma: Store.turmaNome(r), acertos: c.acertos, total: c.total, pct: c.pct };
    });
    var soma = notas.reduce(function (s, x) { return s + x.acertos; }, 0);

    var porQuestao = qs.map(function (q) {
      var cont = { A: 0, B: 0, C: 0, D: 0, E: 0 }, brancos = 0, multiplas = 0, acertos = 0;
      alunos.forEach(function (r) {
        var v = r.respostas[q - 1];
        if (v === p.gabarito[q - 1]) acertos++;
        if (!v) brancos++; else if (v === '*') multiplas++; else cont[v]++;
      });
      // alternativa errada mais escolhida: ajuda a entender o erro da turma
      var erradaTop = null;
      Object.keys(cont).forEach(function (l) {
        if (l === p.gabarito[q - 1] || !cont[l]) return;
        if (!erradaTop || cont[l] > cont[erradaTop]) erradaTop = l;
      });
      return {
        q: q, gab: p.gabarito[q - 1], acertos: acertos, n: n, pct: n ? acertos / n : 0,
        brancos: brancos, multiplas: multiplas, contagem: cont,
        erradaTop: erradaTop, erradaTopPct: (n && erradaTop) ? cont[erradaTop] / n : 0
      };
    });

    var maisErradas = porQuestao.slice().filter(function (x) { return x.n > 0 && x.pct < 1; })
      .sort(function (a, b) { return a.pct - b.pct || a.q - b.q; }).slice(0, 5);

    var ranking = notas.slice().sort(function (a, b) {
      return b.acertos - a.acertos || (a.numero || 999) - (b.numero || 999);
    });
    // posição com empate (1º, 1º, 3º…)
    ranking.forEach(function (x, i) {
      x.posicao = (i > 0 && ranking[i - 1].acertos === x.acertos) ? ranking[i - 1].posicao : i + 1;
    });

    return {
      n: n,
      total: qs.length,
      media: n ? soma / n : 0,
      pctMedio: (n && qs.length) ? soma / (n * qs.length) : 0,
      maior: n ? Math.max.apply(null, notas.map(function (x) { return x.acertos; })) : 0,
      menor: n ? Math.min.apply(null, notas.map(function (x) { return x.acertos; })) : 0,
      porQuestao: porQuestao,
      maisErradas: maisErradas,
      ranking: ranking
    };
  }

  function pct(x) { return Math.round(x * 100) + '%'; }
  function num(x) { return (Math.round(x * 10) / 10).toString().replace('.', ','); }

  return { calcular: calcular, pct: pct, num: num };
});
