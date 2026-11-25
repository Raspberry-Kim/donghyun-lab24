// 화면 모음에 쓸 그림을 남긴다: node qa/shots.cjs  → qa/tmp/s-*.png
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path'), fs = require('fs');
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html'), out = n => path.join(__dirname, 'tmp', n);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [];
  const open = async (q, w = 1280, h = 900, mob = false) => { const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, hasTouch: mob, isMobile: mob }); pg.on('pageerror', e => errs.push(e.message)); await pg.goto(url + q); await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr !== 'load', null, { timeout: 90000 }); return pg; };
  const cv = async (pg, n) => { const d = await pg.evaluate(() => document.querySelector('#game').toDataURL('image/png')); fs.writeFileSync(out(n), Buffer.from(d.split(',')[1], 'base64')); };
  const until = async (pg, f, max = 6000) => { for (let i = 0; i < max; i++) { const ok = await pg.evaluate(fn => { window.advanceTime(250); const g = window.__donghyundi.A.g; return g ? new Function('g', 'return ' + fn)(g) : false; }, f); if (ok) return true; } return false; };
  const play = async (name, stage, cond, how = '') => { const pg = await open(`?auto=1&stage=${stage}${how}`); await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game'); const ok = await until(pg, cond); await cv(pg, name); console.log(name, ok, await pg.evaluate(() => { const g = window.__donghyundi.A.g; return [g.stage + 1, g.clock(), Math.round(g.bg), g.mode].join(' '); })); return pg; };
  let pg = await open(''); await cv(pg, 's-ready.png'); await pg.close();
  pg = await open('?bg=2'); await pg.selectOption('select', 'white'); await pg.waitForTimeout(600); await pg.click('#run'); await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game'); await pg.waitForTimeout(3500);
  { const r = await pg.evaluate(() => { const c = document.querySelector('#game').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; }); const at = (x, y) => pg.mouse.click(r.x + r.w * x / 240, r.y + r.h * y / 420); await at(120, 380); await pg.waitForTimeout(200); const D = await pg.evaluate(() => { const d = DS.UI.dial; return [d.pos(4.5), d.ruler.ly - 4, d.cancel.x + 20, d.cancel.y + 12]; }); await at(D[0], D[1]); await pg.waitForTimeout(300); await cv(pg, 's-dial-white.png'); await at(D[2], D[3]); }
  await pg.close();
  for (const [n, st, c, how] of [
    ['s-03.png', 3, "g.stage===2&&g.t>=38"], ['s-11.png', 11, "g.stage===10&&g.t>=44"], ['s-05.png', 5, "g.stage===4&&g.t>=95"], ['s-07.png', 7, "g.stage===6&&g.bg<69", '&how=none'], ['s-08.png', 8, "g.stage===7&&g.t>=92"],
    ['s-09.png', 9, "g.stage===8&&g.t>=45"], ['s-10.png', 10, "g.stage===9&&g.t>=150"], ['s-12.png', 12, "g.stage===11&&g.t>=196"], ['s-result.png', 4, "g.stage===3&&g.mode==='done'"]]) { const p = await play(n, st, c, how || ''); if (n === 's-result.png') { await p.evaluate(() => window.advanceTime(800)); await cv(p, n); } await p.close(); }
  pg = await play('s-end.png', 12, "g.stage===11&&g.mode==='done'"); await pg.evaluate(() => window.advanceTime(4000)); await pg.waitForTimeout(600);
  { const r = await pg.evaluate(() => { const c = document.querySelector('#game').getBoundingClientRect(); return { x: c.left, y: c.top + scrollY, w: c.width, h: c.height }; }); await pg.screenshot({ path: out('s-end.png'), clip: { x: r.x, y: r.y, width: r.w, height: r.h }, fullPage: true }); console.log('petals', await pg.evaluate(() => JSON.parse(window.render_game_to_text()).petals)); }
  await pg.close();
  pg = await open(''); await pg.evaluate(() => scrollTo(0, 180)); await pg.waitForTimeout(300); await pg.screenshot({ path: out('s-desk.png') });
  await pg.click('[data-tab=rules]'); await pg.evaluate(() => scrollTo(0, 620)); await pg.waitForTimeout(400); await pg.screenshot({ path: out('s-desk-rules.png') }); await pg.close();
  pg = await open('', 390, 844, true); await pg.click('#run'); await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game'); await pg.waitForTimeout(9000); await pg.screenshot({ path: out('s-phone.png') }); await pg.close();
  console.log('errors', errs.length, errs.slice(0, 4).join('\n'));
  await b.close();
})();
