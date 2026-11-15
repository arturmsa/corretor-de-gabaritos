// Gera um exemplo de prova com o mini gabarito colado (página 1: faixa horizontal; página 2: quadrado).
// Também grava a posição do bloco em cada página, usada pelo teste de leitura (synth_mini.py).
// Uso: node test/exemplo.js [saida.pdf] [numQ]
const { jsPDF } = require('jspdf');
const M = require('../www/js/mini.js');
const fs = require('fs');
const out = process.argv[2] || __dirname + '/exemplo-prova.pdf';
const numQ = parseInt(process.argv[3] || '10', 10);

const QUESTOES = [
  ['Para Sócrates, o ponto de partida do conhecimento é:', ['a certeza dos sentidos', 'o reconhecimento da própria ignorância', 'a tradição dos antigos', 'a opinião da maioria', 'a revelação divina']],
  ['A alegoria da caverna, de Platão, representa principalmente:', ['uma crítica à arquitetura grega', 'a passagem da opinião ao conhecimento', 'a defesa da vida no campo', 'a origem da democracia', 'o elogio da escuridão']],
  ['Em Aristóteles, a felicidade (eudaimonia) está ligada:', ['ao acúmulo de riquezas', 'à vida conforme a virtude', 'à ausência de pensamento', 'ao prazer imediato', 'à obediência cega']],
  ['O "penso, logo existo" é uma formulação de:', ['Hume', 'Kant', 'Descartes', 'Nietzsche', 'Sartre']],
  ['Para os empiristas, a principal fonte do conhecimento é:', ['a razão pura', 'a experiência', 'a fé', 'a intuição mística', 'o acaso']],
  ['O imperativo categórico de Kant manda agir segundo:', ['o interesse pessoal', 'uma regra que possa valer para todos', 'a vontade do governante', 'as consequências mais lucrativas', 'o costume local']],
  ['Na filosofia política de Hobbes, o Estado surge para:', ['abolir as leis', 'garantir a paz e a segurança', 'eliminar a propriedade', 'restaurar a monarquia divina', 'proibir contratos']],
  ['A expressão "a existência precede a essência" é de:', ['Sartre', 'Tomás de Aquino', 'Platão', 'Locke', 'Pitágoras']],
  ['Os pré-socráticos buscavam sobretudo:', ['a arché, o princípio de todas as coisas', 'regras de etiqueta', 'a fundação de cidades', 'provas matemáticas de Deus', 'a história de Roma']],
  ['Para Pierre Hadot, a filosofia antiga era antes de tudo:', ['um conjunto de provas', 'um modo de vida', 'um passatempo da elite', 'uma ciência exata', 'uma religião oficial']]
];

function cabecalho(doc, titulo) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text('E.E. MONSENHOR JOAQUIM HONÓRIO · GUAMARÉ/RN', 105, 16, { align: 'center' });
  doc.setFontSize(14); doc.text(titulo, 105, 24, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text('Professor: Artur', 15, 32); doc.text('Data: ___/___/______', 195, 32, { align: 'right' });
  doc.text('Aluno(a): ______________________________________________________________', 15, 39);
  doc.setLineWidth(0.4); doc.line(15, 43, 195, 43);
}

function questoes(doc, ini, fim, x, y, largura) {
  for (let i = ini; i < fim && i < QUESTOES.length; i++) {
    const [enun, alts] = QUESTOES[i];
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
    const linhas = doc.splitTextToSize((i + 1) + '. ' + enun, largura);
    doc.text(linhas, x, y); y += linhas.length * 4.6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    alts.forEach((a, k) => { doc.text('(' + 'ABCDE'[k] + ') ' + a, x + 3, y); y += 4.4; });
    y += 3.2;
  }
  return y;
}

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const pos = [];

// Página 1: faixa horizontal logo abaixo do cabeçalho
cabecalho(doc, 'Avaliação de Filosofia · 1º bimestre');
const LH = M.layout('mini-h', numQ);
const oxH = (210 - LH.PAGE.w) / 2, oyH = 49;
M.desenhar(LH, M.penPDF(doc, oxH, oyH));
pos.push({ formato: 'mini-h', ox: oxH, oy: oyH, w: LH.PAGE.w, h: LH.PAGE.h });
doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(90);
doc.text('Marque suas respostas no gabarito acima. Só ele será corrigido.', 105, oyH + LH.PAGE.h + 6, { align: 'center' });
doc.setTextColor(0);
questoes(doc, 0, 5, 15, oyH + LH.PAGE.h + 15, 180);

// Página 2: questões à esquerda e gabarito quadrado no canto inferior direito
doc.addPage();
cabecalho(doc, 'Avaliação de Filosofia · 1º bimestre (continuação)');
const LQ = M.layout('mini-q', numQ);
const oxQ = 195 - LQ.PAGE.w, oyQ = 51;
doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(90);
doc.text('Marque suas respostas no gabarito ao lado.', 15, 51); doc.setTextColor(0);
let y = questoes(doc, 5, 7, 15, 59, 195 - LQ.PAGE.w - 22);
questoes(doc, 7, 10, 15, Math.max(y, oyQ + LQ.PAGE.h + 8), 180);
M.desenhar(LQ, M.penPDF(doc, oxQ, oyQ));
pos.push({ formato: 'mini-q', ox: oxQ, oy: oyQ, w: LQ.PAGE.w, h: LQ.PAGE.h });

fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
fs.writeFileSync(out.replace(/\.pdf$/, '.json'), JSON.stringify({ numQ, pos, layouts: { 'mini-h': LH, 'mini-q': LQ } }));
console.log('ok', out, LH.PAGE, LQ.PAGE);
