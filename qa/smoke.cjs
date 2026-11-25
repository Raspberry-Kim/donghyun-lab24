// 첫 화면과 게임 화면을 남긴다: node qa/smoke.cjs [폭] [높이] [주소 덧붙임]
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, q = process.argv[4] || '';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 600 ? 2 : 1, hasTouch: w < 600, isMobile: w < 600 });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + (q ? '?' + q : ''));
  await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr !== 'load', null, { timeout: 90000 }).catch(e => errs.push('WAIT ' + e.message));
  await pg.waitForTimeout(400);
  const tag = w + (q ? '-' + q.replace(/[^a-z0-9]+/gi, '_') : '');
  const cv = async n => { const d = await pg.evaluate(() => document.querySelector('#game').toDataURL('image/png')); fs.writeFileSync(path.join(__dirname, 'tmp', n), Buffer.from(d.split(',')[1], 'base64')); };
  await cv(`cv-${tag}-0.png`);
  await pg.screenshot({ path: path.join(__dirname, 'tmp', `page-${tag}.png`), fullPage: false });
  console.log('scr', await pg.evaluate(() => window.__donghyundi.A.scr), 'overflow', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  console.log('errors', errs.length, errs.slice(0, 8).join('\n'));
  await b.close();
})();
