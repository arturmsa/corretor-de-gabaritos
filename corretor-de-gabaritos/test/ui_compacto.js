// Teste do mini gabarito compacto pelas telas do app
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const pg = await ctx.newPage(); const erros = [];
  pg.on('pageerror', e => erros.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await pg.goto('http://localhost:8766/index.html#/');
  await pg.click('.fab'); await pg.fill('#fNome', 'Avaliação de Filosofia'); await pg.fill('#fNum', '10'); await pg.dispatchEvent('#fNum', 'change');
  const gab = 'ABCDEABCDE';
  for (let q = 1; q <= 10; q++) await pg.click(`button[data-q="${q}"][data-l="${gab[q - 1]}"]`);
  await pg.click('#salvarProva'); await pg.waitForSelector('#escanear');
  await pg.click('#imprimir'); await pg.check('dialog input[value="mini-c"]'); await pg.selectOption('#dTipo', 'png');
  await pg.screenshot({ path: 'cshot_01_dialogo.png' });
  const dl = pg.waitForEvent('download'); await pg.click('dialog button[value="baixar"]');
  const d = await dl; await d.saveAs(path.resolve('dl_compacto.png')); console.log('download', d.suggestedFilename());
  execSync('python3 foto_compacto.py');   // preenche e fotografa: foto_c1 (8/10) e foto_c2 (10/10)
  for (const [f, n] of [['foto_c1.jpg', '5'], ['foto_c2.jpg', null]]) {
    const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('#escanear')]);
    await fc.setFiles(path.resolve(f)); await pg.waitForSelector('#placar', { timeout: 15000 });
    console.log(f, 'placar:', (await pg.textContent('#placar')).trim(), '| sugerido:', await pg.inputValue('#iSerie'), await pg.inputValue('#iTurma'), await pg.inputValue('#iTurno'), await pg.inputValue('#iNum'), '| foco no nº:', await pg.evaluate(() => document.activeElement.id));
    await pg.screenshot({ path: 'cshot_' + f.replace('.jpg', '') + '.png' });
    if (n) { await pg.selectOption('#iSerie', '2ª'); await pg.selectOption('#iTurma', 'B'); await pg.selectOption('#iTurno', 'M'); await pg.fill('#iNum', n); }
    await pg.click('#salvar'); await pg.waitForSelector('table.res'); await pg.goBack(); await pg.waitForSelector('#escanear');
  }
  await pg.click('a[href$="/resultados"]'); await pg.waitForSelector('table.res');
  console.log('resultados:', (await pg.textContent('main')).replace(/\s+/g, ' ').slice(0, 200));
  console.log('ERROS:', erros.length ? erros : 'nenhum');
  await b.close();
})().catch(e => { console.error('FALHA', e.message); process.exit(1); });
