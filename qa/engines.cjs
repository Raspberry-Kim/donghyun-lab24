// WebKit·Firefox에서 첫 화면·출전·탭 넘침: node qa/engines.cjs
const pw = require('/home/user/node_modules/playwright'); const path = require('path');
(async () => {
  let bad = 0;
  for (const name of ['webkit', 'firefox']) for (const [w, h] of [[390, 844], [1280, 900]]) {
    const b = await pw[name].launch(); const pg = await b.newPage({ viewport: { width: w, height: h } });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    try {
      await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
      await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 120000 });
      const over = {};
      for (const t of ['play', 'protocol', 'rules', 'math', 'about']) { await pg.click(`[data-tab=${t}]`); await pg.waitForTimeout(300); over[t] = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
      await pg.click('[data-tab=play]'); await pg.click('#run');
      await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game', null, { timeout: 30000 }); await pg.waitForFunction(() => JSON.parse(window.render_game_to_text()).game.t > 0, null, { timeout: 10000 }).catch(() => {});
      const g = await pg.evaluate(() => { const t = JSON.parse(window.render_game_to_text()), c = document.querySelector('#game').getBoundingClientRect(); return { t: t.game.t, bg: t.game.bg, cv: [Math.round(c.width), Math.round(c.height)] }; });
      if (name === 'webkit' && w === 390) await pg.screenshot({ path: path.join(__dirname, 'tmp', 'webkit-390.png') });
      const ok = Object.values(over).every(v => v <= 0) && g.t > 0 && !errs.length; if (!ok) bad++;
      console.log(ok ? 'ok ' : 'BAD', name, w, JSON.stringify(over), JSON.stringify(g), errs.slice(0, 3).join(' | '));
    } catch (e) { bad++; console.log('BAD', name, w, e.message.split('\n')[0], errs.slice(0, 3).join(' | ')); }
    await b.close();
  }
  process.exit(bad ? 1 : 0);
})();
