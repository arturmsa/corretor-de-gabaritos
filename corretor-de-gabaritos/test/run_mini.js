// Lê as fotos simuladas do mini gabarito oferecendo os 3 formatos ao leitor
const fs=require('fs'), OMR=require('../www/js/omr.js'), L=require('../www/js/layout.js'), M=require('../www/js/mini.js');
const nq=JSON.parse(fs.readFileSync('exemplo-prova.json')).numQ;
const layouts=[L, M.layout('mini-h',nq), M.layout('mini-q',nq), M.layout('mini-c',nq)];
let tq=0,eq=0,ei=0,fails=0,fmt=0,du=0; const files=fs.readdirSync('.').filter(f=>/^mfoto_\d+\.json$/.test(f)).sort((a,b)=>parseInt(a.slice(6))-parseInt(b.slice(6)));
for(const f of files){const m=JSON.parse(fs.readFileSync(f)), raw=fs.readFileSync(f.replace('.json','.raw'));
 const t0=Date.now(); const r=OMR.read(new Uint8ClampedArray(raw),m.w,m.h,layouts); const ms=Date.now()-t0;
 if(!r.ok){fails++;console.log(f,m.modo,m.exp.formato,'FALHOU',r.error);continue}
 const errs=[]; if(r.layout.id!==m.exp.formato){fmt++;errs.push('formato '+r.layout.id)}
 for(const k of Object.keys(m.exp)){ if(k==='formato')continue; if(k.startsWith('q'))tq++;
   if(r.answers[k]!==m.exp[k]){errs.push(k+':'+r.answers[k]+'≠'+m.exp[k]+' '+(r.scores[k]||[]).map(s=>s.toFixed(2)).join('/')); if(k.startsWith('q'))eq++; else ei++;}}
 du+=r.doubts.length; console.log(f,m.modo,m.exp.formato,ms+'ms','erros',errs.length,errs.slice(0,3).join(' | '));}
console.log(`\nFalhas: ${fails}/${files.length} | formato errado: ${fmt} | erros questões: ${eq}/${tq} | erros identificação: ${ei} | dúvidas: ${du}`);
