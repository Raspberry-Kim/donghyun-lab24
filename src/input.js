/* 입력 — 마우스와 손가락. 누른 자리 · 누르고 있는 자리 · 뗀 자리를 알려 준다.
   Esc는 메뉴를 연다(시리즈 공통). 그 밖의 키와 게임패드는 받지 않는다. */
(function () {
  'use strict';
  const DS = window.DS, W = DS.W, H = DS.H;

  function Input(cv) {
    const s = this.s = { down: false, x: 0, y: 0, press: null, release: null, pauseEdge: false };
    const self = this;
    this.cv = cv; this.touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); this.id = null; this.onFirst = null; this.active = null; this.zone = null;
    const first = () => { if (self.onFirst) self.onFirst(); };
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };

    window.addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
      if (self.active && !self.active()) return;
      if (e.code !== 'Escape') return;
      e.preventDefault(); first(); s.pauseEdge = true;
    });
    const clear = () => { if (s.down) s.release = { x: s.x, y: s.y, cancel: true }; s.down = false; self.id = null; };
    this.clear = clear;
    window.addEventListener('blur', clear);

    /* 손가락이 버튼 위에서 시작하면 쪽이 굴러가지 않게 잡는다. 버튼이 아닌 자리에서는 쪽을 굴릴 수 있다 */
    cv.addEventListener('touchstart', e => {
      if (self.active && !self.active()) return;
      const t = e.changedTouches[0], q = pos(t);
      if (!self.zone || self.zone(q.x, q.y)) e.preventDefault();
    }, { passive: false });
    cv.addEventListener('pointerdown', e => {
      if (self.active && !self.active()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (self.id != null) return;                               // 손가락 하나만 받는다
      const q = pos(e); if (self.zone && !self.zone(q.x, q.y)) return;
      first(); e.preventDefault(); self.touch = e.pointerType === 'touch';
      self.id = e.pointerId; s.down = true; s.x = q.x; s.y = q.y; s.press = { x: q.x, y: q.y };
      try { cv.setPointerCapture(e.pointerId); } catch (_) { }
    });
    window.addEventListener('pointermove', e => { if (self.id !== e.pointerId) return; const q = pos(e); s.x = q.x; s.y = q.y; });
    const up = e => {
      if (self.id !== e.pointerId) return;
      const q = pos(e); s.x = q.x; s.y = q.y; s.down = false; self.id = null;
      s.release = { x: q.x, y: q.y, cancel: e.type === 'pointercancel' };
    };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', e => e.preventDefault());
  }
  Input.prototype.frame = function () { };
  /* 한 걸음이 끝나면 '방금 눌림 · 방금 뗌'을 지운다 */
  Input.prototype.endStep = function () { const s = this.s; s.press = null; s.release = null; s.pauseEdge = false; };
  DS.Input = Input;
})();
