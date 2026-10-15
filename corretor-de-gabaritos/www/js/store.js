/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 *
 * store.js
 * Guarda provas e resultados no próprio celular (sem internet, sem conta).
 * Nada sai do aparelho, a não ser quando o professor exporta ou compartilha.
 * O nome do aluno não é guardado: só turma e número de chamada.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./layout.js'));
  else root.GabStore = factory(root.GabLayout);
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  var KEY = 'corretor-gabaritos.v1';
  var mem = null;
  var storage = (typeof localStorage !== 'undefined') ? localStorage : null;

  function vazio() { return { versao: 1, escola: '', provas: [] }; }

  function load() {
    if (mem) return mem;
    try {
      var raw = storage && storage.getItem(KEY);
      mem = raw ? JSON.parse(raw) : vazio();
    } catch (e) { mem = vazio(); }
    if (!mem.provas) mem.provas = [];
    return mem;
  }

  function save() {
    try { if (storage) storage.setItem(KEY, JSON.stringify(mem)); return true; }
    catch (e) { return false; }
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------- escola ---------- */
  function getEscola() { return load().escola || ''; }
  function setEscola(nome) { load().escola = (nome || '').trim(); save(); }

  /* ---------- provas ---------- */
  function provas() { return load().provas.slice().sort(function (a, b) { return b.criadaEm - a.criadaEm; }); }
  function prova(id) { return load().provas.filter(function (p) { return p.id === id; })[0] || null; }

  function novaProva(dados) {
    var p = {
      id: uid(), nome: dados.nome || 'Prova sem nome', disciplina: dados.disciplina || '',
      numQ: dados.numQ || 10, gabarito: dados.gabarito || [], anuladas: dados.anuladas || [],
      criadaEm: Date.now(), resultados: []
    };
    load().provas.push(p); save();
    return p;
  }

  function salvarProva(p) {
    var lista = load().provas;
    for (var i = 0; i < lista.length; i++) if (lista[i].id === p.id) lista[i] = p;
    return save();
  }

  function excluirProva(id) {
    var d = load(); d.provas = d.provas.filter(function (p) { return p.id !== id; }); save();
  }

  /* ---------- resultados ---------- */

  // Uma folha corrigida: { serie, turma, turno, numero, respostas[50] }
  function acharDuplicado(p, r) {
    return p.resultados.filter(function (x) {
      return x.id !== r.id && x.serie === r.serie && x.turma === r.turma && x.turno === r.turno && x.numero === r.numero;
    })[0] || null;
  }

  function salvarResultado(p, r) {
    if (!r.id) { r.id = uid(); r.criadoEm = Date.now(); p.resultados.push(r); }
    else {
      for (var i = 0; i < p.resultados.length; i++) if (p.resultados[i].id === r.id) p.resultados[i] = r;
    }
    return salvarProva(p);
  }

  function excluirResultado(p, id) {
    p.resultados = p.resultados.filter(function (r) { return r.id !== id; });
    salvarProva(p);
  }

  /* ---------- correção ---------- */

  // Questões anuladas ficam de fora (o app desconsidera, como o Prof. Artur definiu).
  function questoesValidas(p) {
    var out = [];
    for (var q = 1; q <= p.numQ; q++) {
      if (p.anuladas.indexOf(q) >= 0) continue;
      if (!p.gabarito[q - 1]) continue;
      out.push(q);
    }
    return out;
  }

  function corrigir(p, r) {
    var qs = questoesValidas(p), acertos = 0;
    qs.forEach(function (q) { if (r.respostas[q - 1] === p.gabarito[q - 1]) acertos++; });
    return { acertos: acertos, total: qs.length, pct: qs.length ? acertos / qs.length : 0 };
  }

  /* ---------- turmas ---------- */

  function turmaChave(r) { return [r.serie || '?', r.turma || '?', r.turno || '?'].join('|'); }

  function turmaNome(r) {
    var si = L.SERIES.indexOf(r.serie), ti = L.TURNOS.indexOf(r.turno);
    var serie = si >= 0 ? L.SERIES_NOME[si] : 'Série ?';
    return serie + ' ' + (r.turma || '?') + ' · ' + (ti >= 0 ? L.TURNOS_NOME[ti] : 'turno ?');
  }

  function turmaOrdem(r) {
    var si = L.SERIES.indexOf(r.serie), ti = L.TURNOS.indexOf(r.turno), tu = L.TURMAS.indexOf(r.turma);
    return (si < 0 ? 99 : si) * 10000 + (ti < 0 ? 99 : ti) * 100 + (tu < 0 ? 99 : tu);
  }

  // Agrupa os resultados em blocos por turma, já ordenados
  function porTurma(p) {
    var mapa = {};
    p.resultados.forEach(function (r) {
      var k = turmaChave(r);
      if (!mapa[k]) mapa[k] = { chave: k, nome: turmaNome(r), ordem: turmaOrdem(r), alunos: [] };
      mapa[k].alunos.push(r);
    });
    return Object.keys(mapa).map(function (k) {
      var b = mapa[k];
      b.alunos.sort(function (a, c) { return (a.numero || 999) - (c.numero || 999); });
      return b;
    }).sort(function (a, b) { return a.ordem - b.ordem; });
  }

  /* ---------- cópia de segurança ---------- */
  function exportar() { return JSON.stringify(load()); }
  function importar(txt) {
    var d = JSON.parse(txt);
    if (!d || !Array.isArray(d.provas)) throw new Error('Arquivo inválido');
    mem = d; save();
  }

  return {
    load: load, save: save,
    getEscola: getEscola, setEscola: setEscola,
    provas: provas, prova: prova, novaProva: novaProva, salvarProva: salvarProva, excluirProva: excluirProva,
    acharDuplicado: acharDuplicado, salvarResultado: salvarResultado, excluirResultado: excluirResultado,
    questoesValidas: questoesValidas, corrigir: corrigir,
    turmaChave: turmaChave, turmaNome: turmaNome, porTurma: porTurma,
    exportar: exportar, importar: importar
  };
});
