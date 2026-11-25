// 저장·불러오기: node qa/save.cjs [chromium|webkit|firefox]
const pw = require('/home/user/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const eng = process.argv[2] || 'chromium';
  const b = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
  const cx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
  const pg = await cx.newPage();
  const errs = []; pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); pg.on('pageerror', e => errs.push('PAGE ' + e.message));
  const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
  let bad = 0; const want = (k, got, exp) => { const ok = JSON.stringify(got) === JSON.stringify(exp); if (!ok) bad++; console.log((ok ? 'ok  ' : 'BAD ') + k.padEnd(26), JSON.stringify(got).slice(0, 300)); };
  const ready = () => pg.waitForFunction(() => window.__donghyundi && window.__donghyundi.A.scr === 'ready', null, { timeout: 90000 });
  const game = () => pg.waitForFunction(() => window.__donghyundi.A.scr === 'game' && window.__donghyundi.A.g, null, { timeout: 90000 });
  const menu = () => pg.evaluate(() => { const m = document.querySelector('#menu'); return m.hidden ? null : { title: (m.querySelector('h4') || {}).textContent, items: [...m.querySelectorAll('.mi')].map(e => e.querySelector('span').textContent), off: [...m.querySelectorAll('.mi.off')].length }; });
  const pick = async label => { await pg.evaluate(l => [...document.querySelectorAll('#menu .mi')].find(e => e.querySelector('span').textContent === l).click(), label); await pg.waitForTimeout(150); };
  await pg.goto(url); await ready();

  /* 1. 엔진 왕복: 열두 스테이지를 자동 조종으로 돌리다가 여러 때에 저장하고, 불러온 판과 원래 판을 같은 조작으로 끝까지 돌려 비교한다 */
  const rt = await pg.evaluate(() => {
    const out = { n: 0, diff: [], size: 0 };
    for (let st = 0; st < DS.STAGES.length; st++) for (const how of ['ideal', 'late', 'stack']) {
      const g = new DS.Game({ stage: st }); const cuts = [1, 40, 400, 1500, 3000, 5200];
      for (let i = 0; i < 9000 && (g.mode === 'play' || g.mode === 'intro'); i++) {
        if (cuts.includes(i)) {
          const txt = JSON.stringify(g.save()); out.size = Math.max(out.size, txt.length);
          const h = DS.Game.load(JSON.parse(txt)), a = JSON.parse(JSON.stringify(g.save())), c = h.save(); out.n++;
          if (JSON.stringify(a) !== JSON.stringify(c)) out.diff.push(['save', st, how, i]);
          const g2 = DS.Game.load(JSON.parse(txt));               // 원래 판을 건드리지 않고 사본 둘을 끝까지
          const run = q => { for (let k = 0; k < 9000 && (q.mode === 'play' || q.mode === 'intro'); k++) { q.autoPlay(how); if (q.mode === 'play') q.ff = true; q.update(); } return q.text(); };
          if (run(h) !== run(g2)) out.diff.push(['run', st, how, i]);
        }
        g.autoPlay(how); if (g.mode === 'play') g.ff = true; g.update();
      }
    }
    return out;
  });
  want('엔진 왕복 ' + rt.n + '번', rt.diff, []); console.log('    저장 크기 최대', rt.size, 'bytes');
  /* 불러온 판이 원래 판과 같은 길을 가는가(같은 조작) */
  const same = await pg.evaluate(() => {
    const bad = [];
    for (let st = 0; st < DS.STAGES.length; st++) {
      const g = new DS.Game({ stage: st }); for (let i = 0; i < 1200; i++) { g.autoPlay('ideal'); if (g.mode === 'play') g.ff = true; g.update(); }
      if (g.mode !== 'play') continue;
      const h = DS.Game.load(JSON.parse(JSON.stringify(g.save())));
      for (let i = 0; i < 9000 && g.mode === 'play'; i++) { g.autoPlay('ideal'); h.autoPlay('ideal'); g.ff = h.ff = true; g.update(); h.update(); }
      if (g.text() !== h.text()) bad.push(st + 1);
    }
    return bad;
  });
  want('불러온 판과 원래 판의 끝', same, []);

  /* 2. 맞지 않는 내용 거부 */
  const rej = await pg.evaluate(() => {
    const g = new DS.Game({ stage: 4 }); for (let i = 0; i < 600; i++) { g.autoPlay('ideal'); g.update(); }
    const base = () => JSON.parse(JSON.stringify(g.save())), out = [];
    const cases = { 'null': () => null, '배열': () => [], '스테이지 99': () => { const d = base(); d.stage = 99; return d; }, '끝난 판': () => { const d = base(); d.mode = 'done'; return d; }, '혈당 NaN': () => { const d = base(); d.bg = null; return d; }, '음식 수': () => { const d = base(); d.foods.pop(); return d; }, '다른 스테이지 음식': () => { const d = base(); d.stage = 2; return d; }, '주스 9': () => { const d = base(); d.juiceLeft = 9; return d; }, '입자 글자': () => { const d = base(); d.glu[0].x = 'a'; return d; }, '시각 음수': () => { const d = base(); d.t = -5; return d; }, '주사 100단위': () => { const d = base(); d.inj.push({ t: 1, u: 100, bg: 100, iob: 0 }); return d; }, '세포 11개': () => { const d = base(); d.cells.pop(); return d; } };
    for (const k in cases) { try { DS.Game.load(cases[k]()); out.push(k); } catch (e) { } }
    return out;
  });
  want('맞지 않는 판 12가지 거부', rej, []);

  /* 3. 화면: 출전 → 주사 → 메뉴 → 저장 */
  const play = () => pg.waitForFunction(() => { const D = window.__donghyundi; return D.A.scr === 'game' && D.A.g && D.A.g.mode === 'play' && D.A.g.t > 0.5; }, null, { timeout: 30000 });
  const openMain = async () => { await pg.evaluate(() => { const D = window.__donghyundi; if (!D.menu) D.mainMenu(); else if (D.menu.title !== '잠시 멈춤') { D.closeMenu(); D.mainMenu(); } }); await pg.waitForTimeout(150); };
  await pg.click('#run'); await game(); await play();
  await pg.evaluate(() => { const g = window.__donghyundi.A.g; g.dialOpen(); g.dialSet(4.5); g.dialOk(); g.juice(); });
  await pg.waitForTimeout(1500);
  await openMain();
  want('멈춤 메뉴', (await menu()).items, ['계속 한다', '저장', '불러오기', '소리 끄기', '이 스테이지 다시', '포기하고 출전 준비로']);
  await pick('불러오기'); want('빈 칸은 못 고름', (await menu()).off, 3); await openMain();
  await pick('저장'); want('저장 메뉴', (await menu()).items, ['브라우저 칸 1', '브라우저 칸 2', '브라우저 칸 3', '파일로 내려받기', '브라우저 칸 지우기']);
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'save-1-menu.png') });
  await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')][1].click()); await pg.waitForTimeout(200);
  const snap = await pg.evaluate(() => { const g = window.__donghyundi.A.g; return { stage: g.stage, t: g.t, bg: g.bg, inj: g.inj.map(i => i.u), ju: g.juiceLeft, x1: g.x1, hist: g.hist.length, glu: g.glu.length, logs: document.querySelector('#log').children.length }; });
  const slot = await pg.evaluate(() => { const d = window.__donghyundi.readSlot(2); return d ? { format: d.format, version: d.version, s: d.summary.stage, bg: d.summary.bg } : null; });
  want('칸 2에 저장', slot, { format: 'donghyundi-save', version: 1, s: 1, bg: Math.round(snap.bg) });
  want('저장 뒤 멈춤 메뉴', (await menu()).title, '잠시 멈춤');
  /* 파일로 내려받기 */
  await pick('저장');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pick('파일로 내려받기')]);
  const file = path.join(__dirname, 'tmp', 'save-test.dhsave'); await dl.saveAs(file);
  want('파일 이름', /^donghyundi-stage1-\d{4}\.dhsave$/.test(dl.suggestedFilename()), true);
  const fd = JSON.parse(fs.readFileSync(file, 'utf8')); want('파일 내용', [fd.format, fd.state.stage, fd.state.inj.map(i => i.u)], ['donghyundi-save', 0, [4.5]]);
  /* 더 가다가 칸에서 불러오기 */
  await pick('계속 한다'); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { const D = window.__donghyundi; D.closeMenu(); const g = D.A.g; g.dialOpen(); g.dialSet(1); g.dialOk(); });
  await pg.waitForTimeout(300); await openMain();
  await pick('불러오기'); await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')][1].click()); await pg.waitForTimeout(150);
  want('불러오기 확인', (await menu()).title, '지금 판을 두고 불러올까?'); await pick('불러온다'); await game(); await pg.waitForTimeout(300);
  let m = await menu(); want('불러온 뒤 멈춰 있음', m && m.title, '저장한 판을 불러왔다. 준비되면 계속 한다.');
  const back = await pg.evaluate(() => { const g = window.__donghyundi.A.g; return { stage: g.stage, t: g.t, bg: g.bg, inj: g.inj.map(i => i.u), ju: g.juiceLeft, x1: g.x1, hist: g.hist.length, glu: g.glu.length }; });
  const { logs, ...snap0 } = snap; want('저장한 때로 돌아옴', back, snap0);
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'save-2-loaded.png') });
  const t1 = back.t; await pg.waitForTimeout(500); want('기다리는 동안 멈춤', await pg.evaluate(() => window.__donghyundi.A.g.t), t1);
  await pick('계속 한다'); await pg.waitForTimeout(600); want('계속하면 흐름', await pg.evaluate(t => window.__donghyundi.A.g.t > t, t1), true);
  want('돌봄 기록 첫 줄', await pg.evaluate(() => document.querySelector('#log').firstChild.textContent), '저장한 판을 불러왔다.');

  /* 4. 새로 열어 출전 준비 화면에서 칸으로 불러오기 */
  await pg.reload(); await ready();
  const slots = await pg.evaluate(() => [...document.querySelectorAll('#slot-list .slot-btn')].map(b => [b.disabled, b.querySelector('span').textContent.slice(0, 12)]));
  want('칸 목록', slots.map(s => s[0]), [true, false, true]);
  await pg.screenshot({ path: path.join(__dirname, 'tmp', 'save-3-setup.png'), fullPage: true });
  await pg.click('#slot-list .slot-btn:not([disabled])'); await game(); await pg.waitForTimeout(300);
  const back2 = await pg.evaluate(() => { const g = window.__donghyundi.A.g; return { stage: g.stage, t: g.t, bg: g.bg, inj: g.inj.map(i => i.u), ju: g.juiceLeft, x1: g.x1, hist: g.hist.length, glu: g.glu.length }; });
  want('새로 연 뒤 칸에서', back2, snap0);
  await pick('계속 한다');
  /* 5. 파일에서 불러오기(출전 준비 화면) + 맞지 않는 파일 */
  await pg.reload(); await ready();
  const junk = path.join(__dirname, 'tmp', 'junk.dhsave'); fs.writeFileSync(junk, JSON.stringify({ format: 'donghyunchop-save', version: 1, state: {} }));
  await pg.setInputFiles('#load-file-setup', junk); await pg.waitForTimeout(300);
  want('다른 게임의 파일', await pg.evaluate(() => [document.querySelector('#result').textContent, window.__donghyundi.A.scr]), ['불러오기 실패: 동현디 저장 파일이 아니다.', 'ready']);
  fs.writeFileSync(junk, '{"format":"donghyundi-save","version":1,"state":{"stage":0,"mode":"play"'); await pg.setInputFiles('#load-file-setup', junk); await pg.waitForTimeout(300);
  want('깨진 파일', await pg.evaluate(() => [document.querySelector('#result').dataset.kind, window.__donghyundi.A.scr]), ['error', 'ready']);
  const white = JSON.parse(JSON.stringify(fd)); white.cfg.bg = 2; const wf = path.join(__dirname, 'tmp', 'white.dhsave'); fs.writeFileSync(wf, JSON.stringify(white));
  await pg.setInputFiles('#load-file-setup', wf); await game(); await pg.waitForTimeout(300);
  want('파일에서(흰 종이)', await pg.evaluate(() => { const g = window.__donghyundi.A.g, t = JSON.parse(window.render_game_to_text()); return [g.inj.map(i => i.u), t.paper, t.cfg.bg]; }), [[4.5], '스케치북 흰색', 2]);
  /* 게임 중 맞지 않는 파일: 지금 판은 그대로 */
  await pick('계속 한다'); await pg.evaluate(() => window.__donghyundi.closeMenu()); await pg.waitForTimeout(300);
  const before = await pg.evaluate(() => window.__donghyundi.A.g.inj.length);
  fs.writeFileSync(junk, JSON.stringify({ format: 'donghyundi-save', version: 1, state: { stage: 0, mode: 'play' } })); await pg.setInputFiles('#load-file', junk); await pg.waitForTimeout(300);
  want('게임 중 맞지 않는 파일', await pg.evaluate(() => [window.__donghyundi.A.g.inj.length, document.querySelector('#status').dataset.kind, !!window.__donghyundi.menu]), [before, 'error', true]);
  /* 6. 칸 지우기 */
  await openMain();
  await pick('저장'); await pick('브라우저 칸 지우기'); await pg.evaluate(() => [...document.querySelectorAll('#menu .mi')][1].click()); await pg.waitForTimeout(150); await pick('지운다');
  want('칸 지움', await pg.evaluate(() => window.__donghyundi.readSlot(2)), null);
  /* 7. 눈금 판이 열린 채 메뉴를 열면 판은 닫히고, 저장한 판에는 눈금 판이 담기지 않는다 */
  await openMain(); await pick('계속 한다');
  want('메뉴 모두 닫힘', await menu(), null);
  want('눈금 판을 연 채 저장', await pg.evaluate(() => { const D = window.__donghyundi, g = D.A.g; g.dialOpen(); g.dialSet(7); D.mainMenu(); const d = D.snapshot(); return [g.dial, 'dial' in d.state, g.inj.length === d.state.inj.length]; }), [null, false, true]);
  console.log('bad', bad, 'errors', errs.length, errs.slice(0, 6).join('\n'));
  await b.close(); process.exit(bad || errs.length ? 1 : 0);
})();
