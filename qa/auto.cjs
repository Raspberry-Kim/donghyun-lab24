// 자동 조종으로 스테이지를 끝까지: node qa/auto.cjs <시작> <끝> [화면을 남길 간격(게임 분)] [주소 덧붙임]
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const s0 = +process.argv[2] || 1, s1 = +process.argv[3] || s0, every = +process.argv[4] || 0;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?auto=1&stage=' + s0 + (process.argv[5] || ''));
  await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'game', null, { timeout: 90000 });
  const shot = async n => { const d = await pg.evaluate(() => document.querySelector('#game').toDataURL('image/png')); fs.writeFileSync(path.join(__dirname, 'tmp', n), Buffer.from(d.split(',')[1], 'base64')); };
  let last = '', lastShot = -999, stuck = 0;
  for (let i = 0; i < 4000; i++) {
    const st = await pg.evaluate(() => { window.advanceTime(250); const A = window.__donghyundi.A, g = A.g; return { scr: A.scr, fete: !!A.fete, petals: window.Petals && Petals.count ? Petals.count() : -1, g: g ? { stage: g.stage + 1, mode: g.mode, t: Math.round(g.t), bg: Math.round(g.bg), k: +g.k.toFixed(1), stars: g.stars, tir: Math.round(g.tir()), min: Math.round(g.st.min), max: Math.round(g.st.max), u: g.totalU(), juice: 4 - g.juiceLeft, review: g.review } : null }; });
    const g = st.g; if (!g) { console.log('끝: 화면', st.scr); break; }
    const key = g.stage + ':' + g.mode;
    if (key !== last) { if (g.mode === 'done' || g.mode === 'fail') { console.log('st' + g.stage, g.mode, '별', g.stars, 'TIR', g.tir, 'min', g.min, 'max', g.max, 'U', g.u, '주스', g.juice, '|', g.review); await pg.evaluate(() => window.advanceTime(1200)); await shot(`end-${g.stage}.png`); } last = key; stuck = 0; }
    else if (++stuck > 900) { console.log('멈춤?', JSON.stringify(st)); await shot('stuck.png'); break; }
    if (every && g.mode === 'play' && g.t - lastShot >= every) { lastShot = g.t; await shot(`auto-${String(g.stage).padStart(2, '0')}-${String(g.t).padStart(3, '0')}.png`); }
    if (g.mode === 'play' && g.t < lastShot) lastShot = -999;
    if ((g.mode === 'done' && g.stage >= s1) || (g.mode === 'fail' && !process.env.GO)) { await pg.evaluate(() => window.advanceTime(3000)); const f = await pg.evaluate(() => ({ fete: !!window.__donghyundi.A.fete, txt: window.render_game_to_text().slice(0, 300) })); console.log('마침', JSON.stringify(f)); await shot('final.png'); break; }
  }
  console.log('errors', errs.length, errs.slice(0, 6).join('\n'));
  await b.close();
})();
