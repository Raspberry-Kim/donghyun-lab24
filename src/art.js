/* 그림 등록부 — 모든 그림은 여기서 연필로 그려 미리 만들어 둔다 */
(function () {
  'use strict';
  const DS = window.DS, Pen = DS.Pen, RNG = DS.RNG;
  const ART = DS.ART = { defs: {}, cache: {} };
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  DS.hash = hash;
  function def(name, w, h, fn, o) { ART.defs[name] = { w: w, h: h, fn: fn, o: o || {} }; }
  ART.def = def;
  ART.get = function (name) {
    let s = ART.cache[name];
    if (s) return s;
    const d = ART.defs[name];
    if (!d) throw new Error('그림 없음: ' + name);
    const n = d.o.boil == null ? 2 : d.o.boil, frames = [];
    for (let i = 0; i < n; i++) {
      // 윤곽은 같은 씨앗으로 그리고, 두 번째 장은 선 흔들림만 다르게 한다 (손그림 떨림)
      const pen = new Pen(d.w, d.h, hash(name) + i * 7919, { flipY: d.o.flipY, k: d.o.k, noFill: d.o.noFill, ink: d.o.ink, zoom: d.o.zoom, bold: d.o.bold });
      pen.lay = RNG(hash(name) ^ 0x51ed);
      d.fn(pen, i);
      frames.push(pen.done(d.o.grain));
    }
    s = ART.cache[name] = { name: name, w: d.w, h: d.h, frames: frames, o: d.o };
    return s;
  };
  ART.clear = function () { Object.keys(ART.cache).forEach(n => { ART.cache[n].frames.forEach(f => { f.width = f.height = 0; }); delete ART.cache[n]; }); };      // 종이 색이 바뀌면 모두 다시 그린다

  const SH = (side, f, a, gap, ang) => ({ side: side || 'r', f: f == null ? 0.55 : f, a: a == null ? 0.45 : a, gap: gap || 1.3, ang: ang == null ? -0.95 : ang });
  const ring = (n, r, ph, x, y) => { const o = []; for (let i = 0; i < n; i++) { const a = (ph || 0) + i / n * 6.2832; o.push([(x || 0) + Math.cos(a) * r, (y || 0) + Math.sin(a) * r]); } return o; };
  const star = (n, r1, r2, ph) => { const o = []; for (let i = 0; i < n * 2; i++) { const a = (ph || 0) + i / (n * 2) * 6.2832, r = i % 2 ? r2 : r1; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; };

  /* ───────── 혈액 방의 입자 ───────── */
  def('glu', 8, 8, p => { p.poly(ring(6, 2.7, 0.52), { tone: 0.07, w: 0.42, jit: 0.12 }); p.dot(0, 0, 0.5, 0.45); });                // 포도당: 육각 고리
  def('key', 12, 8, p => {                                                                                                  // 인슐린: 열쇠 (이가 오른쪽)
    p.ell(-3.2, 0, 2.1, 2.1, { tone: 0.5, w: 0.42, jit: 0.1 }); p.eraseEll(-3.2, 0, 0.8, 0.8);
    p.seg(-1.1, 0, 4.6, 0, { w: 0.72, passes: 2, jit: 0.08, noOver: true }); p.seg(2.5, 0, 2.5, 1.9, { w: 0.6, jit: 0.05, noOver: true }); p.seg(4.3, 0, 4.3, 1.9, { w: 0.6, jit: 0.05, noOver: true });
  });
  def('ket', 8, 8, p => { p.poly(star(4, 3.1, 1.1, 0.4), { tone: 0.72, w: 0.4, jit: 0.1 }); });                                   // 케톤: 까만 가시

  /* 세포: 입(문)이 오른쪽. 열쇠가 꽂히면 문이 열린다. 0 닫힘 · 1 반쯤 · 2 열림 */
  function cell(p, open) {
    p.poly([[-11, -6], [-9, -11], [-2, -12.6], [5, -11.2], [8.6, -6.4], [8.8, 6.4], [5, 11.2], [-2, 12.6], [-9, 11], [-11, 6]], { s: true, tone: 0.045, hatch: SH('l', 0.42, 0.34, 1.5, 0.9), w: 0.55 });
    p.ell(-4, 0.6, 3.3, 3.8, { tone: 0.22, w: 0.4, hatch: { ang: -0.8, gap: 1.1, a: 0.4 } }); p.dot(-4.6, 0, 0.8, 0.6);
    if (open === 0) { p.rect(8.9, 0, 2.6, 10.6, { tone: 0.5, w: 0.45 }); p.eraseEll(8.9, -0.6, 0.75, 0.75); p.seg(8.9, 0, 8.9, 1.9, { w: 0.4, noOver: true, jit: 0.05 }); }
    else if (open === 1) { p.rect(8.9, -4.1, 2.6, 3.6, { tone: 0.5, w: 0.45 }); p.rect(8.9, 4.1, 2.6, 3.6, { tone: 0.5, w: 0.45 }); p.seg(7.2, -1.8, 4.4, -0.7, { w: 0.3, a: 0.6, passes: 1 }); p.seg(7.2, 1.8, 4.4, 0.7, { w: 0.3, a: 0.6, passes: 1 }); }
    else { p.rect(8.9, -5.6, 2.6, 1.9, { tone: 0.5, w: 0.45 }); p.rect(8.9, 5.6, 2.6, 1.9, { tone: 0.5, w: 0.45 }); p.erase([[7.4, -4.4], [10.6, -4.4], [10.6, 4.4], [7.4, 4.4]]); p.seg(8.4, -4.2, 2.6, -1.4, { w: 0.34, a: 0.75, passes: 1 }); p.seg(8.4, 4.2, 2.6, 1.4, { w: 0.34, a: 0.75, passes: 1 }); }
  }
  def('cell0', 26, 28, p => cell(p, 0)); def('cell1', 26, 28, p => cell(p, 1)); def('cell2', 26, 28, p => cell(p, 2));

  /* ───────── 음식 (식품교환표의 1교환단위 그림) ───────── */
  function bowl(p, top) {
    p.poly([[-7.6, 0.4], [-5, top * 0.55], [-2, top], [2, top], [5, top * 0.55], [7.6, 0.4]], { s: true, tone: 0.02, w: 0.42 });
    for (let i = 0; i < 5 + Math.abs(top); i++) { const x = p.lay.r(-5, 5), y = p.lay.r(top * (1 - Math.abs(x) / 7) * 0.8, -0.4); p.seg(x, y, x + 0.9, y - 0.3, { w: 0.3, a: 0.6, passes: 1, noOver: true }); }
    p.poly([[-8.4, 0, 1], [8.4, 0, 1], [6.4, 6.4], [3.4, 8.2], [-3.4, 8.2], [-6.4, 6.4]], { s: true, tone: 0.09, hatch: SH('r', 0.5, 0.5, 1.1), w: 0.55 });
    p.seg(-3.2, 9, 3.2, 9, { w: 0.5 });
  }
  def('f_rice1', 22, 22, p => bowl(p, -2.4)); def('f_rice2', 22, 22, p => bowl(p, -5.4)); def('f_rice3', 22, 22, p => bowl(p, -8.6));
  def('f_bread', 22, 22, p => {
    p.poly([[-6.2, -3, 1], [-7.6, -5.2], [-5.6, -7.6], [0, -8.2], [5.6, -7.6], [7.6, -5.2], [6.2, -3, 1], [6.2, 7.6, 1], [-6.2, 7.6, 1]], { s: true, tone: 0.1, w: 0.55 });
    p.poly([[-4.6, -2.4, 1], [-5.6, -4.8], [-4, -6.2], [0, -6.6], [4, -6.2], [5.6, -4.8], [4.6, -2.4, 1], [4.6, 6, 1], [-4.6, 6, 1]], { s: true, w: 0.3, a: 0.7, hatch: { ang: 0.5, gap: 2.2, a: 0.22 } });
  });
  def('f_potato', 22, 22, p => {
    p.poly([[-8, 1], [-6.4, -3.6], [-1.6, -5.4], [4, -4.6], [7.8, -1], [7.4, 3.6], [3, 6.2], [-3.4, 6], [-7, 4]], { s: true, tone: 0.1, hatch: SH('b', 0.55, 0.45, 1.2, 0.3), w: 0.55 });
    p.dot(-3, -1.4, 0.45, 0.7); p.dot(1.6, 0.6, 0.45, 0.7); p.dot(4.4, -1.8, 0.4, 0.7); p.dot(-0.6, 3, 0.4, 0.6);
  });
  def('f_apple', 22, 22, p => {
    p.sym([[0, -3.6], [3, -5.8], [6.6, -4], [7.8, 0.4], [6, 5.4], [3, 7.8], [0, 6.8]], { s: true, tone: 0.16, hatch: SH('r', 0.5, 0.5, 1.1), w: 0.55 });
    p.line([[0, -3.8], [0.6, -6.4], [1.8, -8.4]], { s: true, w: 0.6 }); p.poly([[1.2, -6.6], [3.8, -8.6], [6, -7.4], [3.6, -5.8]], { s: true, tone: 0.3, w: 0.35 });
  });
  def('f_berry', 22, 22, p => {
    const one = (x, y, k) => p.at(x, y, 0, q => {
      q.sym([[0, -3.4], [3, -4], [4.6, -1.6], [3.2, 2.6], [0, 5.6]], { s: true, tone: 0.2, w: 0.5 });
      q.dot(-1.6, -1, 0.35, 0.8); q.dot(1.4, -0.4, 0.35, 0.8); q.dot(0, 1.8, 0.35, 0.8); q.dot(-1.4, 1.6, 0.3, 0.7); q.dot(1.8, 1.8, 0.3, 0.7);
      q.poly([[-3, -3.8], [-1, -5.2], [0, -4.2], [1, -5.2], [3, -3.8], [0, -2.8]], { tone: 0.45, w: 0.3 });
    }, k);
    one(-4.4, 1.4, 0.95); one(4.2, 0.2, 1.05);
  });
  def('f_melon', 22, 22, p => {
    p.poly([[-9.4, -3.6, 1], [9.4, -3.6, 1], [7, 2.4], [0, 6.4], [-7, 2.4]], { s: true, tone: 0.06, w: 0.55 });
    p.line([[-8, -2.4], [-5.6, 1.6], [0, 4.6], [5.6, 1.6], [8, -2.4]], { s: true, w: 0.34, a: 0.7 });
    p.poly([[-7.2, -3.4, 1], [7.2, -3.4, 1], [5, 0.6], [0, 3.2], [-5, 0.6]], { s: true, line: false, hatch: { ang: -0.9, gap: 1.3, a: 0.32 }, paper: false });
    [[-3.6, -1.6], [0, -0.6], [3.6, -1.6], [-1.6, 1], [1.8, 1]].forEach(q => p.dot(q[0], q[1], 0.45, 0.85));
  });
  def('f_cup', 22, 22, p => {
    p.poly([[-5, -6.6], [5, -6.6], [4, 8], [-4, 8]], { tone: 0.02, w: 0.55 });
    p.poly([[-4.6, -2.4], [4.6, -2.4], [3.9, 7.6], [-3.9, 7.6]], { line: false, tone: 0.18, hatch: { ang: 0.4, gap: 1.2, a: 0.4 }, paper: false });
    p.seg(-4.7, -2.6, 4.7, -2.6, { w: 0.35, a: 0.8 }); p.line([[1, 3], [2.4, -7], [6, -9.4]], { w: 0.55 });
  });
  def('f_milk', 22, 22, p => {
    p.poly([[-5, -3.6], [5, -3.6], [5, 8.4], [-5, 8.4]], { tone: 0.04, hatch: SH('r', 0.62, 0.4, 1.2), w: 0.55 });
    p.poly([[-5, -3.6], [5, -3.6], [3.4, -7.6], [-3.4, -7.6]], { tone: 0.1, w: 0.5 }); p.rect(0, -8.6, 7.2, 1.7, { tone: 0.3, w: 0.4 });
    p.ell(-0.8, 2.6, 2.3, 2.3, { w: 0.34, a: 0.75 }); p.seg(-5, 5.6, 5, 5.6, { w: 0.3, a: 0.5, passes: 1 });
  });

  /* ───────── 운동·버튼·표식 ───────── */
  def('ex_ball', 18, 18, p => {
    p.ell(0, 0, 6.6, 6.6, { tone: 0.03, w: 0.55 }); p.poly(ring(5, 2.4, -1.57), { tone: 0.62, w: 0.35 });
    ring(5, 2.4, -1.57).forEach(q => p.seg(q[0], q[1], q[0] * 2.5, q[1] * 2.5, { w: 0.34, a: 0.8, passes: 1, noOver: true }));
  });
  def('ex_rope', 18, 18, p => {
    p.line([[-6, -1], [-6.6, 5], [-3, 7.6], [3, 7.6], [6.6, 5], [6, -1]], { s: true, w: 0.5 });
    p.at(-6, -3.6, -0.15, q => q.rect(0, 0, 2.2, 5.6, { tone: 0.5, w: 0.4 })); p.at(6, -3.6, 0.15, q => q.rect(0, 0, 2.2, 5.6, { tone: 0.5, w: 0.4 }));
  });
  def('pack', 24, 30, p => {                                   // 주스 팩
    p.poly([[-6.4, -6], [6.4, -6], [6.4, 11.6], [-6.4, 11.6]], { tone: 0.05, hatch: SH('r', 0.64, 0.42, 1.2), w: 0.6 });
    p.poly([[-6.4, -6], [6.4, -6], [4.6, -9.4], [-4.6, -9.4]], { tone: 0.12, w: 0.5 });
    p.line([[2.4, -8], [3.2, -12.6], [7.6, -13.8]], { w: 0.7 });
    p.ell(-0.6, 2.6, 3.4, 3.4, { tone: 0.2, w: 0.4 }); p.line([[-0.6, -0.8], [0.2, -2.2], [1.6, -2.6]], { s: true, w: 0.4 });
  });
  def('pen', 40, 16, p => {                                    // 인슐린 펜 (바늘이 오른쪽)
    p.rect(-2, 0, 22, 6, { tone: 0.06, hatch: SH('b', 0.55, 0.4, 1.1, 0), w: 0.6 });
    p.rect(-1, 0, 7, 2.8, { tone: 0.32, w: 0.35 });
    p.rect(-15.2, 0, 4, 7.4, { tone: 0.45, w: 0.5 });
    p.poly([[9, -2.4], [12.6, -1.3], [12.6, 1.3], [9, 2.4]], { tone: 0.2, w: 0.45 }); p.seg(12.6, 0, 18, 0, { w: 0.42, noOver: true, jit: 0.05 });
  });
  def('ff', 22, 16, p => { p.poly([[-8, -5.4], [-0.6, 0], [-8, 5.4]], { tone: 0.5, w: 0.5 }); p.poly([[0.6, -5.4], [8, 0], [0.6, 5.4]], { tone: 0.5, w: 0.5 }); });
  function gear(p, n, r) {
    const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832, d = 3.1416 / n; [[-0.5, r * 0.8], [-0.3, r], [0.3, r], [0.5, r * 0.8]].forEach(q => o.push([Math.cos(a + q[0] * d) * q[1], Math.sin(a + q[0] * d) * q[1]])); }
    p.poly(o, { tone: 0.1, hatch: { ang: -0.9, gap: 1.4, a: 0.3 }, w: 0.5 }); p.ell(0, 0, r * 0.3, r * 0.3, { tone: 0.5, w: 0.4 });
  }
  def('gear_l', 26, 26, p => gear(p, 9, 11.2), { boil: 1 }); def('gear_s', 18, 18, p => gear(p, 7, 7.2), { boil: 1 });
  def('star1', 24, 24, p => { p.poly(star(5, 9.6, 4.2, -1.5708), { tone: 0.42, hatch: { ang: -0.9, gap: 1.2, a: 0.5 }, w: 0.6 }); });
  def('star0', 24, 24, p => { p.poly(star(5, 9.6, 4.2, -1.5708), { w: 0.42, a: 0.5 }); });
  def('arrow', 16, 16, p => { p.seg(-5.4, 0, 5, 0, { w: 0.8, noOver: true }); p.line([[1.4, -3.6], [5.4, 0], [1.4, 3.6]], { w: 0.8 }); });
  def('stomach', 32, 30, p => {
    p.poly([[-5, -12], [-0.6, -12], [0.4, -6.4], [6, -6], [11, -1], [10.4, 7], [4, 11.4], [-5, 10.4], [-10, 5.4], [-9, -1.6], [-5.4, -4.4]], { s: true, tone: 0.05, hatch: SH('b', 0.6, 0.4, 1.3, 0.2), w: 0.6 });
    p.line([[-6, 2], [-2, 4.4], [3, 3.6]], { s: true, w: 0.3, a: 0.5, passes: 1 });
  });

  /* 얼굴 넷: 괜찮다 · 낮다 · 높다 · 아프다 */
  function face(p, mood) {
    p.ell(0, 1, 10.4, 10, { tone: 0.03, w: 0.6 });
    p.line([[-7.6, -5.4], [-4, -10.4], [0, -8.4], [3, -11.4], [7.6, -5.6]], { s: true, w: 0.55 }); p.line([[-2, -9], [0.6, -12.6]], { w: 0.4, a: 0.8 });
    p.mir(q => q.seg(10.2, 0.6, 11.8, 1.6, { w: 0.4, a: 0.7, passes: 1 }));
    if (mood === 'ok') { p.dot(-3.6, 0.4, 0.95); p.dot(3.6, 0.4, 0.95); p.line([[-3.4, 4.8], [0, 6.8], [3.4, 4.8]], { s: true, w: 0.55 }); p.mir(q => q.ell(6.4, 4.2, 1.5, 1, { line: false, tone: 0.12, paper: false })); }
    else if (mood === 'low') {
      p.mir(q => { q.seg(2.4, -0.8, 4.8, 1.6, { w: 0.5, noOver: true }); q.seg(4.8, -0.8, 2.4, 1.6, { w: 0.5, noOver: true }); });
      p.line([[-3.4, 6.4], [-1.6, 5.2], [0, 6.4], [1.6, 5.2], [3.4, 6.4]], { s: true, w: 0.5 });
      p.poly([[8.6, -7.6], [10, -4.6], [8.6, -3.4], [7.2, -4.6]], { s: true, tone: 0.1, w: 0.35 }); p.poly([[-9.4, -5], [-8.2, -2.4], [-9.4, -1.4], [-10.6, -2.4]], { s: true, tone: 0.1, w: 0.35 });
    } else if (mood === 'high') {
      p.mir(q => q.line([[2.2, 0.2], [3.6, 1.4], [5, 0.2]], { s: true, w: 0.5 }));
      p.line([[-3, 6.6], [0, 5.2], [3, 6.6]], { s: true, w: 0.55 });
      p.mir(q => q.ell(6.4, 4, 1.8, 1.2, { line: false, tone: 0.2, hatch: { ang: -0.9, gap: 0.9, a: 0.5 }, paper: false }));
      p.scribble(8.6, -9.6, 2, { turns: 1.6, spiral: true, w: 0.3, a: 0.6 });
    } else {
      p.mir(q => q.seg(2.4, 0.6, 5, 0.2, { w: 0.5, noOver: true }));
      p.line([[-2.6, 6], [0, 5.4], [1.6, 6]], { s: true, w: 0.5 });
      p.at(4.6, 7, 0.5, q => { q.rect(2.6, 0, 8, 1.7, { tone: 0.04, w: 0.35 }); q.ell(7.4, 0, 1.5, 1.5, { tone: 0.6, w: 0.35 }); });
      p.poly([[-7.6, -4.4], [7.6, -4.4], [7.2, -2], [-7.2, -2]], { tone: 0.04, w: 0.35, a: 0.7 });
    }
  }
  def('face_ok', 28, 28, p => face(p, 'ok')); def('face_low', 28, 28, p => face(p, 'low')); def('face_high', 28, 28, p => face(p, 'high')); def('face_sick', 28, 28, p => face(p, 'sick'));

  DS.WARM = ['glu', 'key', 'ket', 'cell0', 'cell1', 'cell2', 'f_rice1', 'f_rice2', 'f_rice3', 'f_bread', 'f_potato', 'f_apple', 'f_berry', 'f_melon', 'f_cup', 'f_milk', 'ex_ball', 'ex_rope', 'pack', 'pen', 'ff', 'gear_l', 'gear_s', 'star1', 'star0', 'arrow', 'stomach', 'face_ok', 'face_low', 'face_high', 'face_sick'];
})();
