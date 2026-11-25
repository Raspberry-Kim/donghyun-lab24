// 버튼을 직접 눌러 본다: node qa/manual.cjs [폭] [높이]
const { chromium } = require('/home/user/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, mob = w < 600;
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1 });
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
  await pg.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + (process.argv[4] ? '?' + process.argv[4] : ''));
  await pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 });
  const out = (k, v) => console.log(k.padEnd(18), typeof v === 'string' ? v : JSON.stringify(v));
  const st = () => pg.evaluate(() => { const A = window.__donghyundi.A, g = A.g; return g ? { mode: g.mode, t: +g.t.toFixed(1), bg: Math.round(g.bg), iob: +g.iob().toFixed(1), inj: g.inj.map(i => i.u), juice: g.juiceLeft, rate: g.rate, dial: g.dial ? g.dial.u : null, stage: g.stage + 1, note: g.note } : { scr: A.scr }; });
  const pt = async (x, y) => { const r = await pg.evaluate(() => { const c = document.querySelector('#game').getBoundingClientRect(); return [c.left, c.top, c.width, c.height]; }); return [r[0] + x / 240 * r[2], r[1] + y / 420 * r[3]]; };
  const shot = n => pg.screenshot({ path: path.join(__dirname, 'tmp', `m${w}-${n}.png`) });
  await pg.click('#run'); await pg.waitForFunction(() => window.__donghyundi.A.scr === 'game'); await pg.waitForTimeout(1500);
  out('출전 뒤', await st());
  out('캔버스', await pg.evaluate(() => { const c = document.querySelector('#game').getBoundingClientRect(); return { x: Math.round(c.left), y: Math.round(c.top), w: Math.round(c.width), h: Math.round(c.height), vw: innerWidth, vh: innerHeight, over: document.documentElement.scrollWidth - innerWidth }; }));
  await shot('1-play');
  // 인슐린: 누르면 눈금 판이 열리고, 판이 열린 동안에도 시간은 흐른다
  const tap = async (x, y) => { const q = await pt(x, y); await pg.mouse.click(q[0], q[1]); await pg.waitForTimeout(120); };
  const D = await pg.evaluate(() => { const d = DS.UI.dial; return { r: d.ruler, steps: d.steps, ok: d.ok, cancel: d.cancel, max: DS.K.DIAL_MAX }; });
  const rx = u => D.r.x0 + (D.r.x1 - D.r.x0) * u / D.max, mid = b => [b.x + b.w / 2, b.y + b.h / 2];
  let bad = 0; const want = (k, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) bad++; out((ok ? 'ok  ' : 'BAD ') + k, got); };
  await tap(120, 380); const s0 = await st(); want('판 열림', s0.dial, 0); await shot('2-dial0');
  await pg.waitForTimeout(700); want('판이 열린 동안 시간이 흐름', (await st()).t > s0.t + 1, true);
  await tap(...mid(D.ok)); want('0단위는 안 맞음', (await st()).inj, []);
  // 자의 눈금을 하나하나 눌러 본다: 0~15단위, 0.5 간격
  const miss = []; for (let i = 0; i <= D.max * 2; i++) { await tap(rx(i / 2), D.r.ly - 4); const u = (await st()).dial; if (u !== i / 2) miss.push([i / 2, u]); }
  want('자 눌러 읽기 31눈금', miss, []);
  // 끌기
  let p = await pt(rx(2), D.r.ly); await pg.mouse.move(p[0], p[1]); await pg.mouse.down(); let q = await pt(rx(7.5), D.r.ly + 10); await pg.mouse.move(q[0], q[1], { steps: 8 }); await pg.waitForTimeout(120); want('끌어서 7.5', (await st()).dial, 7.5);
  q = await pt(300, D.r.ly); await pg.mouse.move(q[0], q[1], { steps: 4 }); await pg.waitForTimeout(120); want('자 밖 오른쪽은 15', (await st()).dial, 15); await pg.mouse.up(); await pg.waitForTimeout(100);
  // 걸음 버튼
  const step = async id => tap(...mid(D.steps.find(z => z.id === id)));
  await step('p1'); want('15에서 +1', (await st()).dial, 15);
  await tap(rx(4), D.r.ly - 4); await step('ph'); want('4 +0.5', (await st()).dial, 4.5); await step('p1'); want('+1', (await st()).dial, 5.5); await step('mh'); want('−0.5', (await st()).dial, 5); await step('m1'); want('−1', (await st()).dial, 4);
  await tap(rx(0.5), D.r.ly - 4); await step('m1'); want('0.5에서 −1', (await st()).dial, 0);
  await tap(rx(4.5), D.r.ly - 4); await shot('2-dial');
  // 취소: 누른 채 밖으로 빼면 듣지 않고, 그 위에서 떼면 닫힌다
  p = await pt(...mid(D.cancel)); await pg.mouse.move(p[0], p[1]); await pg.mouse.down(); q = await pt(120, 200); await pg.mouse.move(q[0], q[1], { steps: 4 }); await pg.mouse.up(); await pg.waitForTimeout(120); want('취소를 밖에서 뗌', (await st()).dial, 4.5);
  await tap(...mid(D.cancel)); let z = await st(); want('취소', [z.dial, z.inj], [null, []]);
  // 다시 열어 맞는다
  await tap(120, 380); want('다시 열면 0', (await st()).dial, 0); await tap(rx(4.5), D.r.ly - 4); await tap(...mid(D.ok)); z = await st(); want('4.5단위 맞음', [z.dial, z.inj], [null, [4.5]]);
  await pg.waitForTimeout(500); want('시간이 다시 흐름', (await st()).t > s0.t, true);
  // Esc와 메뉴로 닫기
  await tap(120, 380); await pg.keyboard.press('Escape'); await pg.waitForTimeout(150); z = await st(); want('Esc로 닫힘', [z.dial, z.inj, await pg.evaluate(() => document.querySelector('#menu').hidden)], [null, [4.5], true]);
  await tap(120, 380); await tap(223, 11); z = await st(); want('메뉴를 열면 닫힘', [z.dial, await pg.evaluate(() => !document.querySelector('#menu').hidden)], [null, true]); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  // 주스
  p = await pt(38, 380); await pg.mouse.click(p[0], p[1]); await pg.waitForTimeout(200); out('주스', await st());
  // 속도: 처음은 2배속, 셋 가운데 하나를 누른다. 4배속에서 눈금 판을 열면 2배속으로 돌아온다
  const RB = await pg.evaluate(() => DS.UI.rates), rate = async r => tap(...mid(RB.find(z => z.r === r)));
  want('기본 2배속', (await st()).rate, 2); await rate(1); want('1배속', (await st()).rate, 1); await shot('4-rate1');
  { const a = (await st()).t; await pg.waitForTimeout(1000); const d1 = (await st()).t - a; await rate(4); const b4 = (await st()).t; await pg.waitForTimeout(1000); const d4 = (await st()).t - b4; want('4배속', (await st()).rate, 4); out('1초에 흐른 분(1배속·4배속)', [+d1.toFixed(1), +d4.toFixed(1)]); want('4배속이 더 빠름', d4 > d1 * 2.5, true); } await shot('4-rate4');
  await tap(120, 380); z = await st(); want('4배속에서 판을 열면 2배속', [z.dial, z.rate], [0, 2]); await tap(...mid(D.cancel)); await rate(2); want('2배속', (await st()).rate, 2);
  // 메뉴
  p = await pt(223, 11); await pg.mouse.click(p[0], p[1]); await pg.waitForTimeout(300); out('메뉴', await pg.evaluate(() => { const m = document.querySelector('#menu'); return { hidden: m.hidden, items: [...m.querySelectorAll('.mi')].map(e => e.textContent) }; })); await shot('5-menu');
  const t0 = (await st()).t; await pg.waitForTimeout(500); out('멈춤', { before: t0, after: (await st()).t });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); out('Esc 뒤 메뉴', await pg.evaluate(() => document.querySelector('#menu').hidden));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); out('Esc로 열기', await pg.evaluate(() => !document.querySelector('#menu').hidden));
  await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')][0].click()); await pg.waitForTimeout(200);
  // 끝까지: 4배속을 눌러 실제 시간으로 기다린다
  p = await pt(...mid(RB.find(z => z.r === 4))); await pg.mouse.click(p[0], p[1]);
  for (let i = 0; i < 80 && (await st()).mode === 'play'; i++) { await pg.waitForTimeout(500); const z = await st(); if (z.mode === 'play' && z.rate !== 4) { await pg.mouse.click(p[0], p[1]); } }
  await pg.waitForTimeout(1500); out('끝', await st()); await shot('6-result');
  const bs = await pg.evaluate(() => JSON.parse(window.render_game_to_text()).buttons); out('결과 버튼', bs);
  if (bs && bs.length) { const nb = bs.find(z => z.id === 'next') || bs[0]; p = await pt(nb.x, nb.y); await pg.mouse.move(p[0], p[1]); await pg.mouse.down(); await pg.waitForTimeout(120); await shot('6b-press'); await pg.mouse.up(); await pg.waitForTimeout(600); await shot('7a-turn'); await pg.waitForTimeout(1600); out(nb.id + ' 누른 뒤', await st()); await shot('7-next'); }
  p = await pt(223, 11); await pg.mouse.click(p[0], p[1]); await pg.waitForTimeout(300);
  await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')].find(e => e.textContent.startsWith('포기')).click()); await pg.waitForTimeout(300);
  out('포기 확인', await pg.evaluate(() => { const m = document.querySelector('#menu'); return { hidden: m.hidden, title: (m.querySelector('h4') || {}).textContent, items: [...m.querySelectorAll('.mi')].map(e => e.textContent) }; })); await shot('7c-confirm');
  await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')][1].click()); await pg.waitForTimeout(300);
  // 포기
  await pg.click('#concede').catch(e => out('concede', e.message.slice(0, 80))); await pg.waitForTimeout(400);
  out('포기 메뉴', await pg.evaluate(() => { const m = document.querySelector('#menu'); return { hidden: m.hidden, items: [...m.querySelectorAll('.mi')].map(e => e.textContent) }; }));
  await pg.evaluate(() => { const m = document.querySelector('#menu'); if (!m.hidden) m.querySelectorAll('.mi')[0].click(); }); await pg.waitForTimeout(500);
  out('마지막', await st()); out('별 기록', await pg.evaluate(() => document.querySelector('#star-list').textContent.slice(0, 60)));
  await shot('8-setup');
  console.log('bad', bad, 'errors', errs.length, errs.slice(0, 8).join('\n'));
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
