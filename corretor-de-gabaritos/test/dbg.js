// Depuração: mostra binarização e candidatos a marcador
const fs=require('fs'), path=require('path');
const src=fs.readFileSync('../www/js/omr.js','utf8').replace("return { read: read,","return { _dbg:{downsample,adaptiveDark,components}, read: read,");
const tmp=path.join(__dirname,'_omr_dbg.js'); fs.writeFileSync(tmp,src.replace("require('./layout.js')","require('../www/js/layout.js')"));
const O=require(tmp); const f=process.argv[2]; const m=JSON.parse(fs.readFileSync(f+'.json'));
const g=new Uint8ClampedArray(fs.readFileSync(f+'.raw'));
const d=O._dbg.downsample(g,m.w,m.h,1100); const win=Math.max(15,Math.round(Math.max(d.w,d.h)/7))|1;
const bin=O._dbg.adaptiveDark(d.g,d.w,d.h,win); const comps=O._dbg.components(bin,d.w,d.h);
const mn=Math.min(d.w,d.h), minA=Math.pow(mn*0.011,2), maxA=Math.pow(mn*0.13,2);
comps.filter(c=>c.area>minA*0.5).sort((a,b)=>b.area-a.area).slice(0,15).forEach(c=>{const bw=c.maxx-c.minx+1,bh=c.maxy-c.miny+1;console.log(Math.round(c.cx),Math.round(c.cy),'area',c.area,'bb',bw,bh,'fill',(c.area/(bw*bh)).toFixed(2),'border',c.border,c.area>maxA?'BIG':'')});
// salva binarização
const buf=Buffer.alloc(d.w*d.h); for(let i=0;i<bin.length;i++)buf[i]=bin[i]?0:255; fs.writeFileSync('bin.raw',buf); console.log('size',d.w,d.h,'minA',minA|0,'maxA',maxA|0);
