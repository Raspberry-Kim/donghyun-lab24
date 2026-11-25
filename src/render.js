/* 화면 그리기. 논리 240×420칸(세로로 긴 한 장).
   위에서부터: 윗줄 · 혈당 판 · 그래프 · 한 줄 안내 · 벨트 · 피부 밑과 위 · 혈액 방과 세포 · 버튼 셋 */
(function () {
  'use strict';
  const DS = window.DS, W = DS.W, H = DS.H, S = DS.S, ART = DS.ART, PI = Math.PI, K = DS.K, CELLS = DS.CELLS;
  const FONT = "Gaegu, 'Nanum Pen Script', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
  DS.FONT = FONT;

  /* 누르는 자리(논리 칸). 앱과 함께 쓴다 */
  const UI = DS.UI = {
    menu: { x: 206, y: 0, w: 34, h: 22 },
    juice: { x: 8, y: 348, w: 60, h: 68 }, ins: { x: 76, y: 348, w: 88, h: 68 }, ff: { x: 172, y: 348, w: 60, h: 68 },
    start: { x: 50, y: 300, w: 140, h: 40 },
    /* 눈금 판: 자(0~15단위) · 걸음 버튼 넷 · 취소 · 맞는다 */
    dial: {
      panel: { x: 6, y: 246, w: 228, h: 170 },
      ruler: { x: 12, y: 298, w: 216, h: 50, x0: 23, x1: 217, ly: 322 },
      steps: [{ id: 'm1', du: -1, x: 12, y: 351, w: 50, h: 27 }, { id: 'mh', du: -0.5, x: 66, y: 351, w: 50, h: 27 }, { id: 'ph', du: 0.5, x: 124, y: 351, w: 50, h: 27 }, { id: 'p1', du: 1, x: 178, y: 351, w: 50, h: 27 }],
      cancel: { id: 'dcancel', x: 12, y: 384, w: 70, h: 27 }, ok: { id: 'dok', x: 88, y: 384, w: 140, h: 27 },
      val(x) { const r = this.ruler; return Math.max(0, Math.min(K.DIAL_MAX, Math.round((x - r.x0) / (r.x1 - r.x0) * K.DIAL_MAX * 2) / 2)); },
      pos(u) { const r = this.ruler; return r.x0 + (r.x1 - r.x0) * u / K.DIAL_MAX; }
    },
    graph: { x: 8, y: 65, w: 224, h: 46 },
    hit(r, x, y, m) { m = m || 0; return x >= r.x - m && x <= r.x + r.w + m && y >= r.y - m && y <= r.y + r.h + m; },
    /* 결과 화면의 버튼 */
    result(g) {
      const o = [];
      if (g.mode === 'done' && g.stage < DS.STAGES.length - 1) o.push({ id: 'next', label: '다음 스테이지' });
      o.push({ id: 'retry', label: '다시 한다' }); o.push({ id: 'back', label: '출전 준비로' });
      const y0 = 352 - o.length * 30;
      o.forEach((b, i) => { b.x = 50; b.y = y0 + i * 30; b.w = 140; b.h = 25; });
      return o;
    }
  };

  function Render(cv) {
    this.cv = cv; cv.width = W * S; cv.height = H * S;
    this.c = cv.getContext('2d', { alpha: false, desynchronized: true });
    this.paper = DS.makePaper(W * S, H * S, 11);
    this.layer = null; this.turn = 0; this.press = ''; this.pressT = 0;
  }
  const R = Render.prototype;

  /* 움직이지 않는 밑그림: 벨트 · 피부 밑 · 관 · 혈액 방. 종이 색이 바뀌면 다시 그린다 */
  R.prepare = function () {
    if (this.layer) { this.layer.width = this.layer.height = 0; this.layer = null; }
    const p = new DS.Pen(W, H, 4242, { origin: [0, 0], noFill: true });
    p.seg(4, 16.5, 236, 16.5, { w: 0.35, a: 0.6 });
    [5.6, 9, 12.4].forEach(y => p.seg(220, y, 232, y, { w: 0.6, noOver: true, jit: 0.1 }));                         // 메뉴
    /* 벨트 */
    p.line([[-2, 157], [150, 157], [153.6, 160.3], [150, 163.6], [-2, 163.6]], { w: 0.6 });
    for (let x = 12; x < 150; x += 23) p.ell(x, 160.3, 2.1, 2.1, { w: 0.34, a: 0.7 });
    for (let y = 129; y < 156; y += 5) p.seg(120, y, 120, y + 2.6, { w: 0.34, a: 0.6, passes: 1, noOver: true });
    p.poly([[117.6, 166], [122.4, 166], [120, 164]], { tone: 0.6, w: 0.3 });
    /* 피부 밑 인슐린 저장소와 혈액 방으로 가는 관 */
    p.poly([[8, 176, 1], [11, 173], [83, 173], [86, 176, 1], [86, 194, 1], [83, 197], [11, 197], [8, 194, 1]], { s: true, w: 0.55, hatch: { ang: -0.9, gap: 3.2, a: 0.12 } });
    p.seg(40.6, 197, 40.6, 204.5, { w: 0.5, noOver: true }); p.seg(47.4, 197, 47.4, 204.5, { w: 0.5, noOver: true });
    /* 위에서 혈액 방으로 가는 관 */
    p.seg(193.6, 192.5, 193.6, 204.5, { w: 0.5, noOver: true }); p.seg(200.4, 193.5, 200.4, 204.5, { w: 0.5, noOver: true });
    /* 혈액 방 */
    p.poly([[27, 210, 1], [33, 204], [207, 204], [213, 210, 1], [213, 316, 1], [207, 322], [33, 322], [27, 316, 1]], { s: true, w: 0.7 });
    p.erase([[41.2, 202], [46.8, 202], [46.8, 206], [41.2, 206]]); p.erase([[194.2, 202], [199.8, 202], [199.8, 206], [194.2, 206]]);
    this.layer = p.done(0.3);
  };

  R.spr = function (name, x, y, rot, sx, sy, fi, alpha) {
    const s = ART.get(name), c = this.c, f = s.frames[(fi || 0) % s.frames.length];
    if (alpha != null) c.globalAlpha = alpha;
    if (rot || (sx != null && sx !== 1) || (sy != null && sy !== 1)) {
      c.save(); c.translate(x * S, y * S); if (rot) c.rotate(rot); c.scale(sx == null ? 1 : sx, sy == null ? (sx == null ? 1 : sx) : sy);
      c.drawImage(f, -s.w * S / 2, -s.h * S / 2); c.restore();
    } else c.drawImage(f, Math.round((x - s.w / 2) * S), Math.round((y - s.h / 2) * S));
    if (alpha != null) c.globalAlpha = 1;
    return s;
  };
  R.text = function (txt, x, y, px, align, alpha, weight) {
    const c = this.c; c.font = (weight || 700) + ' ' + Math.round(px * S) + 'px ' + FONT; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.wordSpacing = (-px * S * 0.14).toFixed(1) + 'px';
    c.lineWidth = Math.min(px * 0.22, 3) * S; c.strokeStyle = DS.FILL; c.lineJoin = 'round'; c.globalAlpha = (alpha == null ? 1 : alpha) * 0.8; c.strokeText(txt, x * S, y * S);
    c.globalAlpha = (alpha == null ? 1 : alpha) * 0.9; c.fillStyle = DS.INK; c.fillText(txt, x * S, y * S); c.globalAlpha = 1;
  };
  R.width = function (txt, px, weight) { const c = this.c; c.font = (weight || 700) + ' ' + Math.round(px * S) + 'px ' + FONT; c.wordSpacing = (-px * S * 0.14).toFixed(1) + 'px'; return c.measureText(txt).width / S; };
  /* 출전 준비 화면 제목: 손글씨 그림(src/title.png). 그림을 읽지 못하면 글꼴로 쓴다. */
  R.titleReady = new Promise(function (done) {
    if (!DS.TITLE_PNG || typeof Image === 'undefined') return done();
    const im = new Image(); im.onload = function () { R.titleImg = im; done(); }; im.onerror = function () { done(); }; im.src = DS.TITLE_PNG;
  });
  R.title = function (x, y, w) {      // 가운데 (x, y), 너비 w칸
    const im = this.titleImg;
    if (!im) { this.text(DS.TITLE, x, y + 4, 54, 'center'); return; }
    const h = w * im.height / im.width, c = this.c;
    this.text('TM', x + w / 2 + 2, y - h / 2 + 6, 8, 'left', 0.88);      // 제목 오른쪽 위에 붙는 작은 위첨자
    c.globalAlpha = 0.92;
    c.drawImage(im, Math.round((x - w / 2) * S), Math.round((y - h / 2) * S), Math.round(w * S), Math.round(h * S)); c.globalAlpha = 1;
  };
  /* 연필로 두 번 그은 네모 */
  R.box = function (x, y, w, h, seed, lw, alpha, fill) {
    const c = this.c, j = (n) => ((DS.hash('b' + (seed * 31 + n)) % 1000) / 1000 - 0.5) * 1.6 * S;
    if (fill != null) { c.globalAlpha = fill; c.fillStyle = DS.FILL; c.fillRect(x * S, y * S, w * S, h * S); }
    c.strokeStyle = DS.INK; c.lineCap = 'round'; c.lineWidth = (lw || 0.8) * S;
    for (let k = 0; k < 2; k++) {
      c.globalAlpha = (alpha == null ? 0.8 : alpha) * (k ? 0.5 : 1);
      const a = k * 8, x0 = x * S, y0 = y * S, x1 = (x + w) * S, y1 = (y + h) * S;
      c.beginPath();
      c.moveTo(x0 + j(a), y0 + j(a + 1)); c.lineTo(x1 + j(a + 2), y0 + j(a + 3)); c.lineTo(x1 + j(a + 4), y1 + j(a + 5)); c.lineTo(x0 + j(a + 6), y1 + j(a + 7)); c.closePath(); c.stroke();
    }
    c.globalAlpha = 1;
  };
  R.wash = function (alpha) { const c = this.c; c.globalAlpha = alpha; c.drawImage(this.paper, 0, 0); c.globalAlpha = 1; };
  R.shade = function (x, y, w, h, a) { const c = this.c; c.globalAlpha = a; c.fillStyle = DS.INK; c.fillRect(x * S, y * S, w * S, h * S); c.globalAlpha = 1; };
  R.stroke = function (pts, lw, a, dash) {
    const c = this.c; if (pts.length < 2) return;
    c.globalAlpha = a == null ? 0.85 : a; c.strokeStyle = DS.INK; c.lineWidth = lw * S; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(dash ? dash.map(v => v * S) : []);
    c.beginPath(); c.moveTo(pts[0][0] * S, pts[0][1] * S); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0] * S, pts[i][1] * S); c.stroke();
    c.setLineDash([]); c.globalAlpha = 1;
  };
  R.bar = function (x, y, w, h, fr) {
    const c = this.c; c.globalAlpha = 0.75; c.fillStyle = DS.FILL; c.fillRect(x * S, y * S, w * S, h * S);
    c.globalAlpha = 0.72; c.fillStyle = DS.INK; c.fillRect(x * S, y * S, w * fr * S, h * S);
    c.globalAlpha = 0.9; c.strokeStyle = DS.INK; c.lineWidth = 0.7 * S; c.strokeRect(x * S - 1, y * S - 1, w * S + 2, h * S + 2); c.globalAlpha = 1;
  };

  /* 혈당 그래프: 스테이지 처음부터 끝까지 한 장에 그린다. 세로 40~340 mg/dL */
  R.graph = function (g, r) {
    const dur = g.S.dur, gy = v => r.y + r.h - (Math.max(40, Math.min(340, v)) - 40) / 300 * r.h, gx = t => r.x + Math.min(1, t / dur) * r.w, c = this.c;
    this.box(r.x - 2, r.y - 2, r.w + 4, r.h + 4, 21, 0.5, 0.6, 0.35);
    this.shade(r.x, gy(K.HIGH), r.w, gy(K.LOW) - gy(K.HIGH), 0.07);
    this.stroke([[r.x, gy(K.HIGH)], [r.x + r.w, gy(K.HIGH)]], 0.3, 0.55, [2, 1.6]); this.stroke([[r.x, gy(K.LOW)], [r.x + r.w, gy(K.LOW)]], 0.3, 0.55, [2, 1.6]);
    this.text('180', r.x + 1, gy(K.HIGH) - 3.6, 6.5, 'left', 0.6); this.text('70', r.x + 1, gy(K.LOW) + 3.4, 6.5, 'left', 0.6);
    for (const e of g.ex) if (g.t >= e.t0 - K.BELT_MIN) { const y = r.y + r.h - 1.6; this.stroke([[gx(e.t0), y], [gx(e.t1), y]], 1.6, 0.5); }      // 운동 시간
    const pts = [], h = g.hist, step = Math.max(1, Math.round(dur / 224));
    for (let i = 0; i < h.length; i += step) pts.push([gx(i), gy(h[i])]);
    pts.push([gx(g.t), gy(g.bg)]);
    this.stroke(pts, 1.1, 0.9);
    for (const m of g.marks) {
      const x = gx(m.t), i = Math.min(h.length - 1, Math.floor(m.t)), y = gy(h[i]);
      if (m.k === 'i') { this.stroke([[x, r.y + r.h - 0.6], [x, r.y + r.h - 6]], 0.7, 0.85); c.globalAlpha = 0.85; c.fillStyle = DS.INK; c.beginPath(); c.arc(x * S, (r.y + r.h - 6.6) * S, 1.1 * S, 0, 6.2832); c.fill(); c.globalAlpha = 1; }
      else if (m.k === 'f') { c.globalAlpha = 0.9; c.fillStyle = DS.FILL; c.strokeStyle = DS.INK; c.lineWidth = 0.5 * S; c.beginPath(); c.arc(x * S, y * S, 1.6 * S, 0, 6.2832); c.fill(); c.stroke(); c.globalAlpha = 1; }
      else { c.globalAlpha = 0.85; c.fillStyle = DS.INK; c.fillRect((x - 1.2) * S, (y - 1.2) * S, 2.4 * S, 2.4 * S); c.globalAlpha = 1; }
    }
    if (g.mode === 'play' || g.mode === 'intro') { c.globalAlpha = 0.9; c.strokeStyle = DS.INK; c.lineWidth = 0.6 * S; c.beginPath(); c.arc(gx(g.t) * S, gy(g.bg) * S, 2.2 * S, 0, 6.2832); c.stroke(); c.globalAlpha = 1; }
  };

  const ALARM = { vlow: '아주 낮다. 바로 주스를 마신다', low: '낮다. 주스 한 팩을 마신다', ket: '케톤이 높다. 인슐린이 있어야 준다', vhigh: '아주 높다. 교정 인슐린을 떠올린다' };
  const fmt = u => (Math.round(u * 10) / 10).toFixed(1);
  R.tag = function (g, f) { return g.S.tag === 'hide' ? '? g' : g.S.tag === 'dose' ? f.g + ' g · ' + fmt(Math.round(g.mealDose(f.g, f.t) * 2) / 2) + '단위' : f.g + ' g'; };

  R.draw = function (g) {
    const c = this.c;
    c.drawImage(this.paper, 0, 0);
    if (!g) return;
    if (this.layer) c.drawImage(this.layer, 0, 0);
    const n = g.n, fi = (n >> 4) & 1, T = (s, x, y, px, al, a) => this.text(s, x, y, px, al, a);
    /* 윗줄 */
    T(g.clock(), 8, 9, 10.5, 'left'); T('스테이지 ' + (g.stage + 1) + ' · ' + g.S.name, W / 2 + 4, 9, 10, 'center');
    /* 혈당 판 */
    const bg = Math.round(g.bg), tr = g.trend(), low = g.bg < K.LOW, high = g.bg > K.HIGH;
    const shake = low ? Math.sin(n * 0.6) * 0.5 : 0;
    T(String(bg), 62 + shake, 39, 33, 'right'); T('mg/dL', 64, 49, 8, 'left', 0.8);
    this.spr('arrow', 74, 33, Math.max(-1.45, Math.min(1.45, -Math.atan(tr * 0.9))), 1, 1, fi);
    T(low ? '낮다' : high ? '높다' : '범위 안', 37, 56.5, 8, 'center', 0.75);
    T('탄수화물 ' + g.icr + ' g에 1단위', 98, 24.5, 8.6, 'left'); T(g.isf + ' mg/dL 내리는 데 1단위', 98, 34.5, 8.6, 'left');
    T('케톤 ' + fmt(g.k) + ' mmol/L', 98, 44.5, 8.6, 'left', g.k >= 0.6 ? 1 : 0.75); T('범위 안 ' + Math.round(g.tir()) + '%', 98, 54.5, 8.6, 'left');
    this.stroke([[92, 20], [92, 59]], 0.3, 0.4);
    this.graph(g, UI.graph);
    /* 한 줄 안내 */
    const ex = g.exNow();
    const line = g.noteT > 0 ? g.note : g.alarm ? ALARM[g.alarm] : ex ? ex.name + ' 중이다. 세포가 스스로 열린다' : g.tip;
    if (line) T(line, W / 2, 120.5, 9.2, 'center', g.alarm && g.noteT <= 0 ? 0.75 + 0.25 * Math.sin(n * 0.2) : 0.95);
    /* 벨트: 음식과 운동이 오른쪽으로 온다. 15분 전 표식에서 맞는다 */
    c.save(); c.beginPath(); c.rect(0, 124 * S, 156 * S, 44 * S); c.clip();
    const off = (g.t * K.BELT_PX) % 8;
    for (let x = -8 + off; x < 150; x += 8) this.stroke([[x, 158.6], [x + 2.4, 162]], 0.3, 0.4);
    for (const e of g.ex) {
      if (g.t < e.t0 - K.BELT_MIN || g.t >= e.t1) continue;
      const x0 = Math.max(-4, 150 - (e.t0 - g.t) * K.BELT_PX), x1 = Math.min(150, 150 - (e.t1 - g.t) * K.BELT_PX);
      const a = Math.max(x1, Math.min(x0, 150));
      this.stroke([[x1, 153.4], [Math.min(150, x0), 153.4]], 1.4, 0.45);
      if (g.t < e.t0) { this.spr(e.name === '줄넘기' ? 'ex_rope' : 'ex_ball', x0, 145.5, 0, 1, 1, fi); T(e.name, x0, 132.5, 8, 'center'); }
      else T(e.name + ' 중', Math.max(22, a), 146, 8, 'center', 0.8);
    }
    let lastEaten = null;
    for (const f of g.foods) {
      if (f.done) { if (!lastEaten || f.t > lastEaten.t) lastEaten = f; continue; }
      if (g.t < f.show) continue;
      const x = g.beltX(f), bob = Math.sin(n * 0.1 + f.i) * 0.5;
      this.spr(f.spr, x, 146.5 + bob, 0, 1, 1, fi);
      const s = this.tag(g, f), w = this.width(s, 8) + 5;
      this.box(x - w / 2, 127.5, w, 9.5, 40 + f.i, 0.45, 0.7, 0.85); T(s, x, 132.6, 8, 'center');
    }
    c.restore();
    T('15분 전', 120, 169, 7, 'center', 0.7);
    this.spr('gear_l', 165, 158, g.t * 0.18, 1, 1, 0); this.spr('gear_s', 182.5, 150.5, -g.t * 0.29 + 0.3, 1, 1, 0);
    if (lastEaten && g.chew > 62) { const k = (90 - g.chew) / 28, x = 150 + (203 - 150) * k, y = 146.5 + (176 - 146.5) * k - Math.sin(k * PI) * 14; this.spr(lastEaten.spr, x, y, k * 2.2, 1 - k * 0.45, 1 - k * 0.45, fi); }
    /* 피부 밑 */
    T('피부 밑', 7, 169.2, 6.6, 'left', 0.6); T('몸속 인슐린 ' + fmt(g.iob()) + '단위', 46, 179, 7.6, 'center');
    const dk = Math.min(11, Math.ceil(g.depot() / 0.5 - 0.2));
    for (let i = 0; i < dk; i++) this.spr('key', 16 + i * 6.3, 189 + ((i & 1) ? 1.3 : -1.3), PI / 2, 1, 1, (fi + i) & 1, 0.95);
    if (g.pulse > 0) { const k = g.pulse / 40; this.box(8 - 2 * k, 173 - 2 * k, 78 + 4 * k, 24 + 4 * k, 70, 1.1, k * 0.8); }
    /* 얼굴 */
    const mood = low ? 'face_low' : g.S.sick ? 'face_sick' : high ? 'face_high' : 'face_ok', fs = 1 + (g.sip > 0 ? Math.sin(g.sip * 0.5) * 0.05 : 0);
    this.spr(mood, 118 + shake, 187, low ? Math.sin(n * 0.25) * 0.06 : 0, fs, fs, fi);
    if (ex) this.spr(ex.name === '줄넘기' ? 'ex_rope' : 'ex_ball', 140, 190 - Math.abs(Math.sin(n * 0.16)) * 7, n * 0.05, 0.85, 0.85, fi);
    if (g.sip > 0) this.spr('pack', 99, 189, -0.3, 0.6, 0.6, fi);
    /* 위 */
    const ch = g.chew > 0 ? 1 + Math.sin(g.chew * 0.5) * 0.06 : 1, inS = g.inStomach();
    this.spr('stomach', 203, 181, 0, ch, 2 - ch, fi);
    if (inS > 0.5) T(Math.round(inS) + ' g', 203.5, 183.5, 8, 'center');
    T('위', 222, 172, 7.2, 'left', 0.7);
    /* 혈액 방: 세포 · 포도당 · 케톤 · 열쇠 */
    for (let i = 0; i < 12; i++) {
      const ce = g.cells[i], cc = CELLS[i], nm = ce.open < 0.33 ? 'cell0' : ce.open < 0.75 ? 'cell1' : 'cell2', k = 1 + (ce.gulp > 0 ? ce.gulp * 0.008 : 0);
      if (cc.side === 'l') this.spr(nm, cc.x, cc.y, 0, k, k, fi); else if (cc.side === 'r') this.spr(nm, cc.x, cc.y, 0, -k, k, fi); else this.spr(nm, cc.x, cc.y, -PI / 2, k, k, fi);
    }
    const sg = ART.get('glu'), sk = ART.get('ket'), hw = sg.w * S / 2;
    for (let i = 0; i < g.glu.length; i++) { const q = g.glu[i]; if (q.a < 1) c.globalAlpha = Math.max(0, q.a); c.drawImage(sg.frames[(i + fi) & 1], Math.round(q.x * S - hw), Math.round(q.y * S - hw)); if (q.a < 1) c.globalAlpha = 1; }
    for (let i = 0; i < g.kets.length; i++) { const q = g.kets[i]; if (q.a < 1) c.globalAlpha = Math.max(0, q.a); c.drawImage(sk.frames[(i + fi) & 1], Math.round(q.x * S - hw), Math.round(q.y * S - hw)); if (q.a < 1) c.globalAlpha = 1; }
    for (let i = 0; i < g.keys.length; i++) { const q = g.keys[i], sd = CELLS[q.c].side; this.spr('key', q.x, q.y, sd === 'l' ? PI : sd === 'r' ? 0 : PI / 2, 1, 1, (i + fi) & 1, Math.max(0, Math.min(1, q.a))); }
    T('혈액', 120, 211, 7.2, 'center', 0.5);
    /* 버튼 셋 */
    const d = g.dial, pr = this.pressT > 0 ? this.press : '';
    const btn = (r, on, seed, dim) => { if (on) this.shade(r.x, r.y, r.w, r.h, 0.12); this.box(r.x, r.y, r.w, r.h, seed + (on ? 3 : 0), on ? 1.5 : 0.9, dim ? 0.4 : 0.9, on ? null : 0.5); };
    const jd = g.juiceLeft <= 0;
    btn(UI.juice, pr === 'juice', 51, jd); this.spr('pack', 38, 371, 0, 1, 1, fi, jd ? 0.35 : 1); T('주스', 38, 394, 10.5, 'center', jd ? 0.4 : 1); T('남은 ' + g.juiceLeft + '팩', 38, 406.5, 7.8, 'center', jd ? 0.4 : 0.8);
    btn(UI.ins, pr === 'ins', 52, false); this.spr('pen', 120, 367, 0, 1, 1, fi); T('인슐린', 120, 387, 13, 'center');
    T('누르면 눈금이 나온다', 120, 403.5, 7.4, 'center', 0.8);
    btn(UI.ff, g.ff, 53, false); this.spr('ff', 202, 371, 0, 1, 1, fi); T('빨리 감기', 202, 394, 9.6, 'center'); T(g.ff ? '4배로 가는 중' : '누르면 4배', 202, 406.5, 7.8, 'center', 0.8);
    if (d) this.dial(g, d, pr);
    /* 스테이지 머리 · 결과 */
    if (g.mode === 'intro') {
      const a = g.modeT < 50 ? 1 : Math.max(0, 1 - (g.modeT - 50) / 20);
      this.wash(0.78 * a); T('스테이지 ' + (g.stage + 1), W / 2, 150, 13, 'center', a); T(g.S.name, W / 2, 178, 27, 'center', a); T(g.S.goal, W / 2, 206, 9.6, 'center', a * 0.9);
    } else if (g.mode === 'done' || g.mode === 'fail') this.result(g);
  };

  /* 눈금 판: 누른 자리의 눈금을 읽는 자, 0.5와 1씩 옮기는 버튼, 취소와 맞는다 */
  R.dial = function (g, d, pr) {
    const D = UI.dial, P = D.panel, r = D.ruler, T = (s, x, y, px, al, a) => this.text(s, x, y, px, al, a);
    this.c.globalAlpha = 0.97; this.c.drawImage(this.paper, P.x * S, P.y * S, P.w * S, P.h * S, P.x * S, P.y * S, P.w * S, P.h * S); this.c.globalAlpha = 1;
    this.box(P.x, P.y, P.w, P.h, 60, 1.3, 0.95);
    T('인슐린 눈금', 14, 257, 9, 'left', 0.85); T('시간이 멈춰 있다', 226, 257, 7.4, 'right', 0.7);
    const nw = this.width(fmt(d.u), 30), uw = this.width('단위', 10), x0 = 120 - (nw + 4 + uw) / 2;
    T(fmt(d.u), x0, 276, 30, 'left'); T('단위', x0 + nw + 4, 281, 10, 'left', 0.85);
    T(d.u > 0 ? '탄수화물 ' + Math.round(d.u * g.icr) + ' g을 맡거나 혈당을 ' + Math.round(d.u * g.isf) + ' 내린다' : '자를 누르거나 끌어서 눈금을 정한다', 120, 294, 7.4, 'center', 0.75);
    /* 자 */
    const px = D.pos(d.u), y = r.ly;
    if (d.u > 0) { this.shade(r.x0, y - 9, px - r.x0, 9, 0.16); for (let x = r.x0 + 2; x < px - 1; x += 3.2) this.stroke([[x, y - 0.6], [Math.min(px, x + 3), y - 8.4]], 0.35, 0.35); }
    this.stroke([[r.x0 - 4, y], [r.x1 + 4, y]], 0.9, 0.9); this.stroke([[r.x0 - 4, y + 0.5], [r.x1 + 4, y - 0.3]], 0.5, 0.4);
    for (let i = 0; i <= K.DIAL_MAX * 2; i++) {
      const x = D.pos(i / 2), whole = i % 2 === 0, five = i % 10 === 0;
      this.stroke([[x, y], [x + 0.2, y - (five ? 12 : whole ? 9 : 5)]], five ? 0.8 : whole ? 0.6 : 0.4, whole ? 0.85 : 0.6);
      if (whole) T(String(i / 2), x, y + (five ? 8 : 7.6), five ? 8.6 : 6.8, 'center', five ? 0.95 : 0.75);
    }
    this.stroke([[px, y - 13], [px - 3.6, y - 20.5], [px + 3.6, y - 20.5], [px, y - 13]], 0.9, 0.95); this.shade(px - 0.5, y - 13, 1, 13, 0.55);
    /* 걸음 버튼: 부호는 연필 선으로 긋는다 */
    for (const b of D.steps) {
      const on = pr === b.id, off = b.du < 0 ? d.u <= 0 : d.u >= K.DIAL_MAX, a = off ? 0.35 : 0.9, lab = Math.abs(b.du) === 1 ? '1' : '0.5', lw = this.width(lab, 12), cx = b.x + b.w / 2, cy = b.y + b.h / 2 + 0.5, sx = cx - (lw + 9) / 2 + 3;
      if (on) this.shade(b.x, b.y, b.w, b.h, 0.12);
      this.box(b.x, b.y, b.w, b.h, 61 + b.x, on ? 1.4 : 0.8, a, on ? null : 0.5);
      this.stroke([[sx - 3, cy], [sx + 3, cy + 0.2]], 1, a); if (b.du > 0) this.stroke([[sx, cy - 3], [sx + 0.2, cy + 3]], 1, a);
      T(lab, sx + 6, cy, 12, 'left', off ? 0.4 : 1);
    }
    const c = D.cancel, o = D.ok, okOn = d.u > 0;
    if (pr === c.id) this.shade(c.x, c.y, c.w, c.h, 0.12); this.box(c.x, c.y, c.w, c.h, 66, pr === c.id ? 1.4 : 0.8, 0.9, 0.5); T('취소', c.x + c.w / 2, c.y + c.h / 2 + 0.5, 12, 'center');
    if (pr === o.id) this.shade(o.x, o.y, o.w, o.h, 0.12); this.box(o.x, o.y, o.w, o.h, 67, okOn ? (pr === o.id ? 1.8 : 1.3) : 0.7, okOn ? 0.95 : 0.4, 0.5);
    T(okOn ? fmt(d.u) + '단위 맞는다' : '눈금을 정하자', o.x + o.w / 2, o.y + o.h / 2 + 0.5, 12.5, 'center', okOn ? 1 : 0.45);
  };

  R.result = function (g) {
    const a = Math.min(1, g.modeT / 30), T = (s, x, y, px, al, al2) => this.text(s, x, y, px, al || 'center', (al2 == null ? 1 : al2) * a), st = g.st, pc = v => Math.round(v / Math.max(1e-6, st.all) * 100);
    this.wash(0.86 * a);
    this.box(16, 26, 208, 334, 80, 0.9, 0.8 * a, 0.5 * a);
    T('스테이지 ' + (g.stage + 1) + ' · ' + g.S.name, W / 2, 42, 11, 'center', 0.85);
    T(g.fail === 'low' ? '저혈당으로 멈췄다' : g.fail === 'ket' ? '케톤이 넘쳐 멈췄다' : g.stage === DS.STAGES.length - 1 ? '열두 스테이지를 마쳤다' : '스테이지를 마쳤다', W / 2, 63, 21);
    for (let i = 0; i < 3; i++) { const on = i < g.stars && g.modeT > 30 + i * 18, k = on ? 1 + Math.max(0, 1 - (g.modeT - 30 - i * 18) / 12) * 0.5 : 1; this.spr(on ? 'star1' : 'star0', W / 2 + (i - 1) * 30, 92, 0, k, k, (g.n >> 4) & 1, a); }
    this.graph(g, { x: 30, y: 116, w: 180, h: 44 });
    const tin = pc(st.tin), lo = pc(st.low), hi = Math.max(0, 100 - tin - lo);
    T('범위 안 ' + tin + '%', W / 2, 178, 17); T('아래 ' + lo + '% · 위 ' + hi + '%', W / 2, 196, 10, 'center', 0.85);
    T('주사 ' + g.inj.length + '번 · ' + fmt(g.totalU()) + '단위 · 주스 ' + g.juices.length + '팩', W / 2, 212, 10, 'center', 0.85);
    T('가장 낮은 값 ' + Math.round(st.min) + ' · 가장 높은 값 ' + Math.round(st.max), W / 2, 226, 9, 'center', 0.75);
    T(g.review, W / 2, 245, 10);
    if (g.modeT > 50) for (const b of UI.result(g)) { const on = this.pressT > 0 && this.press === b.id; if (on) this.shade(b.x, b.y, b.w, b.h, 0.12); this.box(b.x, b.y, b.w, b.h, 90 + b.y, on ? 1.4 : 0.8, 0.9, 0.6); T(b.label, W / 2, b.y + b.h / 2 + 0.5, 12.5); }
  };

  R.pageTurn = function (k) {      // 종이를 넘기는 전환 (k: 0→1)
    const c = this.c, x = Math.round(W * S * (1 - k));
    c.drawImage(this.paper, x, 0, W * S - x, H * S, x, 0, W * S - x, H * S);
    const gr = c.createLinearGradient(x - 26 * S, 0, x, 0); gr.addColorStop(0, 'rgba(40,40,40,0)'); gr.addColorStop(1, 'rgba(40,40,40,0.3)');
    c.fillStyle = gr; c.fillRect(x - 26 * S, 0, 26 * S, H * S);
    c.fillStyle = 'rgba(60,60,60,0.5)'; c.fillRect(x - 1, 0, 2, H * S);
  };

  DS.Render = Render;
})();
