// 출전 규약과 예제: node qa/proto.cjs
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push('PAGE ' + e.message));
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
  await pg.goto(url); await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 });
  const want = { basic: [1, 1], white: [1, 2], ratio: [3, 1], correct: [5, 1], low: [7, 1], exercise: [8, 1], sick: [10, 1], last: [12, 2] };
  let bad = 0;
  const wrap = body => '나는 동현이냐?\n' + body + '\n동현이구나', num = n => '뿡뿡 도' + '오'.repeat(n - 1) + '옹~뿡뿡뿡';
  const run = async (code, viaSelect) => {
    if (viaSelect) await pg.selectOption('select', viaSelect); else await pg.fill('#code', code);
    await pg.click('#run');
    await pg.waitForFunction(() => { const A = window.__donghyundi.A; return A.scr === 'game' || document.querySelector('#status').dataset.kind === 'error'; }, null, { timeout: 30000 });
    const r = await pg.evaluate(() => { const t = JSON.parse(window.render_game_to_text()); return { scr: t.screen, cfg: t.cfg, stage: t.game && t.game.stage, paper: t.paper, msg: document.querySelector('#result').textContent, kind: document.querySelector('#status').dataset.kind }; });
    if (r.scr === 'game') { await pg.goto(url); await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 }); }
    return r;
  };
  for (const [id, [st, bg]] of Object.entries(want)) { const r = await run('', id); const ok = r.scr === 'game' && r.stage === st && r.cfg.bg === bg; if (!ok) bad++; console.log(ok ? 'ok ' : 'BAD', id, r.scr, r.stage, r.paper); }
  const cases = [['0', wrap('뿡뿡 도옹ㅠ~뿡뿡뿡')], ['13', wrap(num(13))], ['배경 3', wrap(num(1) + '\n' + num(3))], ['정수 셋', wrap(num(1) + '\n' + num(1) + '\n' + num(1))], ['출력 없음', wrap('ㅋㅋ 없음')], ['문법 오류', '나는 동현이냐?\n뿡뿡']];
  for (const [n, c] of cases) { const r = await run(c); const ok = r.scr !== 'game' && r.kind === 'error'; if (!ok) bad++; console.log(ok ? 'ok ' : 'BAD', n, '→', r.msg.slice(0, 70)); }
  const r12 = await run(wrap(num(12))); console.log(r12.stage === 12 ? 'ok ' : 'BAD', '12', r12.stage); if (r12.stage !== 12) bad++;
  console.log('bad', bad, 'errors', errs.length, errs.slice(0, 4).join('\n'));
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
