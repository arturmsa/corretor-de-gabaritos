// Roda o leitor em todas as fotos simuladas e compara com o esperado
const fs = require('fs'); const OMR = require('../www/js/omr.js');
let totQ = 0, errQ = 0, idErr = 0, fails = 0, doubtsN = 0;
const files = fs.readdirSync('.').filter(f => /^foto_\d+\.json$/.test(f)).sort((a,b)=>parseInt(a.slice(5))-parseInt(b.slice(5)));
for (const f of files) {
  const meta = JSON.parse(fs.readFileSync(f)); const raw = fs.readFileSync(f.replace('.json', '.raw'));
  const t0 = Date.now(); const r = OMR.read(new Uint8ClampedArray(raw), meta.w, meta.h); const ms = Date.now() - t0;
  if (!r.ok) { fails++; console.log(f, 'FALHOU', r.error); continue; }
  const errs = [];
  for (const k of Object.keys(meta.exp)) {
    if (k.startsWith('q')) totQ++;
    if (r.answers[k] !== meta.exp[k]) { errs.push(`${k}: lido=${r.answers[k]} esperado=${meta.exp[k]} sc=${r.scores[k].map(s=>s.toFixed(2)).join('/')}`); if (k.startsWith('q')) errQ++; else idErr++; }
  }
  // questões além de nq devem vir em branco
  for (let q = meta.nq + 1; q <= 50; q++) if (r.answers['q'+q] !== null) errs.push('q'+q+' extra='+r.answers['q'+q]);
  doubtsN += r.doubts.length;
  console.log(f, ms + 'ms', 'erros:', errs.length, 'dúvidas:', r.doubts.join(','), errs.slice(0, 4).join(' | '));
}
console.log(`\nFalhas de detecção: ${fails}/${files.length} | erros em questões: ${errQ}/${totQ} | erros de identificação: ${idErr} | dúvidas: ${doubtsN}`);
