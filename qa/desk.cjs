// 데스크톱 게임 화면·흰 종이·전체 화면: node qa/desk.cjs
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message));
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 });
  const opts = await pg.evaluate(() => [...document.querySelectorAll('select option')].map(o => o.value + '|' + o.textContent));
  console.log(opts.join('\n'));
  const sel = await pg.$('select'); const white = opts.find(o => /흰/.test(o)) || opts[1];
  await sel.selectOption(white.split('|')[0]); await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'desk-ready-white.png') });
  await pg.click('#run'); 
  await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game', null, { timeout: 20000 });
  await pg.waitForTimeout(2500);
  console.log('game', await pg.evaluate(() => window.render_game_to_text()).then(t => t.slice(0, 260)));
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'desk-game-white.png') });
  console.log('overflow', await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await pg.click('#full'); await pg.waitForTimeout(900);
  console.log('full', await pg.evaluate(() => { const c = document.querySelector('#game').getBoundingClientRect(); return { fs: !!document.fullscreenElement, cls: document.body.className + ' | ' + document.documentElement.className, c: [Math.round(c.left), Math.round(c.top), Math.round(c.width), Math.round(c.height)], vw: innerWidth, vh: innerHeight }; }));
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'desk-full.png') });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(500);
  console.log('after esc', await pg.evaluate(() => ({ fs: !!document.fullscreenElement, menu: JSON.parse(window.render_game_to_text()).menu })));
  console.log('errors', errs.length, errs.slice(0, 5).join('\n'));
  await b.close();
})();
