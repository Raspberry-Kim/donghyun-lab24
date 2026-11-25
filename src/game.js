/* 동현디 모의: 혈당 · 인슐린 · 음식 · 운동 · 케톤.
   숫자(혈당·인슐린·위 속 탄수화물·케톤)는 식으로 셈하고, 혈액 방의 입자는 그 숫자를 따라 그린다.
   1걸음 = 0.04분(1초에 2.4분). 빨리 감기는 한 걸음에 네 번 셈한다. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const DS = root.DS = root.DS || {};
  const K = DS.K = {
    DT: 0.04, FF: 4,
    TAU: 30,                       // 인슐린 세 칸 사슬의 한 칸(분): 정점 60분, 4시간에 98.6%
    LOW: 70, HIGH: 180, VLOW: 54, VHIGH: 250, TARGET: 120, FLOOR: 40, VLOW_MIN: 40,
    GLU: 2, KEY: 0.1, KET: 0.1,    // 입자 하나: 포도당 2 mg/dL · 인슐린 0.1단위 · 케톤 0.1 mmol/L
    EX_DROP: 90, EX_GAIN: 1.5,     // 운동: 시간당 혈당 −90, 인슐린 효과 1.5배
    SICK_RISE: 12, SICK_GAIN: 0.85, // 아픈 날: 시간당 +12, 인슐린 효과 0.85배
    KET_UP: 0.45, KET_DOWN: 0.6, KET_FAIL: 3.0, KET_HIGH_MIN: 120, IOB_ON: 0.2,
    DIAL_STEP: 0.5, DIAL_MAX: 15, JUICE_PACKS: 4,
    BELT_MIN: 75, BELT_PX: 2, MARK_MIN: 15
  };
  const CH = DS.CHAMBER = { x0: 31, x1: 209, y0: 208, y1: 318, in: [197, 200], key: [44, 201] };
  const CELLS = DS.CELLS = [];
  [222, 252, 282, 312].forEach(y => { CELLS.push({ x: 17, y: y, side: 'l', mx: 27, my: y }); });
  [222, 252, 282, 312].forEach(y => { CELLS.push({ x: 223, y: y, side: 'r', mx: 213, my: y }); });
  [62, 101, 139, 178].forEach(x => { CELLS.push({ x: x, y: 333, side: 'b', mx: x, my: 323 }); });
  const ORDER = [0, 5, 9, 2, 7, 10, 4, 1, 11, 6, 3, 8];      // 열쇠가 찾아가는 차례(고르게 퍼지게)
  const half = u => Math.round(u * 2) / 2;

  function Game(o) {
    o = o || {};
    this.stage = o.stage || 0; this.S = DS.STAGES[this.stage]; this.sfx = o.sfx || function () { };
    const S = this.S;
    this.rng = DS.RNG ? DS.RNG(900 + this.stage * 17) : (() => { let s = 7 + this.stage; const f = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; return f; })();
    this.t = 0; this.n = 0; this.mode = 'intro'; this.modeT = 0;
    this.bg = S.bg0; this.x1 = S.iob0 || 0; this.x2 = 0; this.x3 = 0; this.k = S.k0 || 0;
    this.icr = S.icr; this.isf = S.isf; this.csf = S.isf / S.icr;      // 탄수화물 1 g이 올리는 혈당
    this.stomach = []; this.highT = 0; this.vlowT = 0;
    this.foods = S.foods.map((f, i) => { const d = DS.FOODS[f.f]; return { i: i, t: f.t, id: f.f, name: d.name, g: d.g, tau: d.tau, spr: d.spr, show: f.t - (f.late || K.BELT_MIN), late: !!f.late, done: false, lead: null }; });
    this.ex = (S.ex || []).map(e => ({ t0: e.t0, t1: e.t1, name: e.name }));
    this.juiceLeft = K.JUICE_PACKS; this.lastJuice = -99; this.lastInj = -999;
    this.inj = []; this.juices = [];
    this.st = { tin: 0, low: 0, high: 0, vlow: 0, vhigh: 0, all: 0, min: this.bg, max: this.bg };
    this.hist = [this.bg]; this.marks = [];      // 그래프: 1분마다 혈당, 주사·음식·주스 표시
    this.dial = null; this.ff = false; this.speed = 1;
    this.alarm = ''; this.tip = S.tips && S.tips[0] ? S.tips[0][1] : ''; this.note = ''; this.noteT = 0;
    this.stars = 0; this.fail = ''; this.review = '';
    this.chew = 0; this.pulse = 0; this.sip = 0;
    this.glu = []; this.keys = []; this.kets = []; this.cells = CELLS.map(c => ({ keys: 0, open: 0, gulp: 0 }));
    this.keyN = 0;
    const n = Math.min(230, Math.round(this.bg / K.GLU));
    for (let i = 0; i < n; i++) this.glu.push(this.newGlu(false));
    this.syncParticles(40);
  }
  const G = Game.prototype;

  /* ── 읽기 ── */
  G.iob = function () { return this.x1 + this.x2 + this.x3; };
  G.depot = function () { return this.x1 + this.x2; };
  G.inStomach = function () { let s = 0; for (const q of this.stomach) s += q.q1 + q.q2; return s; };
  G.exNow = function () { for (const e of this.ex) if (this.t >= e.t0 && this.t < e.t1) return e; return null; };
  G.exSoon = function (t, within) { for (const e of this.ex) if (e.t1 > t && e.t0 - t <= within) return e; return null; };
  G.ketGain = function () { return this.k >= 1.5 ? 1 / 1.2 : this.k >= 0.6 ? 1 / 1.1 : 1; };
  G.gain = function () { return (this.exNow() ? K.EX_GAIN : 1) * (this.S.sick ? K.SICK_GAIN : 1) * this.ketGain(); };
  G.clock = function () { const m = Math.floor(this.S.clock + this.t) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  G.trend = function () { const i = this.hist.length - 1, j = Math.max(0, i - 15); return i === j ? 0 : (this.bg - this.hist[j]) / (i - j); };      // mg/dL/분 (지난 15분)
  G.tir = function () { return this.st.all > 0 ? this.st.tin / this.st.all * 100 : 100; };
  G.beltX = function (f) { return 150 - (f.t - this.t) * K.BELT_PX; };
  G.visible = function (f) { return !f.done && this.t >= f.show; };
  /* 권하는 용량(안내와 자동 조종이 같이 쓴다): 식사 + 교정 − 남은 인슐린 */
  G.mealDose = function (g, t) { const p = this.parAt(t == null ? this.t : t); return g / p.icr; };
  G.corrDose = function () { const d = (this.bg - K.TARGET) / this.isf / this.ketGain(); return d; };
  G.parAt = function (t) { let icr = this.S.icr, isf = this.S.isf; for (const s of (this.S.sched || [])) if (t >= s.t) { icr = s.icr; isf = s.isf; } return { icr: icr, isf: isf }; };

  /* ── 조작 ── */
  /* 인슐린 버튼을 누르면 눈금 판이 열린다. 판이 열린 동안에는 시간이 멈추고, 눈금을 정한 뒤 '맞는다'를 눌러야 들어간다 */
  G.dialOpen = function () { if (this.mode !== 'play' || this.dial) return false; this.dial = { u: 0 }; this.sfx('tick'); return true; };
  G.dialSet = function (u) {
    const d = this.dial; if (!d) return 0;
    u = Math.max(0, Math.min(K.DIAL_MAX, half(u)));
    if (u !== d.u) { d.u = u; this.sfx('dial'); }
    return d.u;
  };
  G.dialAdd = function (du) { return this.dial ? this.dialSet(this.dial.u + du) : 0; };
  G.dialCancel = function () { if (!this.dial) return; this.dial = null; this.sfx('cancel'); if (this.mode === 'play') this.say('주사를 취소했다'); };
  G.dialOk = function () {
    const d = this.dial; if (!d || !(d.u > 0) || this.mode !== 'play') return 0;
    this.dial = null; this.inject(d.u); return d.u;
  };
  G.inject = function (u) {
    u = Math.max(0, half(u)); if (!(u > 0) || this.mode !== 'play') return;
    this.x1 += u; this.inj.push({ t: this.t, u: u, bg: this.bg, iob: this.iob() - u }); this.lastInj = this.t; this.pulse = 40;
    this.marks.push({ t: this.t, k: 'i', u: u }); this.sfx('inject'); this.say('인슐린 ' + u.toFixed(1) + '단위');
    for (const f of this.foods) if (!f.done && f.lead == null && this.t >= f.show && f.t - this.t <= 60) f.lead = f.t - this.t;      // 다가오는 음식 앞에서 맞았다
    for (const f of this.foods) if (f.done && f.lead == null && this.t - f.t <= 60) f.lead = f.t - this.t;                          // 먹은 뒤에 맞았다(음수)
  };
  G.juice = function () {
    if (this.mode !== 'play' || this.juiceLeft <= 0) return false;
    this.juiceLeft--; this.lastJuice = this.t; this.sip = 30;
    this.stomach.push({ q1: DS.JUICE.g, q2: 0, tau: DS.JUICE.tau, juice: true });
    this.juices.push({ t: this.t, bg: this.bg }); this.marks.push({ t: this.t, k: 'j' }); this.sfx('juice'); this.say('주스 15 g');
    return true;
  };
  G.toggleFF = function () { if (this.mode !== 'play') return; this.ff = !this.ff; this.sfx('tick'); };
  G.say = function (s) { this.note = s; this.noteT = 150; };

  /* ── 한 걸음 ── */
  G.update = function () {
    this.n++; this.modeT++;
    if (this.noteT > 0) this.noteT--; if (this.pulse > 0) this.pulse--; if (this.sip > 0) this.sip--;
    if (this.mode === 'intro') { if (this.modeT >= 70) { this.mode = 'play'; this.modeT = 0; } this.visual(1); return; }
    if (this.mode !== 'play') { this.visual(1); return; }
    if (this.dial) { this.speed = 0; this.visual(1); return; }            // 눈금 판이 열린 동안에는 시간이 멈춘다
    const reps = this.ff ? K.FF : 1, dt = K.DT;
    this.speed = reps;
    for (let i = 0; i < reps && this.mode === 'play'; i++) this.physio(dt);
    this.visual(this.speed);
  };

  G.physio = function (dt) {
    const S = this.S, t0 = this.t; this.t += dt; const t = this.t;
    const p = this.parAt(t); if (p.icr !== this.icr) { this.icr = p.icr; this.isf = p.isf; this.say('비가 바뀌었다: ' + p.icr + ' g마다 1단위'); this.sfx('ok'); }
    /* 인슐린: 피부 밑 두 칸을 지나 피로 간다. 피에서 나가는 만큼이 일한 양이다 */
    const a1 = this.x1 / K.TAU * dt, a2 = this.x2 / K.TAU * dt, a3 = this.x3 / K.TAU * dt;
    this.x1 -= a1; this.x2 += a1 - a2; this.x3 += a2 - a3;
    const ex = this.exNow();
    let bg = this.bg - a3 * this.isf * this.gain();
    /* 음식: 위의 두 칸을 지나 피로 간다 */
    let left = 0;
    for (const q of this.stomach) { const b1 = q.q1 / q.tau * dt, b2 = q.q2 / q.tau * dt; q.q1 -= b1; q.q2 += b1 - b2; bg += b2 * this.csf; left += q.q1 + q.q2; }
    if (this.stomach.length && left < 0.05) this.stomach.length = 0;
    if (ex) bg -= K.EX_DROP / 60 * dt;
    if (S.sick) bg += K.SICK_RISE / 60 * dt;
    if (bg < 20) bg = 20; this.bg = bg;
    /* 케톤 */
    const iob = this.iob();
    this.highT = bg >= K.VHIGH ? this.highT + dt : 0;
    if (iob > K.IOB_ON) this.k = Math.max(0, this.k - K.KET_DOWN / 60 * dt);
    else if (S.sick || (bg >= K.VHIGH && (this.k >= 0.6 || this.highT > K.KET_HIGH_MIN))) this.k += K.KET_UP / 60 * dt;
    /* 음식이 벨트 끝에 닿으면 먹는다 */
    for (const f of this.foods) {
      if (!f.done && t >= f.t) { f.done = true; this.stomach.push({ q1: f.g, q2: 0, tau: f.tau }); this.marks.push({ t: t, k: 'f', g: f.g }); this.chew = 90; this.sfx('eat'); }
      if (f.late && t0 < f.show && t >= f.show) { this.ff = false; this.say('간식이 왔다: ' + f.name); this.sfx('low'); }
    }
    for (const e of this.ex) { if (t0 < e.t0 && t >= e.t0) { this.say(e.name + ' 시작'); this.sfx('ok'); } if (t0 < e.t1 && t >= e.t1) { this.say(e.name + ' 끝'); this.sfx('ok'); } }
    /* 범위 안 시간 */
    const st = this.st; st.all += dt;
    if (bg < K.LOW) st.low += dt; else if (bg > K.HIGH) st.high += dt; else st.tin += dt;
    if (bg < K.VLOW) st.vlow += dt; if (bg > K.VHIGH) st.vhigh += dt;
    if (bg < st.min) st.min = bg; if (bg > st.max) st.max = bg;
    while (this.hist.length <= Math.floor(t)) this.hist.push(bg);
    /* 알림 */
    const was = this.alarm;
    this.alarm = bg < K.VLOW ? 'vlow' : bg < K.LOW ? 'low' : this.k >= 1.5 ? 'ket' : bg > K.VHIGH ? 'vhigh' : '';
    if (this.alarm !== was) {
      if (this.alarm === 'low' || this.alarm === 'vlow') { if (was !== 'low' && was !== 'vlow') this.ff = false; this.sfx('low'); }
      else if (this.alarm === 'ket' || this.alarm === 'vhigh') this.sfx('high');
    }
    if (S.tips) for (const tp of S.tips) if (t0 < tp[0] && t >= tp[0]) this.tip = tp[1];
    /* 끝 */
    this.vlowT = bg < K.VLOW ? this.vlowT + dt : 0;
    if (bg <= K.FLOOR || this.vlowT >= K.VLOW_MIN) this.finish('low');
    else if (this.k >= K.KET_FAIL) this.finish('ket');
    else if (t >= S.dur) this.finish('');
  };

  G.finish = function (fail) {
    this.fail = fail; this.mode = fail ? 'fail' : 'done'; this.modeT = 0; this.dial = null; this.ff = false; this.speed = 1;
    const tir = this.tir();
    const lowP = this.st.low / this.st.all * 100;            // 별 셋: 범위 안 70% 이상이면서 70 아래 4% 미만
    this.stars = fail ? 0 : tir >= 70 ? (lowP < 4 ? 3 : 2) : tir >= 50 ? 2 : 1;
    this.review = this.reviewLine();
    this.sfx(fail ? 'fail' : 'clear');
  };
  G.totalU = function () { let s = 0; for (const i of this.inj) s += i.u; return s; };
  G.reviewLine = function () {
    const st = this.st, lowP = st.low / st.all * 100, highP = st.high / st.all * 100, u = this.totalU(), ref = this.S.ref || 0;
    if (this.fail === 'low') return '70 아래로 내려가면 바로 주스 한 팩이다';
    if (this.fail === 'ket') return '높은 혈당과 케톤에는 인슐린이 꼭 있어야 한다';
    const big = this.foods.filter(f => f.done && f.g >= 20), missed = big.filter(f => f.lead == null).length, late = big.filter(f => f.lead != null && f.lead < 5).length;
    if (lowP >= 4) return ref && u > ref * 1.2 ? '인슐린이 많았다. 남은 인슐린을 빼고 맞는다' : '낮은 시간이 있었다. 주스를 조금 더 일찍';
    if (highP > 25) {
      if (missed) return '식사 인슐린을 빠뜨린 끼니가 있다';
      if (ref && u < ref * 0.85) return '인슐린이 모자랐다. 탄수화물을 다시 세어 본다';
      if (late) return '주사가 늦었다. ‘15분 전’ 표식에서 맞는다';
      return '높은 시간이 길었다. 교정 용량을 떠올린다';
    }
    return this.stars >= 3 ? '범위 안에서 잘 지냈다' : '조금만 더 다듬으면 별 셋이다';
  };

  /* ── 입자(보이는 것) ── */
  G.newGlu = function (fromStomach) {
    const r = this.rng;
    if (fromStomach) return { x: CH.in[0] + (r() - 0.5) * 6, y: CH.in[1] - 2, vx: (r() - 0.5) * 0.6, vy: 0.5 + r() * 0.5, st: 0, a: 1, ph: r() * 6.28, c: -1 };
    return { x: CH.x0 + r() * (CH.x1 - CH.x0), y: CH.y0 + r() * (CH.y1 - CH.y0), vx: (r() - 0.5) * 0.4, vy: (r() - 0.5) * 0.4, st: 0, a: 0, ph: r() * 6.28, c: -1 };
  };
  G.syncParticles = function (burst) {
    const r = this.rng, act = this.exNow();
    /* 열쇠: 피 속 인슐린 0.1단위마다 하나 */
    const kt = Math.min(36, Math.round(this.x3 / K.KEY)); let kn = 0;
    for (const q of this.keys) if (q.st < 2) kn++;
    for (let i = 0; i < burst && kn < kt; i++, kn++) {
      const c = ORDER[this.keyN++ % 12]; this.cells[c].keys++;
      this.keys.push({ x: CH.key[0] + (r() - 0.5) * 6, y: CH.key[1] + 2, vx: 0, vy: 0.6, st: 0, a: 1, c: c, ph: r() * 6.28, slot: this.cells[c].keys });
    }
    for (let i = 0; i < burst && kn > kt; i++, kn--) { const q = this.keys.find(z => z.st < 2); if (!q) break; q.st = 2; this.cells[q.c].keys--; }
    /* 포도당: 2 mg/dL마다 하나 */
    const gt = Math.min(230, Math.round(this.bg / K.GLU)); let gn = 0;
    for (const q of this.glu) if (q.st === 0) gn++;
    const eating = this.inStomach() > 0.3;
    for (let i = 0; i < burst && gn < gt; i++, gn++) this.glu.push(this.newGlu(eating));
    if (gn > gt) {
      const open = []; for (let c = 0; c < 12; c++) if (this.cells[c].keys > 0 || act) open.push(c);
      for (let i = 0; i < burst && gn > gt; i++, gn--) {
        let best = -1, bd = 1e9, bc = -1;
        if (open.length) {      // 열린 세포 가까이 있는 것부터 빨려 든다
          const c = open[(r() * open.length) | 0], cc = CELLS[c];
          for (let j = 0; j < this.glu.length; j++) { const q = this.glu[j]; if (q.st !== 0) continue; const d = (q.x - cc.mx) * (q.x - cc.mx) + (q.y - cc.my) * (q.y - cc.my); if (d < bd) { bd = d; best = j; bc = c; } }
        } else { for (let j = 0; j < this.glu.length; j++) if (this.glu[j].st === 0) { best = j; break; } }
        if (best < 0) break;
        const q = this.glu[best]; q.st = bc >= 0 ? 1 : 2; q.c = bc;
      }
    }
    /* 케톤: 0.1 mmol/L마다 하나 */
    const ct = Math.min(40, Math.round(this.k / K.KET)); let cn = 0;
    for (const q of this.kets) if (q.st === 0) cn++;
    for (let i = 0; i < burst && cn < ct; i++, cn++) this.kets.push({ x: CH.x0 + r() * (CH.x1 - CH.x0), y: CH.y0 + r() * (CH.y1 - CH.y0), vx: (r() - 0.5) * 0.3, vy: (r() - 0.5) * 0.3, st: 0, a: 0, ph: r() * 6.28 });
    for (let i = 0; i < burst && cn > ct; i++, cn--) { const q = this.kets.find(z => z.st === 0); if (!q) break; q.st = 2; }
  };
  G.visual = function (speed) {
    const r = this.rng, act = !!this.exNow();
    if (this.chew > 0) this.chew--;
    this.syncParticles(speed >= 2 ? 6 : 2);
    for (let c = 0; c < 12; c++) { const ce = this.cells[c], on = ce.keys > 0 || act; ce.open += ((on ? 1 : 0) - ce.open) * 0.12; if (ce.gulp > 0) ce.gulp--; }
    const drift = (q, k) => {
      q.vx += (r() - 0.5) * k; q.vy += (r() - 0.5) * k; q.vx *= 0.96; q.vy *= 0.96; q.x += q.vx; q.y += q.vy;
      if (q.x < CH.x0) { q.x = CH.x0; q.vx = Math.abs(q.vx); } else if (q.x > CH.x1) { q.x = CH.x1; q.vx = -Math.abs(q.vx); }
      if (q.y < CH.y0) { q.y = CH.y0; q.vy = Math.abs(q.vy); } else if (q.y > CH.y1) { q.y = CH.y1; q.vy = -Math.abs(q.vy); }
    };
    let w = 0;
    for (let i = 0; i < this.glu.length; i++) {
      const q = this.glu[i];
      if (q.st === 0) { if (q.a < 1) q.a = Math.min(1, q.a + 0.08); if (q.y < CH.y0) { q.y += q.vy; q.x += q.vx * 0.3; } else drift(q, 0.09); }
      else if (q.st === 1) {
        const cc = CELLS[q.c], dx = cc.mx - q.x, dy = cc.my - q.y, d = Math.hypot(dx, dy), v = 2.4;
        if (d <= v) { this.cells[q.c].gulp = 10; continue; }
        q.x += dx / d * v; q.y += dy / d * v;
      } else { q.a -= 0.07; if (q.a <= 0) continue; }
      this.glu[w++] = q;
    }
    this.glu.length = w; w = 0;
    for (let i = 0; i < this.keys.length; i++) {
      const q = this.keys[i];
      if (q.st === 2) { q.a -= 0.06; if (q.a <= 0) continue; }
      else {
        const cc = CELLS[q.c], sl = ((q.slot - 1) % 3) - 1, tx = cc.mx + (cc.side === 'b' ? sl * 6 : 0), ty = cc.my + (cc.side === 'b' ? 0 : sl * 6);
        const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy);
        if (d < 1.2) { q.st = 1; q.x = tx; q.y = ty; } else { const v = Math.min(1.5, d); q.x += dx / d * v + Math.sin(this.n * 0.13 + q.ph) * 0.35; q.y += dy / d * v + Math.cos(this.n * 0.11 + q.ph) * 0.35; q.st = 0; }
      }
      this.keys[w++] = q;
    }
    this.keys.length = w; w = 0;
    for (let i = 0; i < this.kets.length; i++) {
      const q = this.kets[i];
      if (q.st === 0) { if (q.a < 1) q.a = Math.min(1, q.a + 0.05); drift(q, 0.06); } else { q.a -= 0.05; if (q.a <= 0) continue; }
      this.kets[w++] = q;
    }
    this.kets.length = w;
  };

  /* ── 자동 조종(시험용): 권하는 방법대로 맞는다. how: 'ideal' · 'none' · 'late' · 'stack' ── */
  G.autoPlay = function (how) {
    if (this.mode !== 'play') return;
    how = how || 'ideal';
    if (how === 'none') return;
    const ex = this.exNow(), iob = this.iob();
    if (this.juiceLeft > 0 && this.t - this.lastJuice > 15 && (this.bg < 74 || (this.bg < 100 && (ex || this.trend() < -1.4) && how !== 'stack'))) { this.juice(); return; }
    const lead = how === 'late' ? 0 : K.MARK_MIN;
    for (const f of this.foods) {
      if (f.dosed || f.done && how !== 'late' && this.t - f.t > 20) continue;
      if (this.t < f.show || f.t - this.t > lead) continue;
      let g = f.g; f.dosed = true;
      for (const h of this.foods) if (h !== f && !h.dosed && this.t >= h.show && h.t - f.t <= 20 && h.t >= f.t) { g += h.g; h.dosed = true; }
      let u = this.mealDose(g, f.t);
      if (this.exSoon(f.t, 120)) u *= 0.5;
      const c = this.corrDose() - (how === 'stack' ? 0 : iob);
      if (c > 0 || this.bg < 100) u += c;
      this.inject(u); return;
    }
    const wait = how === 'stack' ? 45 : 120;
    if (this.t - this.lastInj >= wait && !this.exSoon(this.t, 60)) {
      const c = this.corrDose() - (how === 'stack' || this.S.sick ? 0 : iob);   // 아픈 날은 두 시간마다 보고 그대로 교정한다
      if ((this.bg > 180 || (this.S.sick && this.bg > 150)) && c >= 0.5) this.inject(c);
    }
  };

  /* ── 저장·불러오기 ── 스테이지에서 다시 만들 수 있는 것(S·운동 시간표)은 담지 않는다 */
  const SKIP = { S: 1, sfx: 1, rng: 1, dial: 1, ex: 1 };
  G.save = function () {
    const o = {};
    for (const k in this) if (Object.prototype.hasOwnProperty.call(this, k) && !SKIP[k] && typeof this[k] !== 'function') o[k] = this[k];
    o.rng = this.rng.get ? this.rng.get() : 0;
    return JSON.parse(JSON.stringify(o));
  };
  const isN = v => typeof v === 'number' && isFinite(v), isI = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi, inR = (v, lo, hi) => isN(v) && v >= lo && v <= hi;
  const isO = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const NUMS = { n: [0, 1e9], modeT: [0, 1e9], x1: [0, 500], x2: [0, 500], x3: [0, 500], k: [0, 50], icr: [1, 200], isf: [1, 1000], csf: [0.01, 1000], highT: [0, 1e6], vlowT: [0, 1e6], lastJuice: [-1e4, 1e4], lastInj: [-1e4, 1e4], noteT: [0, 1e4], chew: [0, 1e4], pulse: [0, 1e4], sip: [0, 1e4], keyN: [0, 1e9], rng: [0, 4294967296] };
  const STRS = ['alarm', 'tip', 'note', 'fail', 'review'], PARTS = ['glu', 'keys', 'kets'], MARKK = { i: 1, j: 1, f: 1 };
  Game.load = function (d, o) {
    const bad = m => { throw new Error(m); };
    if (!isO(d)) bad('판 정보가 없다.');
    if (!isI(d.stage, 0, DS.STAGES.length - 1)) bad('스테이지 정보가 맞지 않는다.');
    if (d.mode !== 'play' && d.mode !== 'intro') bad('이어 할 수 없는 장면에서 저장한 판이다.');
    const g = new Game({ stage: d.stage, sfx: o && o.sfx }), S = g.S;
    if (!inR(d.t, 0, S.dur) || !inR(d.bg, K.FLOOR, 2000)) bad('시각·혈당 정보가 맞지 않는다.');
    for (const k in NUMS) if (!inR(d[k], NUMS[k][0], NUMS[k][1])) bad('진행 정보가 맞지 않는다(' + k + ').');
    for (const k of STRS) if (typeof d[k] !== 'string' || d[k].length > 200) bad('안내 글 정보가 맞지 않는다.');
    if (!isI(d.juiceLeft, 0, K.JUICE_PACKS) || typeof d.ff !== 'boolean' || !isI(d.stars, 0, 3)) bad('주스·속도 정보가 맞지 않는다.');
    const st = d.st; if (!isO(st) || ['tin', 'low', 'high', 'vlow', 'vhigh', 'all', 'min', 'max'].some(k => !inR(st[k], 0, 1e7))) bad('범위 안 시간 기록이 맞지 않는다.');
    const arr = (k, max, ok) => { const a = d[k]; if (!Array.isArray(a) || a.length > max || !a.every(ok)) bad('판 정보가 맞지 않는다(' + k + ').'); return a; };
    arr('stomach', 80, q => isO(q) && inR(q.q1, 0, 1000) && inR(q.q2, 0, 1000) && inR(q.tau, 1, 600));
    arr('inj', 2000, q => isO(q) && inR(q.t, 0, S.dur) && inR(q.u, 0.5, K.DIAL_MAX * 4) && isN(q.bg) && isN(q.iob));
    arr('juices', K.JUICE_PACKS, q => isO(q) && inR(q.t, 0, S.dur) && isN(q.bg));
    arr('hist', S.dur + 5, v => inR(v, 0, 2000)); if (!d.hist.length) bad('혈당 기록이 비어 있다.');
    arr('marks', 4000, q => isO(q) && inR(q.t, 0, S.dur) && MARKK[q.k] === 1 && (q.u == null || isN(q.u)) && (q.g == null || isN(q.g)));
    arr('foods', 200, q => isO(q)); if (d.foods.length !== g.foods.length) bad('음식 차례가 이 스테이지와 맞지 않는다.');
    d.foods.forEach((q, i) => { if (q.id !== g.foods[i].id || q.t !== g.foods[i].t || typeof q.done !== 'boolean' || !(q.lead == null || isN(q.lead))) bad('음식 차례가 이 스테이지와 맞지 않는다.'); });
    const part = q => isO(q) && isN(q.x) && isN(q.y) && Object.keys(q).length <= 16 && Object.keys(q).every(k => isN(q[k]) || typeof q[k] === 'boolean');
    for (const k of PARTS) arr(k, 1200, part);
    arr('cells', CELLS.length, q => isO(q) && inR(q.keys, 0, 1e4) && inR(q.open, 0, 1) && inR(q.gulp, 0, 1e4)); if (d.cells.length !== CELLS.length) bad('세포 정보가 맞지 않는다.');
    if (d.keys.some(q => !isI(q.c, 0, CELLS.length - 1)) || d.glu.some(q => !isI(q.c, -1, CELLS.length - 1))) bad('입자 정보가 맞지 않는다.');
    const c = JSON.parse(JSON.stringify(d));
    g.mode = c.mode; g.t = c.t; g.bg = c.bg; g.juiceLeft = c.juiceLeft; g.ff = c.ff; g.stars = c.stars; g.speed = c.ff ? K.FF : 1;
    for (const k in NUMS) if (k !== 'rng') g[k] = c[k];
    for (const k of STRS) g[k] = c[k];
    g.st = c.st; g.stomach = c.stomach; g.inj = c.inj; g.juices = c.juices; g.hist = c.hist; g.marks = c.marks; g.cells = c.cells;
    for (const k of PARTS) g[k] = c[k];
    g.foods.forEach((f, i) => { const q = c.foods[i]; f.done = q.done; f.lead = q.lead == null ? null : q.lead; if (q.dosed) f.dosed = true; });
    if (g.rng.set) g.rng.set(c.rng);
    g.dial = null;
    return g;
  };

  G.text = function () {
    const st = this.st, r1 = v => Math.round(v * 10) / 10;
    return JSON.stringify({
      stage: this.stage + 1, name: this.S.name, mode: this.mode, clock: this.clock(), t: r1(this.t), dur: this.S.dur,
      bg: Math.round(this.bg), trend: r1(this.trend()), icr: this.icr, isf: this.isf, iob: r1(this.iob()), depot: r1(this.depot()), stomach: r1(this.inStomach()), ketone: r1(this.k),
      exercise: this.exNow() ? this.exNow().name : '', juiceLeft: this.juiceLeft, ff: this.ff, dial: this.dial ? { u: this.dial.u } : null,
      alarm: this.alarm, tip: this.tip, tir: Math.round(this.tir()), low: Math.round(st.low / (st.all || 1) * 100), high: Math.round(st.high / (st.all || 1) * 100),
      injections: this.inj.length, units: r1(this.totalU()), juices: this.juices.length, stars: this.stars, fail: this.fail, review: this.review,
      belt: this.foods.filter(f => this.visible(f)).map(f => ({ name: f.name, g: f.g, min: r1(f.t - this.t) })),
      particles: { glucose: this.glu.length, keys: this.keys.length, ketones: this.kets.length, open: this.cells.filter(c => c.open > 0.5).length }
    });
  };
  DS.Game = Game;
})();
