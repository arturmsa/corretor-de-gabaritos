// Teste do mini gabarito pelas telas do app. Etapa 1: cria a prova e baixa as imagens.
// Etapa 2 (com "ler"): escaneia as fotos simuladas foto_mini_h.jpg e foto_mini_q.jpg.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
const etapa = process.argv[2] || 'gerar';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true, storageState: fs.existsSync('estado.json') ? 'estado.json' : undefined });
  const pg = await ctx.newPage(); const erros = [];
  pg.on('pageerror', e => erros.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await pg.goto('http://localhost:8765/index.html#/');
  const shot = async n => pg.screenshot({ path: `mshot_${n}.png` });
  if (etapa === 'gerar') {
    await pg.click('main [data-acao="escola"]'); await pg.fill('#dEscola', 'E.E. Monsenhor Joaquim Honório'); await pg.click('dialog button[value="ok"]');
    await pg.click('.fab'); await pg.fill('#fNome', 'Avaliação de Filosofia'); await pg.fill('#fNum', '10'); await pg.dispatchEvent('#fNum', 'change');
    const gab = 'ABCDEABCDE';
    for (let q = 1; q <= 10; q++) await pg.click(`button[data-q="${q}"][data-l="${gab[q - 1]}"]`);
    await pg.click('#salvarProva'); await pg.waitForSelector('#escanear');
    for (const [fmt, tipo] of [['mini-h', 'png'], ['mini-q', 'png'], ['mini-q', 'pdf']]) {
      await pg.click('#imprimir');
      await pg.check(`dialog input[value="${fmt}"]`);
      await pg.selectOption('#dTipo', tipo);
      if (fmt === 'mini-q' && tipo === 'png') await shot('01_dialogo');
      const dl = pg.waitForEvent('download'); await pg.click('dialog button[value="baixar"]');
      const d = await dl; await d.saveAs(path.resolve('dl_' + d.suggestedFilename())); console.log('download', d.suggestedFilename());
    }
    await ctx.storageState({ path: 'estado.json' });
  } else {
    await pg.click('a.item[href^="#/p/"]'); await pg.waitForSelector('#escanear');
    for (const f of ['foto_mini_h.jpg', 'foto_mini_q.jpg']) {
      const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#escanear')]);
      await fc.setFiles(path.resolve(f));
      await pg.waitForSelector('#placar', { timeout: 15000 });
      console.log(f, 'placar:', (await pg.textContent('#placar')).trim(), '| id:', await pg.inputValue('#iSerie'), await pg.inputValue('#iTurma'), await pg.inputValue('#iTurno'), await pg.inputValue('#iNum'));
      await pg.click('details summary'); await pg.waitForTimeout(300);
      await pg.screenshot({ path: 'mshot_02_' + f.replace('.jpg', '') + '.png', fullPage: true });
      await pg.click('#salvar'); if (await pg.isVisible('dialog[open]')) await pg.click('dialog button[value="sim"]');
      await pg.waitForSelector('table.res'); await pg.goBack(); await pg.waitForSelector('#escanear');
    }
  }
  console.log('ERROS:', erros.length ? erros : 'nenhum');
  await b.close();
})().catch(e => { console.error('FALHA', e.message); process.exit(1); });
