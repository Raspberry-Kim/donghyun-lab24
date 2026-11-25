/* 동현디 앱: 동현랭 편집기 → 출전 규약(시작 스테이지 · 배경 색) → 게임.
   조작은 마우스와 손가락이다. 스테이지마다 가장 좋았던 별 수가 브라우저에 남는다. */
(function () {
'use strict';
const DS = window.DS, W = DS.W, H = DS.H, S = DS.S, UI = DS.UI;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const Q = new URLSearchParams(location.search), num = (n, d, lo, hi) => { const v = parseInt(Q.get(n), 10); return isNaN(v) ? d : Math.max(lo, Math.min(hi, v)); };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const cv = $('#game'), R = new DS.Render(cv), IN = new DS.Input(cv), SFX = DS.Sfx, inp = IN.s;
const canvas = cv;
const STEP = 1000 / 60, TURN = 44, NSTAGE = DS.STAGES.length, NPAPER = DS.PAPERS.length, NWORD = '열두';
const fmt = u => (Math.round(u * 10) / 10).toFixed(1);
const HOW = ['ideal', 'none', 'late', 'stack'].indexOf(Q.get('how')) >= 0 ? Q.get('how') : 'ideal';
const A = DS.app = { render: R, input: IN,
  scr: 'load', t: 0, g: null, live: false, turn: 0, next: 0, hold: '',
  auto: Q.get('auto') === '1', debug: Q.get('debug') === '1', manual: false, loadI: 0, st: { step: 0, draw: 0, fps: 0, n: 0 }
};
let tab = 'play', menu = null, last = 0, acc = 0;
const inGame = () => A.scr === 'game' && !!A.g && A.turn === 0 && (A.g.mode === 'play' || A.g.mode === 'intro');
const inResult = () => A.scr === 'game' && !!A.g && A.turn === 0 && (A.g.mode === 'done' || A.g.mode === 'fail');
IN.active = () => A.live && tab === 'play';
IN.onFirst = () => SFX.unlock();
/* 손가락을 잡는 자리: 게임 중에는 버튼 줄과 메뉴 표식, 결과 화면에서는 버튼. 그 밖에서는 쪽이 굴러간다 */
IN.zone = (x, y) => {
  if (menu) return false;
  if (inGame()) return y >= (A.g.dial ? UI.dial.panel.y : 340) || UI.hit(UI.menu, x, y, 4);
  if (inResult()) return UI.result(A.g).some(b => UI.hit(b, x, y, 3));
  return false;
};
/* 누르거나 화면으로 돌아올 때마다 멈춘 소리 장치를 다시 켠다 */
['pointerdown', 'keydown', 'touchend', 'click'].forEach(ev => addEventListener(ev, () => SFX.wake(), true));
document.addEventListener('visibilitychange', () => { if (!document.hidden) SFX.wake(); }); addEventListener('pageshow', () => SFX.wake()); addEventListener('focus', () => SFX.wake());

/* ---------- 화면 전환·소리·탭 ---------- */
$('#theme').onclick = () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; $('#theme').setAttribute('aria-pressed', String(dark)); };
const SOUND_KEY = 'donghyundi:sound';
try { if (localStorage.getItem(SOUND_KEY) === 'off') SFX.setMuted(true); } catch (e) { }
function sndUI() { const b = $('#sound'), on = !SFX.muted; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('muted', !on); b.title = on ? '효과음 끄기 (M)' : '효과음 켜기 (M)'; }
function setSound(on) { SFX.setMuted(!on); if (on) SFX.unlock(); try { localStorage.setItem(SOUND_KEY, on ? 'on' : 'off'); } catch (e) { } sndUI(); }
$('#sound').onclick = () => setSound(SFX.muted); sndUI();
const typing = () => { const el = document.activeElement; return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.tagName === 'SELECT'); };
document.addEventListener('keydown', e => { if (e.code !== 'KeyM' || e.metaKey || e.ctrlKey || e.altKey || typing()) return; setSound(SFX.muted); });
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
  tab = b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x => { const on = x.dataset.tab === tab; x.classList.toggle('active', on); on ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current'); });
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== 'tab-' + tab);
  if (tab === 'play') fit(); else { IN.clear(); if (inGame() && !menu && !A.auto) mainMenu(); artCards(); }
});
$('.brand').onclick = e => { e.preventDefault(); document.querySelector('[data-tab=play]').click(); scrollTo({ top: 0, behavior: 'smooth' }); };

/* ---------- 게임 소개 탭의 표와 그림 ---------- */
const hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
$('#food-grid').innerHTML = Object.keys(DS.FOODS).map(k => { const f = DS.FOODS[k]; return `<article><canvas width="132" height="132" data-art="${f.spr}" role="img" aria-label="${esc(f.name)} 연필 그림"></canvas><h4>${esc(f.name)}</h4><small>${esc(f.group)}</small><p>탄수화물 <b>${f.g} g</b></p></article>`; }).join('');
$('#stage-table').innerHTML = '<thead><tr><th>스테이지</th><th>이름</th><th>익히는 것</th><th>시각</th><th>시작 혈당</th><th>탄수화물 비 · 교정 계수</th><th>음식과 운동</th></tr></thead><tbody>' + DS.STAGES.map((st, i) => {
  const ratio = [`${st.icr} g · ${st.isf}`].concat((st.sched || []).map(s => `${hm(st.clock + s.t)}부터 ${s.icr} g · ${s.isf}`)).join('<br>');
  const items = st.foods.map(f => `${hm(st.clock + f.t)} ${DS.FOODS[f.f].name}`).concat((st.ex || []).map(e => `${hm(st.clock + e.t0)}–${hm(st.clock + e.t1)} ${e.name}`)).join('<br>');
  return `<tr><td data-l="스테이지"><span>${i + 1}</span></td><td data-l="이름"><span><b>${esc(st.name)}</b></span></td><td data-l="익히는 것"><span>${esc(st.goal)}</span></td><td data-l="시각"><span>${hm(st.clock)}–${hm(st.clock + st.dur)}</span></td><td data-l="시작 혈당"><span>${st.bg0}${st.k0 ? `<br>케톤 ${st.k0}` : ''}${st.iob0 ? `<br>몸속 인슐린 ${st.iob0}단위` : ''}</span></td><td data-l="탄수화물 비 · 교정 계수"><span>${ratio}</span></td><td data-l="음식과 운동"><span>${items}</span></td></tr>`;
}).join('') + '</tbody>';
function artCards() {
  if (A.scr === 'load') return;
  document.querySelectorAll('canvas[data-art]').forEach(c => {
    const s = DS.ART.get(c.dataset.art), f = s.frames[0], g = c.getContext('2d'), k = Math.min((c.width - 12) / f.width, (c.height - 12) / f.height);
    g.clearRect(0, 0, c.width, c.height); g.drawImage(f, (c.width - f.width * k) / 2, (c.height - f.height * k) / 2, f.width * k, f.height * k);
  });
}

/* ---------- 동현랭 편집기(동현랭 시리즈와 같은 모양) ---------- */
for(const ex of examples){const o=document.createElement('option');o.value=ex.id;o.textContent=ex.title;$('#example').append(o);}
const DH_TOKEN=/(ㅋㅋ.*$)|(나는 동현이냐\?|동현이구나)|(오겡끼데스까)|(신중동역|신중동|뭉치)|(뿡뿡뿡|뿡뿡|포동이)|(꽥꽥)|(동+현아)|(동+현)|(도오*옹)|(ㅠ+)|(뚱띠|또치)/g;
const DH_CLS=[null,'t-cmt','t-frame','t-halt','t-ctl','t-out','t-in','t-assign','t-var','t-num','t-minus','t-op'];
function dhLine(line){let html='',last=0;line.replace(DH_TOKEN,(m,...gr)=>{const idx=gr[gr.length-2];html+=esc(line.slice(last,idx));const k=gr.slice(0,11).findIndex(x=>x!==undefined)+1;html+=`<span class="${DH_CLS[k]}">${esc(m)}</span>`;last=idx+m.length;return m;});return html+esc(line.slice(last));}
const code=$('#code'), area=document.createElement('div'), hl=document.createElement('div');
area.className='code-area'; hl.id='hl'; hl.setAttribute('aria-hidden','true'); code.parentNode.insertBefore(area,code); area.append(hl,code);
function hlSync(){hl.scrollTop=code.scrollTop;hl.scrollLeft=code.scrollLeft;}
function hlMetrics(){const cs=getComputedStyle(code);for(const p of ['paddingTop','paddingRight','paddingBottom','paddingLeft','fontFamily','fontSize','lineHeight','tabSize','letterSpacing'])hl.style[p]=cs[p];}
function highlight(){hlMetrics();hl.innerHTML=code.value.split('\n').map(l=>`<span class="ln">${dhLine(l)||' '}</span>`).join('')+'<span class="ln"> </span>';hlSync();}
code.addEventListener('scroll',()=>{hlSync();$('#lines').scrollTop=code.scrollTop;});addEventListener('resize',()=>{highlight();fit();});
function indent(){
  const text=code.value,lines=text.split('\n'),lead=l=>l.length-l.replace(/^[ \t]+/,'').length;
  const next=lines.map(l=>{const b=l.slice(lead(l));if(!b)return '';if(b.startsWith('ㅋㅋ'))return '   '+b;const s=b.split('~')[0].replace(/ㅋㅋ.*$/,'').trim();return (s==='나는 동현이냐?'||s==='동현이구나'?'':'  ')+b;});
  const {selectionStart:a,selectionEnd:b,selectionDirection:dir,scrollTop:y,scrollLeft:x}=code;
  const moved=p=>{let o=0,n=0;for(let i=0;i<lines.length;i++){const L=lines[i].length;if(p<=o+L){const c=p-o,ol=lead(lines[i]),nl=lead(next[i]);return n+Math.min(next[i].length,c<ol?nl:c-ol+nl);}o+=L+1;n+=next[i].length+1;}return n;};
  const value=next.join('\n'),na=moved(a),nb=moved(b);if(value===text&&na===a&&nb===b)return;if(value!==text)code.value=value;code.setSelectionRange(na,nb,dir);code.scrollTop=y;code.scrollLeft=x;
}
function codeChanged(e){if(!e?.isComposing)indent();const n=code.value.split('\n').length;$('#line-count').textContent=n+'줄';$('#lines').textContent=Array.from({length:n},(_,i)=>i+1).join('\n');highlight();autoPreview();}
code.addEventListener('compositionend',()=>codeChanged());
function codeLead(){const a=code.selectionStart,v=code.value,ls=v.lastIndexOf('\n',a-1)+1,le=v.indexOf('\n',ls);return {a,ls,lead:/^[ \t]*/.exec(v.slice(ls,le<0?v.length:le))[0].length};}
document.addEventListener('selectionchange',()=>{if(document.activeElement!==code||code.selectionStart!==code.selectionEnd)return;const {a,ls,lead}=codeLead();if(a-ls<lead)code.setSelectionRange(ls+lead,ls+lead);});
code.addEventListener('beforeinput',e=>{const {a,ls,lead}=codeLead();if(a!==code.selectionEnd)return;if(e.inputType==='deleteContentBackward'&&ls>0&&a>ls&&a-ls<=lead){e.preventDefault();code.setRangeText('',ls-1,a,'end');codeChanged();}});
code.oninput=codeChanged;
code.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'){e.preventDefault();sortie();}});
function selectExample(){const ex=examples.find(e=>e.id===$('#example').value);code.value=ex.code;$('#example-note').textContent=ex.note;codeChanged();}
$('#example').onchange=selectExample;
$('#save').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([code.value+'\n'],{type:'text/plain;charset=utf-8'}));a.download='sortie.dh';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
$('#open').onchange=async e=>{const f=e.target.files[0];if(!f)return;code.value=(await f.text()).replace(/\r/g,'').replace(/\n$/,'');codeChanged();e.target.value='';};
$('#run').onclick=()=>sortie();


/* ---------- 출전 규약: 첫 정수 시작 스테이지(필수) · 둘째 정수 배경 색 ---------- */
const DEFAULT = { stage: 1, bg: 1 };
let cfg = { stage: num('stage', 1, 1, NSTAGE), bg: num('bg', 1, 1, NPAPER) };
function parseSortie(out) {
  const tok = out.split(/\s+/).filter(Boolean).map(Number), c = { ...DEFAULT }, err = [];
  if (tok.length === 0) return { c, go: false, err: [] };
  const [st, bg] = tok, int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
  if (!int(st, 1, NSTAGE)) err.push(`첫 정수 ${st}은(는) 시작 스테이지가 아니다. 1~${NSTAGE}만 된다.`); else c.stage = st;
  if (!err.length && tok.length >= 2) { if (!int(bg, 1, NPAPER)) err.push(`둘째 정수 ${bg}은(는) 배경 색 번호가 아니다. ${DS.PAPERS.map((p, i) => (i + 1) + ' ' + p.name).join(' · ')} 중 하나를 출력하자.`); else c.bg = bg; }
  if (!err.length && tok.length > 2) err.push(`정수가 ${tok.length}개 나왔다. 시작 스테이지 · 배경 색 두 개까지만 읽는다.`);
  return { c, go: !err.length, err };
}
const paperName = c => DS.PAPERS[c.bg - 1].name, stageName = i => DS.STAGES[i].name;
function sortieCard(c) {
  $('#sortie-card').innerHTML = [['시작 스테이지', `${c.stage} · ${stageName(c.stage - 1)}`], ['익히는 것', DS.STAGES[c.stage - 1].goal], ['배경 색', `${c.bg} · ${paperName(c)}`], ['조작', '인슐린 버튼을 누르면 눈금이 나오고, 용량을 정해 맞는다 · 주스 버튼 · 빨리 감기 버튼']].map(([a, b]) => `<div><span>${a}</span><strong>${esc(b)}</strong></div>`).join('');
  $('#stamp-mode').innerHTML = `스테이지 ${c.stage} <span>${esc(stageName(c.stage - 1))}</span>`;
}
function result(text, kind) { const r = $('#result'); r.textContent = text; r.dataset.kind = kind || ''; }
function status(t, kind) { const s = $('#status'); s.textContent = t; s.dataset.kind = kind || ''; }
function readyLabels() { $('#day').textContent = '출전 준비'; $('#turn-badge').textContent = `스테이지 ${cfg.stage} · ${stageName(cfg.stage - 1)}`; $('#tile-info').textContent = `스테이지 ${cfg.stage} 「${stageName(cfg.stage - 1)}」부터. 종이는 ${paperName(cfg)}.`; $('#hint').innerHTML = ''; }
let previewT = 0;
function autoPreview() { clearTimeout(previewT); previewT = setTimeout(() => { if (A.live || A.auto) return;   /* 자동 시험(?auto=1)에서는 주소로 준 값을 그대로 쓴다 */ try { const r = Donghyun.run(code.value, { maxSteps: 300000 }); const p = parseSortie(r.output); if (!p.err.length && p.go) { cfg = p.c; sortieCard(cfg); readyLabels(); } } catch (e) { } }, 250); }
function sortie() {
  if (A.live || A.scr === 'load') return;
  let out;
  try { const r = Donghyun.run(code.value, { maxSteps: 300000 }); out = r.output; }
  catch (e) { result(`동현랭 오류${e.line ? ` (${e.line}줄)` : ''}: ${e.message}`, 'error'); status('동현랭 오류', 'error'); return; }
  const p = parseSortie(out);
  if (p.err.length) { result('출전 규약 오류: ' + p.err[0], 'error'); status('출전 규약 오류', 'error'); return; }
  if (!p.go) { result(`정수가 하나도 출력되지 않았다. 첫 정수로 시작 스테이지(1~${NSTAGE})를 출력해야 나선다.`, 'error'); status('출전 규약 오류', 'error'); return; }
  cfg = p.c; sortieCard(cfg); go();
}

/* ---------- 준비: 그림을 조금씩 미리 그려 둔다 ---------- */
const WARM = DS.WARM;
function warm(then) {
  const t0 = performance.now();
  while (A.loadI < WARM.length && performance.now() - t0 < 24) DS.ART.get(WARM[A.loadI++]);
  draw();
  if (A.loadI < WARM.length) { setTimeout(() => warm(then), 0); return; }
  setTimeout(() => { R.prepare(); then(); last = 0; artCards(); }, 0);
}
/* 종이 색을 바꾼다. 바뀌면 그림을 모두 새로 그린다 */
function setPaper(bg, then) {
  if (!DS.setPaper(bg - 1)) { then(); return; }
  DS.ART.clear(); if (R.paper) R.paper.width = R.paper.height = 0;
  R.paper = DS.makePaper(W * S, H * S, 11); document.documentElement.style.setProperty('--ds-paper', DS.PAPERS[DS.paperIdx].css);
  A.scr = 'load'; A.loadI = 0; setTimeout(() => warm(then), 0);
}

/* ---------- 별 기록 ---------- */
const STAR_KEY = 'donghyundi:stars';
function readStars() { let a = []; try { a = JSON.parse(localStorage.getItem(STAR_KEY) || '[]'); } catch (e) { } if (!Array.isArray(a)) a = []; return Array.from({ length: NSTAGE }, (_, i) => Number.isInteger(a[i]) && a[i] >= 0 && a[i] <= 3 ? a[i] : 0); }
let STARS = readStars();
function renderStars() {
  $('#star-list').innerHTML = DS.STAGES.map((s, i) => `<li><b>${i + 1}</b><span>${esc(s.name)}</span><i aria-label="별 ${STARS[i]}개">${'★'.repeat(STARS[i])}${'☆'.repeat(3 - STARS[i])}</i></li>`).join('');
  const x = $('#star-reset'); x.disabled = !STARS.some(v => v > 0); x.classList.remove('armed'); x.textContent = '기록 지우기';
}
function saveStars(i, n) { STARS = readStars(); if (n > STARS[i]) { STARS[i] = n; try { localStorage.setItem(STAR_KEY, JSON.stringify(STARS)); } catch (e) { } } renderStars(); }
{ let t = 0; const x = $('#star-reset'); x.onclick = () => { if (!x.classList.contains('armed')) { x.classList.add('armed'); x.textContent = '정말 지운다'; t = setTimeout(() => { x.classList.remove('armed'); x.textContent = '기록 지우기'; }, 4000); return; } clearTimeout(t); try { localStorage.removeItem(STAR_KEY); } catch (e) { } STARS = readStars(); renderStars(); status('별 기록을 지웠다.'); }; }

/* ---------- 시작·종료 ---------- */
const HINT0 = '<span>인슐린을 누르면 눈금이 나온다</span><span><kbd>Esc</kbd>메뉴</span>';
function liveUI() { $('#setup-panel').hidden = true; $('#hud').hidden = false; $('#board-wrap').classList.add('live'); $('#full').disabled = false; fit(); $('#board-wrap').focus({ preventScroll: true }); }
function go() {                       // 출전: 종이 색을 맞추고 바로 게임으로
  A.live = true; A.g = null; closeMenu(); SFX.unlock(); IN.clear();
  liveUI(); if (!A.auto) $('#board-wrap').scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  $('#log').innerHTML = ''; log(`출전. 스테이지 ${cfg.stage} 「${stageName(cfg.stage - 1)}」부터, ${paperName(cfg)} 종이.`);
  result('출전했다.'); status('진행 중'); hud();
  setPaper(cfg.bg, () => startStage(cfg.stage - 1));
}
function startStage(i) {
  feteOff(); IN.clear();
  A.g = new DS.Game({ stage: i, sfx: SFX.play }); A.turn = 0; A.hold = ''; A.scr = 'game'; A.t = 0; watch = null; R.pressT = 0;
  $('#hint').innerHTML = HINT0; status('진행 중'); observe(); hud();
}
/* 열두 스테이지를 모두 마친 축하: 팡파르(약 10초)와 꽃비. 마친 화면을 떠나면 함께 멈춘다. 소리를 꺼 두어도 꽃비는 내린다 */
function fete(g) { if (!SFX.pomp()) SFX.play('clear'); DHPETALS.start($('.board-stage.ds-board'), { dur: 10.4, alive: () => A.g === g && g.mode === 'done', cut: () => SFX.stop() }); }
function feteOff() { DHPETALS.stop(); SFX.stop(); }
function backToSetup() {
  feteOff();
  A.g = null; A.live = false; A.turn = 0; A.hold = ''; closeMenu(); IN.clear(); watch = null;
  $('#setup-panel').hidden = false; $('#hud').hidden = true; $('#board-wrap').classList.remove('live'); exitFull(); $('#full').disabled = true;
  A.scr = 'ready'; A.t = 0;
  readyLabels(); status('출전 준비'); result('다시 나서려면 코드를 고치거나 그대로 출전을 누르자.'); renderStars(); renderSlotList(); fit();
}
$('#concede').onclick = () => { if (!A.live || A.scr === 'load') return; if (inGame()) confirmMenu('포기하고 출전 준비로 돌아갈까?', [['포기한다', backToSetup], ['계속 한다', () => { }]]); else if (!menu) backToSetup(); };

/* ---------- 옆 칸: 정보·기록 ---------- */
function log(t) { const li = document.createElement('li'); li.textContent = t; const l = $('#log'); l.prepend(li); while (l.children.length > 40) l.lastChild.remove(); }
let hudText = '';
function hud() {
  const g = A.g; let rows;
  if (!g) rows = [['시작 스테이지', `${cfg.stage} · ${stageName(cfg.stage - 1)}`], ['종이', paperName(cfg)]];
  else rows = [['스테이지', `${g.stage + 1} / ${NSTAGE} · ${g.S.name}`], ['시각', g.clock()], ['혈당', `${Math.round(g.bg)} mg/dL`], ['범위 안', `${Math.round(g.tir())}%`], ['몸속 인슐린', `${fmt(g.iob())}단위`], ['케톤', `${fmt(g.k)} mmol/L`], ['탄수화물 비', `${g.icr} g에 1단위`], ['교정 계수', `1단위에 ${g.isf} mg/dL`], ['주사', `${g.inj.length}번 · ${fmt(g.totalU())}단위`], ['주스', `${g.juices.length}팩 · 남은 ${g.juiceLeft}팩`]];
  const html = rows.map(([a, b]) => `<div><span>${a}</span><strong>${esc(b)}</strong></div>`).join('');
  if (html !== hudText) { hudText = html; $('#info-card').innerHTML = html; }
  if (g) { const d = `스테이지 ${g.stage + 1} · ${g.S.name}`, b = `${g.clock()} · 혈당 ${Math.round(g.bg)}`; if ($('#day').textContent !== d) $('#day').textContent = d; if ($('#turn-badge').textContent !== b) $('#turn-badge').textContent = b; }
}
/* 게임 상태가 바뀐 것을 보고 기록을 남긴다 */
const ALARM_LOG = { vlow: '혈당이 54 아래로 내려갔다.', low: '혈당이 70 아래로 내려갔다.', ket: '케톤이 1.5를 넘었다.', vhigh: '혈당이 250을 넘었다.' };
let watch = null;
function seen(g) { const ex = g.exNow(); return { mode: g.mode, inj: g.inj.length, ju: g.juices.length, eat: g.foods.filter(f => f.done).length, ex: ex ? ex.name : '', alarm: g.alarm }; }
function observe() {
  const g = A.g, w = watch, now = seen(g);
  if (!w) { log(`스테이지 ${g.stage + 1} 「${g.S.name}」 시작. ${g.S.goal}.`); $('#tile-info').textContent = g.S.goal; }
  else {
    if (now.inj > w.inj) { const i = g.inj[g.inj.length - 1]; log(`${g.clock()} 인슐린 ${fmt(i.u)}단위. 혈당 ${Math.round(i.bg)}.`); }
    if (now.ju > w.ju) log(`${g.clock()} 주스 한 팩(15 g). 혈당 ${Math.round(g.bg)}.`);
    if (now.eat > w.eat) g.foods.filter(f => f.done).slice(w.eat - now.eat).forEach(f => log(`${g.clock()} ${f.name}(${f.g} g)을 먹었다.`));
    if (now.ex !== w.ex) log(now.ex ? `${g.clock()} ${now.ex} 시작.` : `${g.clock()} ${w.ex} 끝.`);
    if (now.alarm && now.alarm !== w.alarm) log(`${g.clock()} ${ALARM_LOG[now.alarm]}`);
    if (w.mode === 'play' && now.mode === 'done') {
      log(`스테이지 ${g.stage + 1} 「${g.S.name}」 마침. 범위 안 ${Math.round(g.tir())}%, 별 ${g.stars}개.`); saveStars(g.stage, g.stars); status(`스테이지 ${g.stage + 1} 마침`); $('#hint').innerHTML = '';
      if (g.stage === NSTAGE - 1) { fete(g); log(`축하한다. ${NWORD} 스테이지를 모두 마쳤다.`); status(`${NWORD} 스테이지 마침`); }
    }
    if (w.mode === 'play' && now.mode === 'fail') { log(`스테이지 ${g.stage + 1} 「${g.S.name}」에서 멈췄다. ${g.fail === 'low' ? '저혈당이 깊었다.' : '케톤이 3.0에 닿았다.'}`); status('멈췄다', 'error'); $('#hint').innerHTML = ''; }
  }
  watch = now;
}

/* ---------- 메뉴(일시정지) ---------- */
function openMenu(title, items, onCancel) { if (A.g && A.g.dial) A.g.dialCancel(); A.hold = ''; menu = { title, items: items.map(it => Array.isArray(it) ? { label: it[0], fn: it[1] } : it), onCancel }; menu.i = Math.max(0, menu.items.findIndex(it => !it.off)); drawMenu(); IN.clear(); inp.release = null; const el = document.activeElement; if (el && el.tagName === 'BUTTON') el.blur(); }
function drawMenu() { const m = $('#menu'); if (!menu) { m.hidden = true; return; } m.hidden = false; m.className = 'game-menu center'; m.innerHTML = (menu.title ? `<h4>${esc(menu.title)}</h4>` : '') + menu.items.map((it, i) => `<div class="mi ${i === menu.i ? 'sel' : ''} ${it.off ? 'off' : ''}" role="menuitem" data-i="${i}"><span>${esc(it.label)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}</div>`).join(''); m.querySelectorAll('.mi').forEach(el => el.onclick = e => { e.stopPropagation(); if (!menu) return; menu.i = +el.dataset.i; pickMenu(); }); const s = m.querySelector('.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); }
function closeMenu() { menu = null; $('#menu').hidden = true; last = 0; }
function cancelMenu() { const c = menu && menu.onCancel; closeMenu(); if (c) c(); }
function pickMenu() { const it = menu.items[menu.i]; if (!it || it.off) return; closeMenu(); SFX.play('ok'); it.fn(); }
function confirmMenu(q, opts, back) { openMenu(q, opts.map(([label, fn]) => ({ label, fn })), back); }
function mainMenu() {
  openMenu('잠시 멈춤', [['계속 한다', () => { }], ['저장', saveMenu], ['불러오기', loadMenu], [SFX.muted ? '소리 켜기' : '소리 끄기', () => { setSound(SFX.muted); mainMenu(); }],
    ['이 스테이지 다시', () => confirmMenu('이 스테이지를 처음부터 다시 할까?', [['다시 한다', () => { log('스테이지를 처음부터 다시 한다.'); startStage(A.g.stage); }], ['계속 한다', () => { }]], mainMenu)],
    ['포기하고 출전 준비로', () => confirmMenu('포기하고 출전 준비로 돌아갈까?', [['포기한다', backToSetup], ['계속 한다', () => { }]], mainMenu)]]);
}

/* ---------- 저장·불러오기: 브라우저 칸 3개 + .dhsave 파일 ---------- */
const SAVE_FORMAT = 'donghyundi-save', SAVE_VERSION = 1, SLOT_KEY = n => 'donghyundi:slot' + n, SLOTS = 3;
function snapshot() {
  const g = A.g; if (!g || !inGame()) throw new Error('지금은 저장할 수 없다.');
  const logs = [...$('#log').children].reverse().map(li => li.textContent);
  return { format: SAVE_FORMAT, version: SAVE_VERSION, savedAt: new Date().toISOString(), summary: { stage: g.stage + 1, stageName: g.S.name, clock: g.clock(), bg: Math.round(g.bg), tir: Math.round(g.tir()) }, cfg: { ...cfg }, state: g.save(), logs };
}
function restore(data) {
  if (!data || data.format !== SAVE_FORMAT) throw new Error('동현디 저장 파일이 아니다.');
  if (data.version !== SAVE_VERSION) throw new Error('지원하지 않는 저장 형식 버전이다(' + data.version + ').');
  const g = DS.Game.load(data.state, { sfx: SFX.play });                    // 맞지 않으면 여기서 멈춘다. 지금 판은 그대로 남는다
  const c = data.cfg || {}, int = (v, lo, hi, d) => Number.isInteger(v) && v >= lo && v <= hi ? v : d;
  cfg = { stage: int(c.stage, 1, NSTAGE, g.stage + 1), bg: int(c.bg, 1, NPAPER, 1) };
  feteOff();
  const fresh = !A.live;
  A.g = null; A.live = true; A.turn = 0; A.hold = ''; closeMenu(); SFX.unlock(); IN.clear(); sortieCard(cfg); liveUI();
  if (fresh && !A.auto) $('#board-wrap').scrollIntoView({ block: 'nearest', behavior: 'auto' });      // 불러오기 칸은 판에서 멀다. 곧바로 판으로 옮긴다
  const l = $('#log'); l.innerHTML = ''; for (const t of (Array.isArray(data.logs) ? data.logs : []).slice(-38)) log(String(t).slice(0, 200));
  status('불러오는 중');
  setPaper(cfg.bg, () => {
    A.g = g; A.scr = 'game'; A.t = 0; R.pressT = 0; watch = seen(g);
    log('저장한 판을 불러왔다.'); $('#tile-info').textContent = g.S.goal; $('#hint').innerHTML = HINT0; status('진행 중'); hud();
    openMenu('저장한 판을 불러왔다. 준비되면 계속 한다.', [['계속 한다', () => { }], ['메뉴', mainMenu]], () => { });
  });
}
function readSlot(n) { try { const t = localStorage.getItem(SLOT_KEY(n)); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
function slotNote(d) { if (!d || !d.summary) return '비어 있음'; const t = new Date(d.savedAt), pad = v => String(v).padStart(2, '0'), q = d.summary; return `스테이지 ${q.stage} · ${q.clock} · 혈당 ${q.bg} · ${t.getMonth() + 1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`; }
function toast(t, kind) { log(t); status(t, kind); }
function saveToSlot(n) { let d; try { d = snapshot(); } catch (e) { toast(e.message); return; } try { localStorage.setItem(SLOT_KEY(n), JSON.stringify(d)); toast(`브라우저 칸 ${n}에 저장했다.`); renderSlotList(); } catch (e) { toast('브라우저 저장에 실패했다. 파일로 내려받아 저장하자.'); } }
function deleteSlot(n) { try { localStorage.removeItem(SLOT_KEY(n)); } catch (e) { } renderSlotList(); }
function saveToFile() { let d; try { d = snapshot(); } catch (e) { toast(e.message); return; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d)], { type: 'application/json' })); a.download = `donghyundi-stage${d.summary.stage}-${d.summary.clock.replace(':', '')}.dhsave`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('저장 파일을 내려받았다.'); }
const eul = n => n === 2 ? '를' : '을';
function saveMenu() {
  const items = [];
  for (let n = 1; n <= SLOTS; n++) { const d = readSlot(n); items.push({ label: `브라우저 칸 ${n}`, note: slotNote(d), fn: () => { if (d) confirmMenu(`칸 ${n}에 덮어쓸까?`, [['덮어쓴다', () => { saveToSlot(n); mainMenu(); }], ['그만둔다', saveMenu]], saveMenu); else { saveToSlot(n); mainMenu(); } } }); }
  items.push({ label: '파일로 내려받기', note: '.dhsave', fn: () => { saveToFile(); mainMenu(); } });
  items.push({ label: '브라우저 칸 지우기', note: '', off: !Array.from({ length: SLOTS }, (_, i) => readSlot(i + 1)).some(Boolean), fn: deleteMenu });
  openMenu('저장', items, mainMenu);
}
function deleteMenu() {
  const items = [];
  for (let n = 1; n <= SLOTS; n++) { const d = readSlot(n); items.push({ label: `브라우저 칸 ${n}`, note: slotNote(d), off: !d, fn: () => confirmMenu(`칸 ${n}${eul(n)} 지울까? 되돌릴 수 없다.`, [['지운다', () => { deleteSlot(n); toast(`브라우저 칸 ${n}${eul(n)} 지웠다.`); deleteMenu(); }], ['그만둔다', deleteMenu]], deleteMenu) }); }
  openMenu('지울 칸', items, saveMenu);
}
function loadFrom(d) { try { restore(d); } catch (e) { const msg = '불러오기 실패: ' + e.message; if (A.live) { toast(msg, 'error'); if (inGame() && !menu) mainMenu(); } else { result(msg, 'error'); status('불러오기 실패', 'error'); } } }
function loadMenu() {
  const items = [];
  for (let n = 1; n <= SLOTS; n++) { const d = readSlot(n); items.push({ label: `브라우저 칸 ${n}`, note: slotNote(d), off: !d, fn: () => confirmMenu('지금 판을 두고 불러올까?', [['불러온다', () => loadFrom(readSlot(n))], ['그만둔다', loadMenu]], loadMenu) }); }
  items.push({ label: '파일에서 불러오기', note: '.dhsave', fn: () => { mainMenu(); $('#load-file').click(); } });
  openMenu('불러오기', items, mainMenu);
}
$('#load-file').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (A.scr === 'load') return; let d = null; try { d = JSON.parse(await f.text()); } catch (err) { } loadFrom(d); };
$('#load-file-setup').onchange = $('#load-file').onchange;
$('#load-label').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#load-file-setup').click(); } });
function renderSlotList() {
  const box = $('#slot-list'); box.innerHTML = '';
  for (let n = 1; n <= SLOTS; n++) {
    const d = readSlot(n), b = document.createElement('button'); b.className = 'slot-btn'; b.type = 'button'; b.disabled = !d;
    b.innerHTML = `<b>칸 ${n}</b><span>${esc(slotNote(d))}</span>${d && d.summary ? `<small>${esc(d.summary.stageName || '')} · 범위 안 ${esc(d.summary.tir)}%</small>` : ''}`;
    b.onclick = () => { if (A.scr === 'load') return; loadFrom(readSlot(n)); };
    const row = document.createElement('div'); row.className = 'slot-row'; row.append(b);
    if (d) {
      const x = document.createElement('button'); x.className = 'slot-del'; x.type = 'button'; x.textContent = '지우기'; x.setAttribute('aria-label', `칸 ${n} 지우기`);
      let t = 0; x.onclick = () => { if (!x.classList.contains('armed')) { x.classList.add('armed'); x.textContent = '정말 지운다'; t = setTimeout(() => { x.classList.remove('armed'); x.textContent = '지우기'; }, 4000); return; } clearTimeout(t); deleteSlot(n); status(`브라우저 칸 ${n}${eul(n)} 지웠다.`); };
      row.append(x);
    }
    box.append(row);
  }
}
renderSlotList();
function menuKey(k) {                 // up · down · ok · back
  if (!menu) return;
  if (k === 'up' || k === 'down') { const n = menu.items.length; menu.i = (menu.i + (k === 'up' ? -1 : 1) + n) % n; SFX.play('tick'); drawMenu(); }
  else if (k === 'ok') pickMenu(); else if (k === 'back') cancelMenu();
}
const MENUKEY = { ArrowUp: 'up', ArrowDown: 'down', Space: 'ok', Enter: 'ok', NumpadEnter: 'ok', Escape: 'back' };
document.addEventListener('keydown', e => {          // 메뉴가 떠 있는 동안은 키를 여기서 받는다
  if (!menu || tab !== 'play' || e.metaKey || e.ctrlKey || e.altKey || typing()) return;
  const k = MENUKEY[e.code]; if (!k) return;
  e.preventDefault(); e.stopPropagation(); if (e.repeat && k !== 'up' && k !== 'down') return; menuKey(k);
});

/* ---------- 화면 크기 ---------- */
function fit() {
  const full = $('#stage-full'), ratio = canvas.width / canvas.height, h = el => el && el.offsetHeight || 0;
  if (full.classList.contains('fs')) {
    const side = full.classList.contains('side'), cs = getComputedStyle(full);
    let aw = full.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), ah = full.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (side) aw -= 2 * 190 + 20; else ah -= h(full.querySelector('.board-top')) + h(full.querySelector('.board-bottom')) + 30;
    canvas.style.width = Math.floor(Math.max(120, Math.min(aw, ah * ratio))) + 'px'; return;
  }
  const wrap = $('#board-wrap'), cs = getComputedStyle(wrap), w = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); if (!(w > 0)) return;
  const maxH = Math.max(420, innerHeight - 130);
  canvas.style.width = Math.floor(Math.min(w, maxH * ratio)) + 'px';
}

/* ---------- 한 걸음 ---------- */
function press(id) { R.press = id; R.pressT = 14; }
function step() {
  A.t++; if (R.pressT > 0) R.pressT--;
  if (menu) { if (inp.pauseEdge) cancelMenu(); IN.endStep(); return; }
  if (A.scr === 'game') stepGame();
  IN.endStep();
}
function stepGame() {
  const g = A.g;
  if (A.turn > 0) {                                    // 종이를 넘기는 중
    A.turn++;
    if (A.turn === TURN + 3) startStage(A.next);
    return;
  }
  if (g.mode === 'done' || g.mode === 'fail') {
    g.update(); observe();
    if (A.auto) { if (g.mode === 'done' && g.stage < NSTAGE - 1 && g.modeT > 100) nextStage(); return; }
    if (g.modeT <= 50) { A.hold = ''; return; }
    const bs = UI.result(g);
    if (inp.press) { const b = bs.find(q => UI.hit(q, inp.press.x, inp.press.y, 3)); A.hold = b ? b.id : ''; if (b) { press(b.id); SFX.play('tick'); } }
    if (inp.release && A.hold) {
      const b = bs.find(q => q.id === A.hold), id = A.hold; A.hold = '';
      if (b && !inp.release.cancel && UI.hit(b, inp.release.x, inp.release.y, 8)) { SFX.play('ok'); if (id === 'next') nextStage(); else if (id === 'retry') { log('스테이지를 다시 한다.'); startStage(g.stage); } else backToSetup(); }
    }
    return;
  }
  if (inp.pauseEdge && !A.auto) { if (g.dial) { g.dialCancel(); A.hold = ''; } else { mainMenu(); return; } }
  if (!A.auto) {
    if (g.dial) dialInput(g, inp);
    else if (inp.press) {
      const x = inp.press.x, y = inp.press.y;
      if (UI.hit(UI.menu, x, y, 4)) { mainMenu(); return; }
      if (UI.hit(UI.juice, x, y)) { press('juice'); if (!g.juice() && g.mode === 'play') { g.say('주스가 없다'); SFX.play('cancel'); } }
      else if (UI.hit(UI.ins, x, y)) { press('ins'); g.dialOpen(); A.hold = ''; }
      else if (UI.hit(UI.ff, x, y)) { press('ff'); g.toggleFF(); }
    }
  } else { g.autoPlay(HOW); if (g.mode === 'play') g.ff = true; }
  g.update(); observe(); if (g.n % 6 === 0 || g.mode !== 'play') hud();
}
/* 눈금 판: 자는 누르거나 끌어서, 걸음 버튼은 누르는 대로, 취소와 맞는다는 그 위에서 떼어야 듣는다 */
function dialInput(g, inp) {
  const D = UI.dial;
  if (inp.press) {
    const x = inp.press.x, y = inp.press.y; A.hold = '';
    if (UI.hit(UI.menu, x, y, 4)) { mainMenu(); return; }
    const st = D.steps.find(b => UI.hit(b, x, y, 1));
    if (st) { press(st.id); g.dialAdd(st.du); }
    else if (UI.hit(D.ruler, x, y)) { A.hold = 'ruler'; g.dialSet(D.val(x)); }
    else if (UI.hit(D.ok, x, y, 1)) { A.hold = D.ok.id; press(D.ok.id); }
    else if (UI.hit(D.cancel, x, y, 1)) { A.hold = D.cancel.id; press(D.cancel.id); }
  }
  if (A.hold === 'ruler') { if (inp.down) g.dialSet(D.val(inp.x)); if (inp.release) { if (!inp.release.cancel) g.dialSet(D.val(inp.release.x)); A.hold = ''; } else if (!inp.down) A.hold = ''; }
  else if (A.hold && inp.release) {
    const id = A.hold, b = id === D.ok.id ? D.ok : D.cancel; A.hold = '';
    if (!inp.release.cancel && UI.hit(b, inp.release.x, inp.release.y, 8)) { if (id === D.ok.id) { if (!g.dialOk()) SFX.play('cancel'); } else g.dialCancel(); }
  }
}
function nextStage() { A.next = A.g.stage + 1; A.turn = 1; feteOff(); SFX.play('page'); }

/* ---------- 그리기 ---------- */
const T = (s, x, y, px, al, a, w) => R.text(s, x, y, px, al || 'center', a, w);
function readyDraw(t) {
  const st = DS.STAGES[cfg.stage - 1], fi = (t >> 4) & 1, bob = i => Math.sin(t * 0.05 + i * 1.7) * 2.5;
  R.draw(null);
  R.title(W / 2, 54, 106); T(DS.SUBTITLE, W / 2, 100, 14.5, 'center', 0.9);
  R.spr('f_rice2', 38, 142 + bob(0), 0, 1.25, 1.25, fi); R.spr('pen', 88, 142 + bob(1), -0.35, 1.1, 1.1, fi); R.spr('face_ok', 138, 141 + bob(2), 0, 1.3, 1.3, fi); R.spr('pack', 192, 141 + bob(3), 0.08, 1, 1, fi);
  [[64, 124], [110, 160], [166, 122], [214, 162], [20, 164]].forEach((q, i) => R.spr(i % 2 ? 'key' : 'glu', q[0], q[1] + bob(i + 4) * 0.6, i * 0.9, 1, 1, fi, 0.85));
  R.box(22, 178, 196, 62, 3, 0.6, 0.55, 0.6);
  T(`스테이지 ${cfg.stage} · ${st.name}`, W / 2, 195, 16);
  T(st.goal, W / 2, 213, 9.6, 'center', 0.9);
  T(`${paperName(cfg)} 종이`, W / 2, 228, 8.6, 'center', 0.7);
  for (let i = 0; i < NSTAGE; i++) {                  // 열두 스테이지의 별 기록
    const x = 24 + (i % 4) * 49, y = 254 + ((i / 4) | 0) * 27, on = i === cfg.stage - 1;
    R.box(x, y, 45, 22, 20 + i, on ? 1.3 : 0.5, on ? 0.95 : 0.45, on ? 0.75 : 0.35);
    T(String(i + 1), x + 9, y + 11.5, 10.5, 'center', on ? 1 : 0.7);
    for (let k = 0; k < 3; k++) R.spr(k < STARS[i] ? 'star1' : 'star0', x + 21 + k * 8.6, y + 11, 0, 0.36, 0.36, 0, on ? 1 : 0.8);
  }
  if (((t / 32) | 0) % 2 === 0) T('출전을 누르면 시작한다', W / 2, 358, 13);
  T('교육용 게임이다', W / 2, 388, 8.4, 'center', 0.75); T('실제 인슐린 용량은 진료팀과 정한다', W / 2, 400, 8.4, 'center', 0.75);
}
function draw() {
  const g = A.g;
  if (A.scr === 'load') { R.draw(null); T('연필 깎는 중', W / 2, H / 2 - 6, 16); R.bar(70, H / 2 + 12, 100, 3, A.loadI / WARM.length); return; }
  if (A.scr === 'ready' || !g) { readyDraw(A.t); return; }
  R.draw(g);
  if (A.turn > 0) { R.pageTurn(Math.min(1, A.turn / TURN)); return; }
  if (menu) R.wash(0.38);
}

/* ---------- 돌리기: 1초에 60걸음 ---------- */
let fN = 0, fT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (A.scr === 'load') return;
  if (!last) { last = now; }
  let dt = now - last; last = now;
  if (dt > 100) dt = 100;
  if (Math.abs(dt - STEP) < 2.2) dt = STEP; else if (Math.abs(dt - STEP / 2) < 1.2) dt = STEP / 2;     // 주사율에 맞춰 떨림을 줄인다
  IN.frame();
  if (!A.manual) {
    acc += dt; let n = 0; const t0 = performance.now();
    while (acc >= STEP - 0.01 && n < 6) { step(); acc -= STEP; n++; if (A.scr === 'load') { acc = 0; return; } }
    if (n) A.st.step = A.st.step * 0.95 + (performance.now() - t0) / n * 0.05;
  }
  const t1 = performance.now(); draw(); A.st.draw = A.st.draw * 0.95 + (performance.now() - t1) * 0.05;
  if (A.debug) {
    fN++; if (now - fT > 500) { A.st.fps = fN * 1000 / (now - fT); fN = 0; fT = now; const g = A.g, el = $('#dbg'); if (el) el.textContent = A.st.fps.toFixed(0) + ' fps · 걸음 ' + A.st.step.toFixed(2) + 'ms · 그리기 ' + A.st.draw.toFixed(2) + 'ms' + (g ? ' · 포도당 ' + g.glu.length + ' · 열쇠 ' + g.keys.length + ' · 케톤 ' + g.kets.length : ''); }
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { IN.clear(); if (inGame() && !A.auto && !menu) mainMenu(); } last = 0; });   /* 다른 탭을 보는 동안 멈추고, 돌아오면 멈춤 메뉴가 떠 있다 */
window.addEventListener('blur', () => { if (inGame() && A.g.mode === 'play' && !A.auto && !menu) mainMenu(); });

/* ---------- 시험용 연결 ---------- */
window.render_game_to_text = () => JSON.stringify({ screen: A.scr, live: A.live, cfg, paper: DS.PAPERS[DS.paperIdx].name, paused: !!menu, menu: menu ? { title: menu.title, items: menu.items.map(it => it.label), i: menu.i } : null, turning: A.turn > 0, hold: A.hold, muted: SFX.muted, ringing: SFX.ringing, petals: DHPETALS.on, stars: STARS, buttons: inResult() && A.g.modeT > 50 ? UI.result(A.g).map(b => ({ id: b.id, x: b.x + b.w / 2, y: b.y + b.h / 2 })) : null, game: A.g ? JSON.parse(A.g.text()) : null });
window.advanceTime = ms => { A.manual = true; const n = Math.max(1, Math.round(ms / STEP)); for (let i = 0; i < n; i++) { if (A.scr === 'load') break; IN.frame(); step(); } if (A.scr !== 'load') draw(); return n; };
window.__donghyundi = { A, UI, get cfg() { return cfg; }, set cfg(c) { cfg = c; sortieCard(cfg); }, get menu() { return menu; }, parseSortie, sortie, go, snapshot, restore, loadFrom, readSlot, saveToSlot, saveMenu, loadMenu, startStage, nextStage, mainMenu, menuKey, closeMenu, backToSetup, fit, fete, feteOff, readStars, get petals() { return DHPETALS; } };

if (A.debug) { const d = $('#dbg'); if (d) d.hidden = false; }
selectExample(); sortieCard(cfg); readyLabels(); renderStars(); fit();

/* ---------- 전체 화면(동현램과 같은 규칙) ---------- */
const stageFull=$('#stage-full');
const fullEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
const canNativeFull=!!((document.fullscreenEnabled||document.webkitFullscreenEnabled)&&(stageFull.requestFullscreen||stageFull.webkitRequestFullscreen));
const isPseudo=()=>stageFull.classList.contains('pseudo-full');
const isFull=()=>fullEl()===stageFull||isPseudo();
const SIDE_MQ=matchMedia('(orientation: landscape) and (pointer: coarse)');
function setPseudo(on){ stageFull.classList.toggle('pseudo-full',on); document.documentElement.classList.toggle('pseudo-full-on',on); onFull(); }
/* 브라우저 전체 화면에서 Esc는 브라우저가 먼저 받아 전체 화면을 닫고 쪽에는 넘기지 않는다(Safari · Firefox · Chrome).
   메뉴를 열려고 누른 Esc에 게임이 멈추지 않은 채 화면만 작아지지 않도록, 닫기 버튼이나 F가 아닌 길로 닫혔으면 메뉴를 연다. */
let wasNative=false, leaving=false;
function exitFull(){ if(isPseudo()) return setPseudo(false); if(fullEl()===stageFull){ leaving=true; (document.exitFullscreen||document.webkitExitFullscreen||(()=>{})).call(document); } }
let hintTimer=0;
function onFull(){ const on=isFull(), native=fullEl()===stageFull;
  if(wasNative&&!native){ if(!leaving&&tab==='play'&&inGame()&&!A.auto&&!menu) mainMenu(); leaving=false; }
  if(native&&!wasNative) leaving=false;
  wasNative=native;
  stageFull.classList.toggle('fs',on); stageFull.classList.toggle('side',on&&SIDE_MQ.matches);
  $('#exit-full').hidden=!on; $('#full').textContent=on?'전체 화면 닫기':'전체 화면';
  clearTimeout(hintTimer); $('#full-hint').hidden=!on; if(on) hintTimer=setTimeout(()=>$('#full-hint').hidden=true,5000);
  fit(); setTimeout(fit,60); if(on) $('#full').blur(); }
document.addEventListener('fullscreenchange',onFull); document.addEventListener('webkitfullscreenchange',onFull);
SIDE_MQ.addEventListener?SIDE_MQ.addEventListener('change',onFull):SIDE_MQ.addListener(onFull);
$('#exit-full').onclick=exitFull;
$('#full').onclick=()=>{ if(isFull()) return exitFull(); if(!A.live) return;
  if(!canNativeFull) return setPseudo(true);
  try{ const r=stageFull.requestFullscreen?stageFull.requestFullscreen():stageFull.webkitRequestFullscreen();
    if(r&&r.catch) r.catch(()=>setPseudo(true)); }catch(e){ setPseudo(true); } };

const fontsReady = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load("700 30px Gaegu", '동현디 0123'), document.fonts.load("400 16px Gaegu", '동현디')]).catch(() => { }) : Promise.resolve();
Promise.race([Promise.all([fontsReady, R.titleReady]), new Promise(r => setTimeout(r, 2500))]).then(() => {
  draw(); requestAnimationFrame(frame);
  setTimeout(() => warm(() => { A.scr = 'ready'; A.t = 0; document.body.classList.add('ready'); if (A.auto) go(); }), 0);
});
})();
