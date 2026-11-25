// 탭마다 쪽 전체를 남기고 넘침을 잰다: node qa/docs.cjs [폭] [높이]
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path');
(async () => {
  const w = +process.argv[2] || 1280, h = +process.argv[3] || 900, mob = w < 600;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message));
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + (process.argv[4] ? '?' + process.argv[4] : ''));
  await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 });
  for (const t of ['play', 'protocol', 'rules', 'math', 'about']) {
    await pg.click(`[data-tab=${t}]`); await pg.waitForTimeout(500);
    const m = await pg.evaluate(() => { const vw = document.documentElement.clientWidth, bad = []; document.querySelectorAll('main *, footer *, header *').forEach(e => { if (e.closest('[hidden]')) return; const r = e.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 1 && !e.closest('.table-wrap,.math-table-wrap,.code-wrap,pre')) bad.push(e.tagName + '.' + e.className + ' ' + Math.round(r.right)); }); return { over: document.documentElement.scrollWidth - vw, h: document.documentElement.scrollHeight, bad: bad.slice(0, 6) }; });
    console.log(t, JSON.stringify(m));
    await pg.screenshot({ path: path.join(__dirname, 'tmp', `doc-${w}-${t}.png`), fullPage: true });
  }
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await b.close();
})();
