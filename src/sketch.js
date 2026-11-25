/* 연필 스케치 그리기 틀 — 흔들리는 겹선, 빗금, 흑연 질감, 거친 미색 종이 */
(function () {
  'use strict';
  const DS = window.DS = window.DS || {};
  const S = DS.S = 3;            // 논리 1칸 = 화면 3픽셀
  DS.W = 240; DS.H = 420;
  /* 종이 색 둘: 미색(기본)과 스케치북 흰색 */
  DS.PAPERS = [
    { name: '미색', rgb: [238, 230, 209], fill: '#f6f1e2', css: '#eee6d1' },
    { name: '스케치북 흰색', rgb: [250, 249, 244], fill: '#ffffff', css: '#faf9f4' }
  ];
  DS.paperIdx = 0;
  DS.PAPER = DS.PAPERS[0].rgb;
  DS.FILL = DS.PAPERS[0].fill;
  DS.setPaper = function (i) {      // 바뀌었으면 true (그림을 다시 그려야 한다)
    i = DS.PAPERS[i] ? i : 0; if (i === DS.paperIdx) return false;
    DS.paperIdx = i; DS.PAPER = DS.PAPERS[i].rgb; DS.FILL = DS.PAPERS[i].fill; return true;
  };
  DS.INK = '#222225';

  function RNG(seed) {
    let s = (seed >>> 0) || 1;
    const f = function () {
      s = (s + 0x6D2B79F5) >>> 0; let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.r = (a, b) => a + (b - a) * f();
    f.i = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = a => a[Math.floor(f() * a.length)];
    f.get = () => s; f.set = v => { s = v >>> 0; };      // 저장·불러오기용
    return f;
  }
  DS.RNG = RNG;

  function mk(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  DS.mk = mk;

  /* 종이 결(이) — 흑연이 묻는 정도 */
  const TN = 256, tooth = new Float32Array(TN * TN);
  (function () {
    const r = RNG(777), a = new Float32Array(TN * TN);
    for (let i = 0; i < a.length; i++) a[i] = r();
    for (let y = 0; y < TN; y++) for (let x = 0; x < TN; x++) {
      let m = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m += a[((y + dy) & 255) * TN + ((x + dx) & 255)];
      m /= 9;
      let v = 0.5 * a[y * TN + x] + 0.5 * ((m - 0.5) * 3.2 + 0.5);
      tooth[y * TN + x] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  })();
  DS.tooth = tooth;

  function grain(cv, k, ox, oy) {
    const w = cv.width, h = cv.height, c = cv.getContext('2d');
    const im = c.getImageData(0, 0, w, h), d = im.data;
    for (let y = 0; y < h; y++) {
      const row = ((y + oy) & 255) * TN;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4 + 3;
        if (d[i]) {
          let f = 1 - k * (1 - tooth[row + ((x + ox) & 255)]) * 1.7;
          if (f < 0.12) f = 0.12;
          d[i] = d[i] * f;
        }
      }
    }
    c.putImageData(im, 0, 0);
  }
  DS.grain = grain;

  DS.makePaper = function (w, h, seed, dark, flat) {
    const cv = mk(w, h), c = cv.getContext('2d'), im = c.createImageData(w, h), d = im.data, r = RNG(seed || 5);
    const G = 56, gw = Math.ceil(w / G) + 2, gh = Math.ceil(h / G) + 2, lf = new Float32Array(gw * gh);
    for (let i = 0; i < lf.length; i++) lf[i] = r() * 2 - 1;
    const base = DS.PAPER, dk = dark || 0;
    for (let y = 0; y < h; y++) {
      const gy = y / G, y0 = gy | 0, fy = gy - y0;
      for (let x = 0; x < w; x++) {
        const gx = x / G, x0 = gx | 0, fx = gx - x0;
        const a = lf[y0 * gw + x0], b = lf[y0 * gw + x0 + 1], cc = lf[(y0 + 1) * gw + x0], e = lf[(y0 + 1) * gw + x0 + 1];
        const l = (a + (b - a) * fx) * (1 - fy) + (cc + (e - cc) * fx) * fy;
        const t = tooth[(y & 255) * TN + (x & 255)], t2 = tooth[((y >> 1) + 91 & 255) * TN + ((x >> 1) + 37 & 255)];
        let v = (t - 0.5) * 20 + (t2 - 0.5) * 14 + l * 6 + (r() - 0.5) * 7 - dk;
        const ex = Math.min(x, w - 1 - x) / w, ey = Math.min(y, h - 1 - y) / h, ed = Math.min(ex, ey);
        if (!flat && ed < 0.08) v -= (0.08 - ed) * 110;
        const i = (y * w + x) * 4;
        d[i] = base[0] + v; d[i + 1] = base[1] + v * 0.98; d[i + 2] = base[2] + v * 0.9; d[i + 3] = 255;
      }
    }
    c.putImageData(im, 0, 0);
    c.lineCap = 'round';
    const nf = Math.round(w * h / 420);
    for (let i = 0; i < nf; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.283, L = 3 + r() * 12;
      c.strokeStyle = r() < 0.55 ? 'rgba(96,84,60,' + (0.04 + r() * 0.08) + ')' : 'rgba(255,253,244,' + (0.1 + r() * 0.16) + ')';
      c.lineWidth = 0.5 + r() * 0.9;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (r() - 0.5) * 4, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 4, x + Math.cos(a) * L, y + Math.sin(a) * L);
      c.stroke();
    }
    return cv;
  };

  /* ── 점 보간 ── */
  function catmull(P, closed) {
    const n = P.length, out = [], segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], p1 = P[i % n], p2 = P[(i + 1) % n],
        p3 = P[closed ? (i + 2) % n : Math.min(n - 1, i + 2)];
      const K = 8;
      for (let k = 0; k < K; k++) {
        const t = k / K, t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    out.push(closed ? [P[0][0], P[0][1]] : [P[n - 1][0], P[n - 1][1]]);
    return out;
  }
  function resample(P, step) {
    const out = [[P[0][0], P[0][1]]]; let carry = 0;
    for (let i = 1; i < P.length; i++) {
      const ax = P[i - 1][0], ay = P[i - 1][1], bx = P[i][0], by = P[i][1], L = Math.hypot(bx - ax, by - ay);
      if (L < 1e-6) continue;
      let t = step - carry;
      while (t <= L) { out.push([ax + (bx - ax) * t / L, ay + (by - ay) * t / L]); t += step; }
      carry = L - (t - step);
    }
    const q = P[P.length - 1], o = out[out.length - 1];
    if (Math.hypot(q[0] - o[0], q[1] - o[1]) > 0.05) out.push([q[0], q[1]]);
    return out;
  }
  function dense(pts, closed, smooth, step) {
    step = step || 1.3;
    const n = pts.length;
    if (!smooth) return resample(closed ? pts.concat([pts[0]]) : pts, step);
    const cor = [];
    for (let i = 0; i < n; i++) if (pts[i][2]) cor.push(i);
    if (closed) {
      if (!cor.length) return resample(catmull(pts, true), step);
      let out = [];
      for (let c = 0; c < cor.length; c++) {
        const i0 = cor[c], i1 = cor[(c + 1) % cor.length], run = [];
        let i = i0;
        for (;;) { run.push(pts[i]); if (i === i1 && run.length > 1) break; i = (i + 1) % n; if (run.length > n + 1) break; }
        const seg = run.length > 2 ? catmull(run, false) : run;
        out = out.concat(c ? seg.slice(1) : seg);
      }
      return resample(out, step);
    }
    const idx = [0].concat(cor.filter(i => i > 0 && i < n - 1), [n - 1]);
    let out = [];
    for (let c = 0; c < idx.length - 1; c++) {
      const run = pts.slice(idx[c], idx[c + 1] + 1), seg = run.length > 2 ? catmull(run, false) : run;
      out = out.concat(c ? seg.slice(1) : seg);
    }
    return resample(out, step);
  }
  DS.dense = dense;

  /* ── 연필 ── */
  function Pen(w, h, seed, o) {
    o = o || {};
    this.w = w; this.h = h; this.rng = RNG(seed || 1);
    this.sc = o.scale || S;
    this.gc = mk(w * this.sc, h * this.sc); this.g = this.gc.getContext('2d');
    this.fc = o.noFill ? null : mk(w * this.sc, h * this.sc); this.f = this.fc ? this.fc.getContext('2d') : null;
    const ox = o.origin ? o.origin[0] : w / 2, oy = o.origin ? o.origin[1] : h / 2;
    this.zoom = o.zoom || 1;                // 그림 배율: 모양만 줄이거나 키우고 선 굵기는 그대로 둔다
    const z = this.sc * this.zoom;
    this.g.setTransform(z, 0, 0, z, ox * this.sc, oy * this.sc);
    if (this.f) this.f.setTransform(z, 0, 0, z, ox * this.sc, oy * this.sc);
    this.g.lineCap = 'round'; this.g.lineJoin = 'round';
    this.ink = o.ink || DS.INK; this.g.strokeStyle = this.ink; this.g.fillStyle = this.ink;
    this.k = o.k == null ? 1 : o.k;         // 전체 진하기
    this.bold = o.bold == null ? 1.32 : o.bold;   // 선 굵기 배수
    this.jit = o.jit == null ? 1 : o.jit;   // 선 흔들림 배수 (윤곽은 같고 흔들림만 달라진다)
    this.T = [];                             // 변환 더미
    this.tx = 0; this.ty = 0; this.rot = 0; this.mx = 1; this.my = o.flipY ? -1 : 1; this.zs = 1;
  }
  const P = Pen.prototype;
  P.map = function (p) {
    let x = p[0] * this.zs, y = p[1] * this.zs;
    if (this.rot) { const c = Math.cos(this.rot), s = Math.sin(this.rot), nx = x * c - y * s; y = x * s + y * c; x = nx; }
    return [(x + this.tx) * this.mx, (y + this.ty) * this.my, p[2]];
  };
  P.at = function (x, y, rot, fn, zs) {
    const sv = [this.tx, this.ty, this.rot, this.zs];
    const q = this.map([x, y]);            // 중첩 변환
    this.tx = q[0] * this.mx; this.ty = q[1] * this.my; this.rot += rot || 0; this.zs *= zs || 1;
    fn(this);
    this.tx = sv[0]; this.ty = sv[1]; this.rot = sv[2]; this.zs = sv[3];
    return this;
  };
  P.mir = function (fn) { fn(this); this.mx = -this.mx; fn(this); this.mx = -this.mx; return this; };
  P._path = function (c, d, closed) {
    c.beginPath(); c.moveTo(d[0][0], d[0][1]);
    for (let i = 1; i < d.length; i++) c.lineTo(d[i][0], d[i][1]);
    if (closed) c.closePath();
  };
  P._stroke = function (d, o, closed) {
    const g = this.g, r = this.rng, n = d.length;
    if (n < 2) return;
    const w = (o.w || 0.5) * this.bold / this.zoom, a = Math.min(1, (o.a == null ? 1 : o.a) * 1.12) * this.k, jit = (o.jit == null ? 0.28 : o.jit) * this.jit, passes = o.passes || 2;
    for (let p = 0; p < passes; p++) {
      const ph1 = r() * 50, ph2 = r() * 50, ph3 = r() * 50, f1 = 0.12 + r() * 0.1, f2 = 0.33 + r() * 0.2, J = [];
      for (let i = 0; i < n; i++) {
        const a0 = d[Math.max(0, i - 1)], a1 = d[Math.min(n - 1, i + 1)];
        let nx = -(a1[1] - a0[1]), ny = a1[0] - a0[0]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        const off = jit * (Math.sin(i * f1 + ph1) + 0.55 * Math.sin(i * f2 + ph2)) + (r() - 0.5) * 0.12;
        const tan = jit * 0.4 * Math.sin(i * 0.2 + ph3);
        J.push([d[i][0] + nx * off - ny * tan * 0.3, d[i][1] + ny * off + nx * tan * 0.3]);
      }
      if (!closed && n > 3 && !o.noOver) {      // 끝을 살짝 지나치는 손버릇
        const e = 0.5 + r() * 0.9, b = 0.3 + r() * 0.8;
        const q0 = J[0], q1 = J[1], z0 = J[n - 1], z1 = J[n - 2];
        const l0 = Math.hypot(q0[0] - q1[0], q0[1] - q1[1]) || 1, l1 = Math.hypot(z0[0] - z1[0], z0[1] - z1[1]) || 1;
        J.unshift([q0[0] + (q0[0] - q1[0]) / l0 * b, q0[1] + (q0[1] - q1[1]) / l0 * b]);
        J.push([z0[0] + (z0[0] - z1[0]) / l1 * e, z0[1] + (z0[1] - z1[1]) / l1 * e]);
      }
      let i = 0; const m = J.length;
      while (i < m - 1) {
        const len = 3 + ((r() * 6) | 0), j = Math.min(m - 1, i + len);
        g.globalAlpha = Math.min(1, a * (0.62 + 0.38 * r()) * (p ? 0.72 : 1));
        g.lineWidth = w * (0.72 + 0.56 * r()) * (p ? 0.85 : 1);
        g.beginPath(); g.moveTo(J[i][0], J[i][1]);
        for (let k = i + 1; k <= j; k++) g.lineTo(J[k][0], J[k][1]);
        g.stroke(); i = j;
      }
    }
    g.globalAlpha = 1;
  };
  P._hatch = function (d, h) {
    const g = this.g, r = this.rng;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const q of d) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + 1;
    const ang = h.ang == null ? -0.9 : h.ang, gap = h.gap || 1.5, a = (h.a == null ? 0.5 : h.a) * this.k, w = (h.w || 0.3) * (0.5 + 0.5 * this.bold) / this.zoom;
    g.save(); this._path(g, d, true); g.clip();
    if (h.side) {
      g.beginPath(); const bw = x1 - x0, bh = y1 - y0, f = h.f == null ? 0.5 : h.f;
      if (h.side === 'r') g.rect(x0 + bw * f, y0 - 2, bw, bh + 4);
      else if (h.side === 'l') g.rect(x0 - 2, y0 - 2, bw * f + 2, bh + 4);
      else if (h.side === 'b') g.rect(x0 - 2, y0 + bh * f, bw + 4, bh);
      else if (h.side === 't') g.rect(x0 - 2, y0 - 2, bw + 4, bh * f + 2);
      g.clip();
    }
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let t = -R; t <= R; t += gap * (0.75 + 0.5 * r())) {
      const px = cx - sa * t, py = cy + ca * t, j1 = (r() - 0.5) * 0.9, j2 = (r() - 0.5) * 0.9;
      g.globalAlpha = Math.min(1, a * (0.45 + 0.55 * r())); g.lineWidth = w * (0.7 + 0.6 * r());
      g.beginPath();
      g.moveTo(px - ca * R - sa * j1, py - sa * R + ca * j1);
      g.quadraticCurveTo(px + (r() - 0.5) * 0.8, py + (r() - 0.5) * 0.8, px + ca * R - sa * j2, py + sa * R + ca * j2);
      g.stroke();
    }
    g.restore(); g.globalAlpha = 1;
  };
  /* 닫힌 모양: 종이색으로 채우고, 흑연 옅은 칠·빗금·윤곽선 */
  P.poly = function (pts, o) {
    o = o || {};
    const m = pts.map(p => this.map(p)), d = dense(m, true, o.s, o.step);
    if (this.f && o.paper !== false) {
      this.f.fillStyle = DS.FILL; this._path(this.f, d, true); this.f.fill();
      const g = this.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.88; this._path(g, d, true); g.fill(); g.restore();   // 뒤에 그린 선은 흐릿한 밑그림으로만 남긴다
    }
    if (o.tone) { this.g.globalAlpha = Math.min(1, o.tone * this.k); this._path(this.g, d, true); this.g.fill(); this.g.globalAlpha = 1; }
    if (o.hatch) (Array.isArray(o.hatch) ? o.hatch : [o.hatch]).forEach(h => this._hatch(d, h));
    if (o.line !== false) this._stroke(d, o, true);
    return this;
  };
  P.line = function (pts, o) {
    o = o || {};
    const m = pts.map(p => this.map(p));
    this._stroke(dense(m, false, o.s, o.step), o, false);
    return this;
  };
  P.sym = function (half, o) {      // x=0 축 대칭 윤곽
    const full = half.slice();
    for (let i = half.length - 1; i >= 0; i--) if (Math.abs(half[i][0]) > 1e-6) full.push([-half[i][0], half[i][1], half[i][2]]);
    return this.poly(full, o);
  };
  P.rect = function (x, y, w, h, o) {
    return this.poly([[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]], o);
  };
  P.ell = function (x, y, rx, ry, o) {
    o = Object.assign({ s: true }, o || {});
    const n = Math.max(8, Math.min(28, Math.round((rx + ry) * 0.9))), pts = [], ph = (o.ph || 0);
    for (let i = 0; i < n; i++) { const a = ph + i / n * 6.2832; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * (ry == null ? rx : ry)]); }
    return this.poly(pts, o);
  };
  P.seg = function (x1, y1, x2, y2, o) { return this.line([[x1, y1], [x2, y2]], o); };
  P.dot = function (x, y, r, a) {
    const q = this.map([x, y]); this.g.globalAlpha = (a == null ? 0.9 : a) * this.k;
    this.g.beginPath(); this.g.arc(q[0], q[1], r || 0.5, 0, 6.2832); this.g.fill(); this.g.globalAlpha = 1; return this;
  };
  P.scribble = function (x, y, r, o) {      // 나무·연기처럼 뭉글뭉글한 낙서
    o = o || {}; const rr = this.rng, pts = [], turns = o.turns || 2.2, n = Math.round(turns * 9);
    const ph = rr() * 6.28;
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = ph + t * turns * 6.2832, q = r * (0.45 + 0.55 * (o.spiral ? t : 0.75 + 0.25 * Math.sin(i * 1.7))) * (0.85 + 0.3 * rr());
      pts.push([x + Math.cos(a) * q, y + Math.sin(a) * q * (o.ry || 1)]);
    }
    return this.line(pts, Object.assign({ s: true, w: 0.34, a: 0.7, passes: 1 }, o));
  };
  P.erase = function (pts, o) {             // 흑연을 지우개로 지운 자리
    o = o || {}; const d = dense(pts.map(p => this.map(p)), true, o.s, o.step), g = this.g;
    g.save(); g.globalCompositeOperation = 'destination-out'; g.globalAlpha = o.a == null ? 1 : o.a; this._path(g, d, true); g.fill(); g.restore();
    return this;
  };
  P.eraseEll = function (x, y, rx, ry, o) {
    const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * (ry == null ? rx : ry)]); }
    return this.erase(pts, Object.assign({ s: true }, o || {}));
  };
  P.done = function (grainK) {
    grain(this.gc, grainK == null ? 0.38 : grainK, (this.rng() * 255) | 0, (this.rng() * 255) | 0);
    if (!this.fc) return this.gc;
    this.f.setTransform(1, 0, 0, 1, 0, 0); this.f.drawImage(this.gc, 0, 0);
    this.gc.width = this.gc.height = 0; this.gc = this.g = null;      // 다 쓴 밑그림 종이는 바로 버린다
    return this.fc;
  };
  DS.Pen = Pen;
})();
