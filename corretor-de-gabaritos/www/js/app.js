/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 * App gratuito, para ser compartilhado entre professores.
 *
 * app.js
 * Telas do app: provas, gabarito oficial, escanear, conferir leitura,
 * resultados separados por turma, relatórios e exportação.
 */
(function () {
  'use strict';
  var L = window.GabLayout, OMR = window.GabOMR, Store = window.GabStore,
      R = window.GabReports, X = window.GabExport, Plat = window.GabPlatform;

  var VERSAO_APP = '1.0.0';
  var $view = document.getElementById('view');
  var $titulo = document.getElementById('titulo');
  var $voltar = document.getElementById('btnVoltar');
  var $menu = document.getElementById('menu');
  var $dlg = document.getElementById('dialogo');

  // Estado temporário (não salvo)
  var pendente = null;   // folha recém-escaneada, aguardando conferência
  var rascunho = null;   // prova sendo criada/editada
  var relTurma = '';     // turma escolhida nos relatórios ('' = todas)

  /* =============== utilidades =============== */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var ICON = {
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5" fill="none"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5" fill="none"/><circle cx="6" cy="12" r="2.5" fill="none"/><circle cx="18" cy="19" r="2.5" fill="none"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };

  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, ms || 2800);
  }
  function carregando(on, msg) {
    document.getElementById('carregandoMsg').textContent = msg || 'Lendo a folha…';
    document.getElementById('carregando').hidden = !on;
  }

  // Diálogo simples: devolve o valor do botão escolhido
  function dialogo(html, botoes) {
    return new Promise(function (ok) {
      $dlg.innerHTML = '<form method="dialog">' + html + '<div class="row">' + botoes.map(function (b) {
        return '<button class="btn ' + (b.cls || '') + '" value="' + esc(b.valor) + '">' + esc(b.texto) + '</button>';
      }).join('') + '</div></form>';
      $dlg.onclose = function () { ok($dlg.returnValue || null); };
      $dlg.returnValue = '';
      $dlg.showModal();
    });
  }
  function confirmar(titulo, texto, sim, perigo) {
    return dialogo('<h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>',
      [{ texto: 'Cancelar', valor: 'nao' }, { texto: sim || 'Confirmar', valor: 'sim', cls: perigo ? 'primary danger' : 'primary' }])
      .then(function (v) { return v === 'sim'; });
  }
  function aviso(titulo, texto) {
    return dialogo('<h2>' + esc(titulo) + '</h2><p>' + esc(texto) + '</p>', [{ texto: 'Entendi', valor: 'ok', cls: 'primary' }]);
  }

  function go(hash) { location.hash = hash; }
  function setTopo(titulo, voltarPara) {
    $titulo.textContent = titulo;
    $voltar.hidden = !voltarPara;
    $voltar.onclick = function () { go(voltarPara); };
  }

  /* =============== roteador =============== */

  function render() {
    $menu.hidden = true;
    $view.onclick = null;
    var h = location.hash.replace(/^#/, '') || '/';
    var m;
    window.scrollTo(0, 0);
    if (h === '/') return telaInicio();
    if (h === '/nova') return telaProvaForm(null);
    if (h === '/sobre') return telaSobre();
    if ((m = h.match(/^\/p\/([^/]+)$/))) return telaProva(m[1]);
    if ((m = h.match(/^\/p\/([^/]+)\/editar$/))) return telaProvaForm(m[1]);
    if ((m = h.match(/^\/p\/([^/]+)\/revisao$/))) return telaRevisao(m[1], null);
    if ((m = h.match(/^\/p\/([^/]+)\/r\/([^/]+)$/))) return telaRevisao(m[1], m[2]);
    if ((m = h.match(/^\/p\/([^/]+)\/resultados$/))) return telaResultados(m[1]);
    if ((m = h.match(/^\/p\/([^/]+)\/relatorios$/))) return telaRelatorios(m[1]);
    go('/');
  }
  window.addEventListener('hashchange', render);

  /* =============== início =============== */

  function telaInicio() {
    setTopo('Corretor de Gabaritos', null);
    var provas = Store.provas(), escola = Store.getEscola();
    var html = '';
    html += '<button class="item" data-acao="escola"><div class="grow"><div class="small muted">Escola (aparece na folha)</div>' +
      '<div class="title">' + (escola ? esc(escola) : 'Toque para definir o nome da escola') + '</div></div>' + CHEV + '</button>';
    html += '<h3>Provas</h3>';
    if (!provas.length) {
      html += '<div class="card empty"><h2>Nenhuma prova ainda</h2><p class="muted">Como funciona:</p><ol class="steps">' +
        '<li>Crie a prova e marque o gabarito oficial.</li>' +
        '<li>Gere a folha de respostas em PDF e imprima em tamanho real.</li>' +
        '<li>Fotografe cada folha preenchida. O app corrige e separa por turma.</li></ol></div>';
    } else {
      html += '<div class="list">' + provas.map(function (p) {
        var completo = Store.questoesValidas(p).length === p.numQ - p.anuladas.length;
        return '<a class="item" href="#/p/' + p.id + '"><div class="grow"><div class="title">' + esc(p.nome) + '</div>' +
          '<div class="small muted">' + (p.disciplina ? esc(p.disciplina) + ' · ' : '') + p.numQ + ' questões · ' +
          p.resultados.length + ' folha(s) corrigida(s)</div>' +
          (completo ? '' : '<span class="badge warn">gabarito incompleto</span>') + '</div>' + CHEV + '</a>';
      }).join('') + '</div>';
    }
    html += '<div style="height:80px"></div><button class="fab" onclick="location.hash=\'#/nova\'">' + ICON.plus + 'Nova prova</button>';
    $view.innerHTML = html;
  }

  /* =============== criar/editar prova =============== */

  function telaProvaForm(id) {
    var p = id ? Store.prova(id) : null;
    if (id && !p) return go('/');
    if (!rascunho || rascunho._id !== (id || 'nova')) {
      rascunho = p ? JSON.parse(JSON.stringify(p)) : { nome: '', disciplina: '', numQ: 10, gabarito: [], anuladas: [] };
      rascunho._id = id || 'nova';
    }
    setTopo(p ? 'Editar gabarito' : 'Nova prova', p ? '#/p/' + p.id : '#/');
    var d = rascunho;
    var html = '<div class="card">' +
      '<label class="field">Nome da prova<input id="fNome" maxlength="60" placeholder="Ex.: Simulado de Filosofia, 1º bimestre" value="' + esc(d.nome) + '"></label>' +
      '<label class="field">Disciplina (opcional)<input id="fDisc" maxlength="40" placeholder="Ex.: Filosofia" value="' + esc(d.disciplina) + '"></label>' +
      '<div class="field"><span>Número de questões (1 a ' + L.MAX_Q + ')</span><div class="stepper">' +
      '<button type="button" id="menos" aria-label="Menos uma questão">−</button>' +
      '<input id="fNum" type="number" inputmode="numeric" min="1" max="' + L.MAX_Q + '" value="' + d.numQ + '" aria-label="Número de questões">' +
      '<button type="button" id="mais" aria-label="Mais uma questão">+</button></div></div></div>';

    html += '<h3>Gabarito oficial</h3><div class="card"><p class="small muted">Toque na alternativa correta de cada questão. ' +
      '"Anular" faz o app desconsiderar a questão para todos.</p>' +
      '<button class="btn block" id="lerOficial" style="margin:10px 0 6px">' + ICON.camera + 'Ler gabarito de uma folha preenchida</button>' +
      '<div class="answers" id="gradeGab">' + gradeGabarito(d) + '</div></div>';
    html += '<div class="sticky-actions"><button class="btn primary" id="salvarProva">Salvar prova</button></div>';
    $view.innerHTML = html;

    function lerCampos() {
      d.nome = document.getElementById('fNome').value;
      d.disciplina = document.getElementById('fDisc').value;
    }
    function setNum(n) {
      n = Math.max(1, Math.min(L.MAX_Q, parseInt(n, 10) || 1));
      d.numQ = n; document.getElementById('fNum').value = n;
      d.anuladas = d.anuladas.filter(function (q) { return q <= n; });
      document.getElementById('gradeGab').innerHTML = gradeGabarito(d);
    }
    document.getElementById('menos').onclick = function () { setNum(d.numQ - 1); };
    document.getElementById('mais').onclick = function () { setNum(d.numQ + 1); };
    document.getElementById('fNum').onchange = function (e) { setNum(e.target.value); };
    document.getElementById('gradeGab').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var q = +b.dataset.q;
      if (b.dataset.l) d.gabarito[q - 1] = (d.gabarito[q - 1] === b.dataset.l) ? null : b.dataset.l;
      if (b.dataset.anular) {
        var i = d.anuladas.indexOf(q);
        if (i >= 0) d.anuladas.splice(i, 1); else d.anuladas.push(q);
      }
      document.getElementById('gradeGab').innerHTML = gradeGabarito(d);
    };
    document.getElementById('lerOficial').onclick = function () {
      lerCampos();
      lerFoto().then(function (res) {
        if (!res) return;
        var n = 0;
        for (var q = 1; q <= d.numQ; q++) {
          var v = res.answers['q' + q];
          if (v && v !== '*') { d.gabarito[q - 1] = v; n++; }
        }
        telaProvaForm(id);
        var duvidas = res.doubts.filter(function (g) { return /^q\d+$/.test(g) && +g.slice(1) <= d.numQ; });
        toast('Gabarito lido: ' + n + ' de ' + d.numQ + ' questões.' + (duvidas.length ? ' Confira: ' + duvidas.map(function (g) { return g.slice(1); }).join(', ') : ' Confira antes de salvar.'), 5000);
      });
    };
    document.getElementById('salvarProva').onclick = function () {
      lerCampos();
      if (!d.nome.trim()) { toast('Dê um nome para a prova.'); document.getElementById('fNome').focus(); return; }
      var faltam = [];
      for (var q = 1; q <= d.numQ; q++) if (!d.gabarito[q - 1] && d.anuladas.indexOf(q) < 0) faltam.push(q);
      var salvar = function () {
        d.gabarito = d.gabarito.slice(0, d.numQ);
        var dados = { nome: d.nome.trim(), disciplina: d.disciplina.trim(), numQ: d.numQ, gabarito: d.gabarito, anuladas: d.anuladas };
        var alvo;
        if (p) { alvo = Store.prova(p.id); Object.assign(alvo, dados); Store.salvarProva(alvo); }
        else alvo = Store.novaProva(dados);
        rascunho = null;
        toast('Prova salva.');
        go('/p/' + alvo.id);
      };
      if (faltam.length) {
        confirmar('Gabarito incompleto', 'Faltam as questões ' + faltam.join(', ') + '. Elas não vão contar na nota até você completar. Salvar mesmo assim?', 'Salvar')
          .then(function (sim) { if (sim) salvar(); });
      } else salvar();
    };
  }

  function gradeGabarito(d) {
    var html = '';
    for (var q = 1; q <= d.numQ; q++) {
      var an = d.anuladas.indexOf(q) >= 0;
      html += '<div class="arow' + (an ? ' anulada' : '') + '"><span class="qn">' + q + '</span><div class="opts">' +
        L.LETTERS.map(function (l) {
          var sel = d.gabarito[q - 1] === l;
          return '<button type="button" class="opt' + (sel ? ' sel' : '') + '" data-q="' + q + '" data-l="' + l + '" aria-pressed="' + sel + '" aria-label="Questão ' + q + ' letra ' + l + '">' + l + '</button>';
        }).join('') + '</div><div class="extra"><button type="button" class="tog' + (an ? ' on' : '') + '" data-q="' + q + '" data-anular="1" aria-pressed="' + an + '">' + (an ? 'Anulada' : 'Anular') + '</button></div></div>';
    }
    return html;
  }

  /* =============== prova =============== */

  function telaProva(id) {
    var p = Store.prova(id); if (!p) return go('/');
    setTopo(p.nome, '#/');
    var validas = Store.questoesValidas(p).length;
    var faltam = p.numQ - p.anuladas.length - validas;
    var html = '<div class="card"><h2>' + esc(p.nome) + '</h2><p class="muted small">' +
      (p.disciplina ? esc(p.disciplina) + ' · ' : '') + p.numQ + ' questões' +
      (p.anuladas.length ? ' · ' + p.anuladas.length + ' anulada(s)' : '') + '</p>' +
      (faltam > 0 ? '<div class="alert">Faltam ' + faltam + ' questão(ões) no gabarito oficial. <a href="#/p/' + p.id + '/editar">Completar</a></div>' : '') +
      '<button class="btn primary big block" id="escanear" style="margin-top:14px">' + ICON.camera + 'Escanear folha de aluno</button></div>';
    html += '<div class="list" style="margin-top:12px">' +
      '<a class="item" href="#/p/' + p.id + '/resultados"><div class="grow"><div class="title">Resultados por turma</div><div class="small muted">' + p.resultados.length + ' folha(s) corrigida(s)</div></div>' + CHEV + '</a>' +
      '<a class="item" href="#/p/' + p.id + '/relatorios"><div class="grow"><div class="title">Relatórios</div><div class="small muted">Média, acerto por questão, mais erradas, ranking</div></div>' + CHEV + '</a>' +
      '<button class="item" id="imprimir"><div class="grow"><div class="title">Gerar folhas para imprimir</div><div class="small muted">PDF com o nome da escola e da prova</div></div>' + CHEV + '</button>' +
      '<a class="item" href="#/p/' + p.id + '/editar"><div class="grow"><div class="title">Editar gabarito e questões</div></div>' + CHEV + '</a>' +
      '</div><button class="btn danger block" id="excluir" style="margin-top:24px">Excluir prova</button>';
    $view.innerHTML = html;

    document.getElementById('escanear').onclick = function () { escanear(p); };
    document.getElementById('imprimir').onclick = function () { gerarFolhas(p); };
    document.getElementById('excluir').onclick = function () {
      confirmar('Excluir prova?', 'A prova "' + p.nome + '" e as ' + p.resultados.length + ' folhas corrigidas serão apagadas deste celular.', 'Excluir', true)
        .then(function (sim) { if (sim) { Store.excluirProva(p.id); toast('Prova excluída.'); go('/'); } });
    };
  }

  /* =============== câmera e leitura =============== */

  function carregarImagem(src) {
    return new Promise(function (ok, erro) {
      var img = new Image();
      img.onload = function () { ok(img); };
      img.onerror = function () { erro(new Error('Não consegui abrir a foto.')); };
      img.src = src;
    });
  }

  // Tira a foto e roda a leitura. Devolve o resultado do OMR (ou null se cancelado/erro).
  function lerFoto() {
    return Plat.foto(document.getElementById('inputFoto')).then(function (dataUrl) {
      carregando(true, 'Lendo a folha…');
      return carregarImagem(dataUrl);
    }).then(function (img) {
      return new Promise(function (ok) { setTimeout(function () { ok(img); }, 30); }); // deixa a tela de "lendo" aparecer
    }).then(function (img) {
      var esc2 = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
      var w = Math.round(img.naturalWidth * esc2), h = Math.round(img.naturalHeight * esc2);
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      var gray = OMR.toGray(ctx.getImageData(0, 0, w, h).data, w, h);
      var res = OMR.read(gray, w, h);
      if (res.ok) res.preview = desenharConferencia(cv, res);
      carregando(false);
      if (!res.ok) {
        return dialogo('<h2>Não consegui ler</h2><p>' + esc(res.error) + '</p><p class="small muted">Dicas: folha inteira na foto, sem dobras, boa luz, celular paralelo à folha.</p>',
          [{ texto: 'Fechar', valor: 'fechar' }, { texto: 'Tentar de novo', valor: 'de-novo', cls: 'primary' }])
          .then(function (v) { return v === 'de-novo' ? lerFoto() : null; });
      }
      return res;
    }).catch(function (e) {
      carregando(false);
      var msg = String(e && e.message || e);
      if (/cancel/i.test(msg)) return null;
      aviso('Erro', msg);
      return null;
    });
  }

  // Miniatura da foto com as marcações que o app leu (para o professor conferir)
  function desenharConferencia(cv, res) {
    var s = Math.min(1, 1100 / Math.max(cv.width, cv.height));
    var c2 = document.createElement('canvas');
    c2.width = Math.round(cv.width * s); c2.height = Math.round(cv.height * s);
    var ctx = c2.getContext('2d');
    ctx.drawImage(cv, 0, 0, c2.width, c2.height);
    ctx.lineWidth = Math.max(2, c2.width / 300);
    L.order.forEach(function (g) {
      var v = res.answers[g], duv = res.doubts.indexOf(g) >= 0;
      L.groups[g].forEach(function (b, i) {
        var marcado = v && (v === '*' ? res.scores[g][i] >= 0.25 : v === b.value);
        if (!marcado && !duv) return;
        var pt = res.points[g][i];
        ctx.strokeStyle = duv ? '#e0a100' : '#1b9e5a';
        ctx.beginPath(); ctx.arc(pt[0] * s, pt[1] * s, c2.width / 70, 0, Math.PI * 2); ctx.stroke();
      });
    });
    return c2.toDataURL('image/jpeg', 0.8);
  }

  function escanear(p) {
    lerFoto().then(function (res) {
      if (!res) return;
      var a = res.answers, respostas = [];
      for (var q = 1; q <= L.MAX_Q; q++) respostas.push(q <= p.numQ ? a['q' + q] : null);
      pendente = {
        provaId: p.id,
        r: {
          serie: valido(a.serie), turma: valido(a.turma), turno: valido(a.turno),
          numero: res.numero, respostas: respostas
        },
        doubts: res.doubts.filter(function (g) { return !/^q\d+$/.test(g) || +g.slice(1) <= p.numQ; }),
        preview: res.preview
      };
      // grupos de identificação vazios ou duplos também precisam de atenção
      ['serie', 'turma', 'turno'].forEach(function (g) { if (!pendente.r[g] && pendente.doubts.indexOf(g) < 0) pendente.doubts.push(g); });
      if (pendente.r.numero == null) pendente.doubts.push('numero');
      if (location.hash === '#/p/' + p.id + '/revisao') render(); else go('/p/' + p.id + '/revisao');
    });
  }
  function valido(v) { return v && v !== '*' ? v : null; }

  /* =============== conferir leitura / editar folha =============== */

  function telaRevisao(provaId, resultadoId) {
    var p = Store.prova(provaId); if (!p) return go('/');
    var r, doubts = [], preview = null, nova = !resultadoId;
    if (nova) {
      if (!pendente || pendente.provaId !== provaId) return go('/p/' + provaId);
      r = pendente.r; doubts = pendente.doubts; preview = pendente.preview;
      setTopo('Conferir leitura', '#/p/' + p.id);
    } else {
      var orig = p.resultados.filter(function (x) { return x.id === resultadoId; })[0];
      if (!orig) return go('/p/' + provaId + '/resultados');
      r = JSON.parse(JSON.stringify(orig));
      setTopo('Folha do nº ' + (r.numero == null ? '?' : r.numero), '#/p/' + p.id + '/resultados');
    }

    function placar() {
      var c = Store.corrigir(p, r);
      return '<div class="score"><span class="big">' + c.acertos + '</span><span class="muted">de ' + c.total + ' acertos · ' + R.pct(c.pct) + '</span></div>';
    }
    function opcoes(lista, nomes, atual) {
      return '<option value="">Escolha…</option>' + lista.map(function (v, i) {
        return '<option value="' + v + '"' + (atual === v ? ' selected' : '') + '>' + esc(nomes ? nomes[i] : v) + '</option>';
      }).join('');
    }
    function cls(g) { return doubts.indexOf(g) >= 0 ? ' doubt' : ''; }

    var duvQ = doubts.filter(function (g) { return /^q\d+$/.test(g); }).map(function (g) { return +g.slice(1); });
    var html = '<div class="card" id="placar">' + placar() + '</div>';
    if (duvQ.length) html += '<div class="alert">Confira as questões ' + duvQ.join(', ') + ' (marcação fraca ou dupla). Elas estão destacadas.</div>';

    html += '<h3>Aluno</h3><div class="card"><div class="idgrid">' +
      '<label class="field' + cls('serie') + '">Ano/Série<select id="iSerie">' + opcoes(L.SERIES, L.SERIES_NOME, r.serie) + '</select></label>' +
      '<label class="field' + cls('turma') + '">Turma<select id="iTurma">' + opcoes(L.TURMAS, null, r.turma) + '</select></label>' +
      '<label class="field' + cls('turno') + '">Turno<select id="iTurno">' + opcoes(L.TURNOS, L.TURNOS_NOME, r.turno) + '</select></label>' +
      '<label class="field' + cls('numero') + cls('dezena') + '">Nº de chamada<input id="iNum" type="number" inputmode="numeric" min="1" max="99" value="' + (r.numero == null ? '' : r.numero) + '"></label>' +
      '</div>' + (preview ? '<details><summary>Ver foto com as marcações lidas</summary><img class="photo" alt="Foto da folha com as marcações lidas" src="' + preview + '"></details>' : '') + '</div>';

    html += '<h3>Respostas</h3><div class="card"><p class="small muted">Verde: certa. Laranja: errada (o contorno verde mostra o gabarito). Toque para corrigir uma leitura.</p><div class="answers" id="gradeResp"></div></div>';
    html += '<div class="sticky-actions">' +
      (nova ? '<button class="btn" id="descartar">Descartar</button><button class="btn primary" id="salvarProx">Salvar e próxima</button><button class="btn" id="salvar">Salvar</button>'
            : '<button class="btn danger" id="apagar">Apagar</button><button class="btn primary" id="salvar">Salvar alterações</button>') +
      '</div>';
    $view.innerHTML = html;

    function desenharGrade() {
      var h = '';
      for (var q = 1; q <= p.numQ; q++) {
        var v = r.respostas[q - 1], g = p.gabarito[q - 1], an = p.anuladas.indexOf(q) >= 0;
        var extra = an ? '<span class="badge">anulada</span>' : v === '*' ? '<span class="badge err">dupla</span>' : !v ? '<span class="badge warn">branco</span>' : '';
        h += '<div class="arow' + (an ? ' anulada' : '') + (doubts.indexOf('q' + q) >= 0 ? ' doubt' : '') + '"><span class="qn">' + q + '</span><div class="opts">' +
          L.LETTERS.map(function (l) {
            var sel = v === l, c = 'opt';
            if (sel) c += ' sel' + (g && !an ? (l === g ? ' ok' : ' err') : '');
            if (!sel && g === l && !an && v !== g) c += ' gab';
            return '<button type="button" class="' + c + '" data-q="' + q + '" data-l="' + l + '" aria-pressed="' + sel + '" aria-label="Questão ' + q + ' letra ' + l + '">' + l + '</button>';
          }).join('') + '</div><div class="extra">' + extra + '</div></div>';
      }
      document.getElementById('gradeResp').innerHTML = h;
      document.getElementById('placar').innerHTML = placar();
    }
    desenharGrade();
    document.getElementById('gradeResp').onclick = function (e) {
      var b = e.target.closest('button[data-l]'); if (!b) return;
      var q = +b.dataset.q;
      r.respostas[q - 1] = r.respostas[q - 1] === b.dataset.l ? null : b.dataset.l;
      desenharGrade();
    };

    function lerId() {
      r.serie = document.getElementById('iSerie').value || null;
      r.turma = document.getElementById('iTurma').value || null;
      r.turno = document.getElementById('iTurno').value || null;
      var n = parseInt(document.getElementById('iNum').value, 10);
      r.numero = isNaN(n) ? null : n;
    }
    function salvar(proxima) {
      lerId();
      var falta = [];
      if (!r.serie) falta.push('ano/série'); if (!r.turma) falta.push('turma');
      if (!r.turno) falta.push('turno'); if (r.numero == null) falta.push('nº de chamada');
      if (falta.length) { toast('Preencha: ' + falta.join(', ') + '.', 3500); return; }
      var dup = Store.acharDuplicado(p, r);
      var seguir = dup ? confirmar('Folha repetida', 'Já existe o nº ' + r.numero + ' da ' + Store.turmaNome(r) + '. Substituir pela nova?', 'Substituir')
                       : Promise.resolve(true);
      seguir.then(function (ok) {
        if (!ok) return;
        if (dup) Store.excluirResultado(p, dup.id);
        if (!Store.salvarResultado(p, r)) { aviso('Memória cheia', 'Não consegui salvar. Faça uma cópia de segurança e apague provas antigas.'); return; }
        var c = Store.corrigir(p, r);
        toast('Salvo: nº ' + r.numero + ' · ' + c.acertos + '/' + c.total);
        pendente = null;
        if (proxima) escanear(p); else go(nova ? '/p/' + p.id + '/resultados' : '/p/' + p.id + '/resultados');
      });
    }
    document.getElementById('salvar').onclick = function () { salvar(false); };
    if (nova) {
      document.getElementById('salvarProx').onclick = function () { salvar(true); };
      document.getElementById('descartar').onclick = function () { pendente = null; go('/p/' + p.id); };
    } else {
      document.getElementById('apagar').onclick = function () {
        confirmar('Apagar folha?', 'O resultado do nº ' + r.numero + ' será apagado.', 'Apagar', true).then(function (sim) {
          if (sim) { Store.excluirResultado(p, r.id); toast('Folha apagada.'); go('/p/' + p.id + '/resultados'); }
        });
      };
    }
  }

  /* =============== resultados por turma =============== */

  function telaResultados(id) {
    var p = Store.prova(id); if (!p) return go('/');
    setTopo('Resultados', '#/p/' + p.id);
    var blocos = Store.porTurma(p);
    if (!blocos.length) {
      $view.innerHTML = '<div class="card empty"><h2>Nenhuma folha corrigida</h2><p class="muted">Escaneie as folhas dos alunos e elas aparecem aqui, separadas por turma.</p>' +
        '<button class="btn primary block" id="esc" style="margin-top:14px">' + ICON.camera + 'Escanear folha</button></div>';
      document.getElementById('esc').onclick = function () { escanear(p); };
      return;
    }
    var html = '<div class="card"><h2>' + esc(p.nome) + '</h2><p class="small muted">' + p.resultados.length + ' folha(s) em ' + blocos.length + ' turma(s)</p>' +
      '<div class="row" style="margin-top:12px">' +
      '<button class="btn primary" data-exp="zap" data-t="">' + ICON.share + 'Enviar (WhatsApp)</button>' +
      '<button class="btn" data-exp="pdf" data-t="">' + ICON.down + 'Baixar PDF</button>' +
      '<button class="btn" data-exp="xlsx" data-t="">' + ICON.down + 'Baixar planilha</button></div></div>';
    blocos.forEach(function (b) {
      var rel = R.calcular(p, b.alunos);
      html += '<details class="card" open><summary><div class="turma-head" style="width:100%"><div class="grow"><div class="title" style="font-weight:700">' + esc(b.nome) + '</div>' +
        '<div class="small muted">' + rel.n + ' aluno(s) · média ' + R.num(rel.media) + '/' + rel.total + ' · ' + R.pct(rel.pctMedio) + '</div></div></div></summary>' +
        '<table class="res"><thead><tr><th>Nº</th><th>Acertos</th><th>%</th></tr></thead><tbody>' +
        b.alunos.map(function (r) {
          var c = Store.corrigir(p, r), link = '#/p/' + p.id + '/r/' + r.id;
          return '<tr><td><a href="' + link + '"><b>' + (r.numero == null ? '?' : r.numero) + '</b></a></td><td><a href="' + link + '">' + c.acertos + ' / ' + c.total + '</a></td><td><a href="' + link + '">' + R.pct(c.pct) + '</a></td></tr>';
        }).join('') + '</tbody></table>' +
        '<div class="row" style="margin-top:12px"><button class="btn" data-exp="zap" data-t="' + esc(b.chave) + '">' + ICON.share + 'Enviar esta turma</button></div></details>';
    });
    $view.innerHTML = html;
    $view.onclick = function (e) {
      var b = e.target.closest('button[data-exp]'); if (!b) return;
      exportar(p, b.dataset.exp, b.dataset.t);
    };
  }

  function exportar(p, tipo, turmaChave) {
    var blocos = Store.porTurma(p).filter(function (b) { return !turmaChave || b.chave === turmaChave; });
    if (!blocos.length) { toast('Nada para exportar ainda.'); return; }
    carregando(true, 'Gerando arquivo…');
    setTimeout(function () {
      var arq;
      try { arq = tipo === 'xlsx' ? X.planilha(p, blocos) : X.pdfResultados(p, blocos); }
      catch (e) { carregando(false); aviso('Erro ao gerar', String(e.message || e)); return; }
      carregando(false);
      var acao = tipo === 'zap'
        ? Plat.compartilhar(arq.blob, arq.nome, 'Resultados: ' + p.nome)
        : Plat.baixar(arq.blob, arq.nome);
      acao.then(function (msg) { if (typeof msg === 'string') toast(msg, 3500); })
        .catch(function (e) { if (!/cancel/i.test(String(e && e.message || e))) aviso('Não deu certo', String(e.message || e)); });
    }, 30);
  }

  /* =============== relatórios =============== */

  function telaRelatorios(id) {
    var p = Store.prova(id); if (!p) return go('/');
    setTopo('Relatórios', '#/p/' + p.id);
    var blocos = Store.porTurma(p);
    if (!blocos.length) {
      $view.innerHTML = '<div class="card empty"><h2>Sem dados ainda</h2><p class="muted">Os relatórios aparecem depois das primeiras folhas corrigidas.</p></div>';
      return;
    }
    if (relTurma && !blocos.some(function (b) { return b.chave === relTurma; })) relTurma = '';
    var alunos = [];
    blocos.forEach(function (b) { if (!relTurma || b.chave === relTurma) alunos = alunos.concat(b.alunos); });
    var rel = R.calcular(p, alunos);

    var html = '<div class="chips" role="tablist">' +
      '<button class="chip' + (!relTurma ? ' on' : '') + '" data-t="">Todas as turmas</button>' +
      blocos.map(function (b) { return '<button class="chip' + (relTurma === b.chave ? ' on' : '') + '" data-t="' + esc(b.chave) + '">' + esc(b.nome) + '</button>'; }).join('') +
      '</div>';
    html += '<div class="tiles" style="margin-top:10px">' +
      tile(rel.n, 'aluno(s)') + tile(R.num(rel.media) + '<span class="muted" style="font-size:1rem">/' + rel.total + '</span>', 'média de acertos') +
      tile(R.pct(rel.pctMedio), 'acerto médio') + tile(rel.maior + ' / ' + rel.menor, 'maior / menor nota') + '</div>';

    html += '<h3>Questões mais erradas</h3><div class="card"><div class="bars">' +
      (rel.maisErradas.length ? '' : '<p class="muted">Nenhuma questão com erro.</p>') +
      rel.maisErradas.map(function (x) {
        return barra(x) + '<div class="bar-note">Gabarito ' + x.gab + (x.erradaTop ? ' · mais marcada errada: ' + x.erradaTop + ' (' + R.pct(x.erradaTopPct) + ')' : '') +
          (x.brancos ? ' · ' + x.brancos + ' em branco' : '') + '</div>';
      }).join('') + '</div></div>';

    html += '<h3>Percentual de acerto por questão</h3><div class="card"><div class="bars">' + rel.porQuestao.map(barra).join('') + '</div></div>';

    html += '<h3>Ranking dos alunos</h3><div class="card">' + rel.ranking.map(function (x) {
      return '<div class="rank"><span class="pos">' + x.posicao + 'º</span><span>Nº ' + (x.numero == null ? '?' : x.numero) +
        (relTurma ? '' : ' <span class="small muted">· ' + esc(x.turma) + '</span>') + '</span><span class="num"><b>' + x.acertos + '</b>/' + x.total + ' · ' + R.pct(x.pct) + '</span></div>';
    }).join('') + '</div>';

    html += '<div class="row" style="margin-top:16px"><button class="btn primary" data-exp="zap">' + ICON.share + 'Enviar relatório</button>' +
      '<button class="btn" data-exp="pdf">' + ICON.down + 'Baixar PDF</button></div>';
    $view.innerHTML = html;
    $view.onclick = function (e) {
      var c = e.target.closest('.chip');
      if (c) { relTurma = c.dataset.t; telaRelatorios(id); return; }
      var b = e.target.closest('button[data-exp]');
      if (b) exportar(p, b.dataset.exp, relTurma);
    };
  }
  function tile(v, l) { return '<div class="tile"><div class="v">' + v + '</div><div class="l">' + l + '</div></div>'; }
  function barra(x) {
    var c = x.pct < 0.4 ? 'low' : x.pct < 0.7 ? 'mid' : '';
    return '<div class="bar"><span class="q">Q' + x.q + '</span><div class="track" role="img" aria-label="' + R.pct(x.pct) + ' de acerto"><div class="fill ' + c + '" style="width:' + Math.round(x.pct * 100) + '%"></div></div><span class="p">' + R.pct(x.pct) + '</span></div>';
  }

  /* =============== folhas para imprimir =============== */

  function gerarFolhas(p) {
    var escola = Store.getEscola();
    dialogo('<h2>Folhas para imprimir</h2>' +
      (escola ? '' : '<div class="alert">O nome da escola ainda não foi definido (menu ⋮ › Nome da escola).</div>') +
      '<label class="field" style="margin-top:12px">Quantidade de folhas no PDF<input id="dCopias" type="number" min="1" max="60" value="1" inputmode="numeric"></label>' +
      '<p class="small muted">Dica: gere 1 folha e tire cópias. Imprima em <b>tamanho real (100%)</b>, sem "ajustar à página".</p>',
      [{ texto: 'Cancelar', valor: 'x' }, { texto: 'Baixar', valor: 'baixar' }, { texto: 'Enviar', valor: 'enviar', cls: 'primary' }])
      .then(function (v) {
        if (v !== 'baixar' && v !== 'enviar') return;
        var copias = parseInt(($dlg.querySelector('#dCopias') || {}).value, 10) || 1;
        var arq = X.folha({ escola: escola, prova: p ? p.nome : '', numQuestoes: p ? p.numQ : L.MAX_Q, copias: copias });
        (v === 'enviar' ? Plat.compartilhar(arq.blob, arq.nome, 'Folha de respostas') : Plat.baixar(arq.blob, arq.nome))
          .then(function (msg) { if (typeof msg === 'string') toast(msg, 3500); })
          .catch(function (e) { if (!/cancel/i.test(String(e && e.message || e))) aviso('Não deu certo', String(e.message || e)); });
      });
  }

  /* =============== menu, escola, backup, sobre =============== */

  function editarEscola() {
    dialogo('<h2>Nome da escola</h2><label class="field">Aparece no topo da folha de respostas e dos relatórios' +
      '<input id="dEscola" maxlength="70" value="' + esc(Store.getEscola()) + '" placeholder="Ex.: E.E. Monsenhor Joaquim Honório"></label>',
      [{ texto: 'Cancelar', valor: 'x' }, { texto: 'Salvar', valor: 'ok', cls: 'primary' }])
      .then(function (v) {
        if (v === 'ok') { Store.setEscola($dlg.querySelector('#dEscola').value); toast('Escola salva.'); render(); }
      });
  }

  function backup() {
    var blob = new Blob([Store.exportar()], { type: 'application/json' });
    var d = new Date(), nome = 'backup-corretor-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json';
    Plat.compartilhar(blob, nome, 'Cópia de segurança do Corretor de Gabaritos')
      .then(function (msg) { if (typeof msg === 'string') toast('Cópia salva.'); })
      .catch(function () {});
  }
  function restaurar() {
    var inp = document.getElementById('inputBackup');
    inp.value = '';
    inp.onchange = function () {
      var f = inp.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        confirmar('Restaurar cópia?', 'Os dados atuais deste celular serão trocados pelos da cópia.', 'Restaurar', true).then(function (sim) {
          if (!sim) return;
          try { Store.importar(fr.result); toast('Cópia restaurada.'); go('/'); render(); }
          catch (e) { aviso('Arquivo inválido', 'Esse arquivo não é uma cópia do Corretor de Gabaritos.'); }
        });
      };
      fr.readAsText(f);
    };
    inp.click();
  }

  function telaSobre() {
    setTopo('Sobre', '#/');
    $view.innerHTML = '<div class="card"><h2>Corretor de Gabaritos</h2><p class="muted small">Versão ' + VERSAO_APP + '</p>' +
      '<p style="margin-top:12px">Criado pelo <b>Prof. Artur</b>, professor de Filosofia da E.E. Monsenhor Joaquim Honório, Guamaré/RN.</p>' +
      '<p style="margin-top:10px">App gratuito, feito para circular entre professores. Funciona sem internet: as fotos são lidas no próprio celular e os dados ficam guardados só nele. O nome dos alunos não é registrado, apenas a turma e o número de chamada.</p>' +
      '<h3>Para a leitura sair perfeita</h3><ul class="small" style="padding-left:18px;margin:0">' +
      '<li>Use a folha gerada pelo app, impressa em tamanho real (100%).</li>' +
      '<li>Os 4 quadrados pretos precisam aparecer na foto.</li>' +
      '<li>Boa luz, sem sombra forte, celular paralelo à folha.</li>' +
      '<li>Bolinha toda preenchida, com caneta azul ou preta.</li></ul>' +
      '<h3>Seus dados</h3><p class="small">Antes de trocar de celular, use o menu ⋮ › Fazer cópia de segurança.</p></div>';
  }

  document.getElementById('btnMenu').onclick = function (e) { e.stopPropagation(); $menu.hidden = !$menu.hidden; };
  document.addEventListener('click', function (e) { if (!$menu.hidden && !$menu.contains(e.target)) $menu.hidden = true; });
  $menu.onclick = function (e) {
    var b = e.target.closest('button'); if (!b) return;
    $menu.hidden = true;
    if (b.dataset.go) go(b.dataset.go.replace(/^#/, ''));
    var a = b.dataset.acao;
    if (a === 'folhaBranca') gerarFolhas(null);
    if (a === 'escola') editarEscola();
    if (a === 'backup') backup();
    if (a === 'restaurar') restaurar();
  };
  $view.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao="escola"]');
    if (b) editarEscola();
  });

  Store.load();
  render();
})();
