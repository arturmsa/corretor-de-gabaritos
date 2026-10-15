// Teste de ponta a ponta das telas (celular 390x844)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const pg = await ctx.newPage(); global.pg = pg;
  const erros = []; global.erros = erros;
  pg.on('pageerror', e => erros.push('pageerror: ' + e.message));
  pg.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text()); });
  await pg.goto('http://localhost:8765/index.html');
  const shot = async n => pg.screenshot({ path: `shot_${n}.png`, fullPage: false });
  await shot('01_inicio');
  // escola
  await pg.click('main [data-acao="escola"]');
  await pg.fill('#dEscola', 'E.E. Monsenhor Joaquim Honório');
  await pg.click('dialog button[value="ok"]');
  // nova prova
  await pg.click('.fab');
  await pg.fill('#fNome', 'Simulado de Filosofia');
  await pg.fill('#fDisc', 'Filosofia');
  await pg.fill('#fNum', '30'); await pg.dispatchEvent('#fNum', 'change');
  // lê gabarito oficial da foto 0
  const fc = pg.waitForEvent('filechooser');
  await pg.click('#lerOficial');
  await (await fc).setFiles(path.resolve('foto_0.jpg'));
  await pg.waitForFunction(() => /Gabarito lido/.test(document.getElementById('toast').textContent), null, { timeout: 15000 });
  console.log('toast:', await pg.textContent('#toast'));
  await shot('02_gabarito');
  // anula a questão 30
  await pg.click('button[data-q="30"][data-anular]');
  await pg.click('#salvarProva');
  if (await pg.isVisible('dialog[open]')) await pg.click('dialog button[value="sim"]');
  await pg.waitForSelector('#escanear');
  await shot('03_prova');
  for (const i of [0, 1, 2, 3]) {
    await shot('dbg_antes_' + i); console.log('hash', await pg.evaluate(() => location.hash), 'dialog aberto', await pg.evaluate(() => document.getElementById('dialogo').open));
    const [fc2] = await Promise.all([pg.waitForEvent('filechooser', { timeout: 8000 }), pg.click('#escanear')]).catch(async e => { console.log('ERROS', erros); await shot('dbg_falha'); throw e; });
    await fc2.setFiles(path.resolve(`foto_${i}.jpg`));
    await pg.waitForSelector('#placar', { timeout: 15000 });
    if (i === 0) { await shot('04_revisao'); await pg.screenshot({ path: 'shot_04b_revisao_full.png', fullPage: true }); }
    console.log('foto', i, 'placar:', (await pg.textContent('#placar')).trim(), '| id:', await pg.inputValue('#iSerie'), await pg.inputValue('#iTurma'), await pg.inputValue('#iTurno'), await pg.inputValue('#iNum'));
    await pg.click('#salvar');
    if (await pg.isVisible('dialog[open]')) await pg.click('dialog button[value="sim"]');
    await pg.waitForSelector('table.res');
    if (i < 3) { await pg.goBack(); await pg.waitForSelector('#escanear'); }
  }
  await shot('05_resultados');
  await pg.screenshot({ path: 'shot_05b_resultados_full.png', fullPage: true });
  // exportações
  for (const t of ['pdf', 'xlsx']) {
    const dl = pg.waitForEvent('download');
    await pg.click(`button[data-exp="${t}"][data-t=""]`);
    const d = await dl; const p = path.resolve('export_' + d.suggestedFilename()); await d.saveAs(p);
    console.log('download', d.suggestedFilename(), fs.statSync(p).size, 'bytes');
  }
  // relatórios
  await pg.goBack(); await pg.waitForSelector('#escanear');
  await pg.click('a[href$="/relatorios"]'); await pg.waitForSelector('.tiles');
  await shot('06_relatorios');
  await pg.screenshot({ path: 'shot_06b_relatorios_full.png', fullPage: true });
  await pg.click('.chip:nth-child(2)'); await pg.waitForSelector('.tiles');
  // folha em branco
  await pg.click('#btnMenu'); await pg.click('[data-acao="folhaBranca"]');
  const dl2 = pg.waitForEvent('download'); await pg.click('dialog button[value="baixar"]');
  const d2 = await dl2; await d2.saveAs(path.resolve('export_' + d2.suggestedFilename())); console.log('download', d2.suggestedFilename());
  // persistência após recarregar
  await pg.goto('http://localhost:8765/index.html#/'); await pg.waitForSelector('.item');
  await shot('07_inicio_cheio');
  console.log('provas na tela inicial:', await pg.locator('a.item').count());
  console.log('ERROS:', erros.length ? erros : 'nenhum');
  await b.close();
})().catch(async e => { console.error('FALHA', e.message, 'ERROS:', JSON.stringify(global.erros)); process.exit(1); });
