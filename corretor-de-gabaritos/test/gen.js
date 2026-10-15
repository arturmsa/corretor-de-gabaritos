// Gera a folha em PDF para teste
const { jsPDF } = require('jspdf');
const S = require('../www/js/sheet-pdf.js');
const fs = require('fs');
const doc = S.build(jsPDF, { escola: 'E.E. Monsenhor Joaquim Honório', prova: 'Simulado de Filosofia', numQuestoes: 30 });
fs.writeFileSync(__dirname + '/folha.pdf', Buffer.from(doc.output('arraybuffer')));
console.log('ok');
