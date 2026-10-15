/*
 * Corretor de Gabaritos
 * Criado pelo Prof. Artur, professor de Filosofia da
 * E.E. Monsenhor Joaquim Honório, Guamaré/RN.
 * App gratuito, distribuído entre professores.
 *
 * layout.js
 * Geometria da folha de respostas em milímetros (A4: 210 x 297).
 * Este arquivo é a "régua" única do app: a folha impressa (sheet-pdf.js)
 * e a leitura da foto (omr.js) usam exatamente as mesmas posições.
 * Se mudar algo aqui, as folhas antigas deixam de ser lidas corretamente.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GabLayout = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGE = { w: 210, h: 297 };
  var BUBBLE_R = 2.4;          // raio da bolinha impressa
  var MAX_Q = 50;              // máximo de questões da folha (Prof. Artur definiu até 50)
  var LETTERS = ['A', 'B', 'C', 'D', 'E'];

  // Quadrados pretos dos cantos (10 mm). O app os procura na foto para
  // "desentortar" a imagem. Guardamos o canto superior esquerdo e o centro.
  var MARKER = 10;
  var markers = {
    tl: { x: 8, y: 8 },
    tr: { x: 192, y: 8 },
    bl: { x: 8, y: 279 },
    br: { x: 192, y: 279 }
  };
  Object.keys(markers).forEach(function (k) {
    markers[k].cx = markers[k].x + MARKER / 2;
    markers[k].cy = markers[k].y + MARKER / 2;
  });

  // Barra de orientação: só existe no topo, ao lado do canto esquerdo.
  // Serve para o app saber se a folha foi fotografada de cabeça para baixo.
  var orientBar = { x: 24, y: 10, w: 30, h: 4 };

  // Opções de identificação (marcadas pelo aluno).
  var SERIES = ['6º', '7º', '8º', '9º', '1ª', '2ª', '3ª'];
  var SERIES_NOME = ['6º ano', '7º ano', '8º ano', '9º ano', '1ª série', '2ª série', '3ª série'];
  var TURMAS = ['A', 'B', 'C', 'D', 'E'];
  var TURNOS = ['M', 'T', 'N'];
  var TURNOS_NOME = ['Manhã', 'Tarde', 'Noite'];
  var DIGITOS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Caixas desenhadas na folha
  var boxes = {
    turma: { x: 16, y: 55, w: 96, h: 44 },
    chamada: { x: 116, y: 55, w: 78, h: 44 },
    questoes: { x: 14, y: 111, w: 182, h: 160 }
  };

  var groups = {};   // nome do grupo -> lista de bolinhas {value, x, y}
  var order = [];    // ordem dos grupos

  function addGroup(name, values, x0, y, dx, labels) {
    groups[name] = values.map(function (v, i) {
      return { value: v, label: labels ? labels[i] : v, x: x0 + i * dx, y: y };
    });
    order.push(name);
  }

  // Bloco TURMA
  addGroup('serie', SERIES, 44, 68, 9.2);
  addGroup('turma', TURMAS, 44, 79.5, 9.2);
  addGroup('turno', TURNOS, 44, 91, 18.4, TURNOS_NOME);

  // Bloco Nº DE CHAMADA
  addGroup('dezena', DIGITOS, 134, 71, 6.2);
  addGroup('unidade', DIGITOS, 134, 86, 6.2);

  // Questões: 4 colunas (13, 13, 13, 11)
  var COLS = [[1, 13], [14, 26], [27, 39], [40, 50]];
  var Q_COL_X = 16, Q_COL_PITCH = 45.5, Q_FIRST_DX = 10, Q_DX = 6.6;
  var Q_HEAD_Y = 118, Q_Y0 = 125, Q_DY = 11.5;
  var questionColumns = COLS.map(function (range, c) {
    var colX = Q_COL_X + c * Q_COL_PITCH;
    return { first: range[0], last: range[1], numX: colX + 5.5, bubbleX0: colX + Q_FIRST_DX };
  });
  questionColumns.forEach(function (col) {
    for (var q = col.first; q <= col.last; q++) {
      var row = q - col.first;
      addGroup('q' + q, LETTERS, col.bubbleX0, Q_Y0 + row * Q_DY, Q_DX);
    }
  });

  return {
    VERSION: 2,
    PAGE: PAGE,
    BUBBLE_R: BUBBLE_R,
    MAX_Q: MAX_Q,
    LETTERS: LETTERS,
    MARKER: MARKER,
    markers: markers,
    orientBar: orientBar,
    SERIES: SERIES, SERIES_NOME: SERIES_NOME,
    TURMAS: TURMAS,
    TURNOS: TURNOS, TURNOS_NOME: TURNOS_NOME,
    DIGITOS: DIGITOS,
    boxes: boxes,
    groups: groups,
    order: order,
    questionColumns: questionColumns,
    Q_HEAD_Y: Q_HEAD_Y,
    Q_DX: Q_DX
  };
});
