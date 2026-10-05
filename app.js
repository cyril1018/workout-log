(function(){
  const $ = id => document.getElementById(id);
  const WD = ['日','一','二','三','四','五','六'];
  const DEFAULT_EX = ['單槓'];
  const QUICK = [5, 8, 10, 12, 15, 20];
  const KEY = 'workoutlog.v1';

  const state = {
    exercises: DEFAULT_EX.slice(),
    days: {},            // date -> {date, sets:[{id, ex, reps, t}]}
    ex: null, range: 'week', armed: null,
    storageOk: true, exportName: '', exportMime: 'application/json',
  };
  let armTimer = null;

  // ---------- helpers ----------
  function pad(n){ return String(n).padStart(2,'0'); }
  function keyOf(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function todayKey(){ return keyOf(new Date()); }
  function parseKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
  function fmtDate(k){ const d = parseKey(k); return (d.getMonth()+1) + '月' + d.getDate() + '日 週' + WD[d.getDay()]; }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
  function rangeStart(){
    const now = new Date();
    if (state.range === 'month') return keyOf(new Date(now.getFullYear(), now.getMonth(), 1));
    if (state.range === 'week') { const dow = (now.getDay()+6)%7; const d = new Date(now); d.setDate(now.getDate()-dow); return keyOf(d); }
    return '0000-00-00';
  }
  let toastTimer;
  function toast(msg){ const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 1800); }
  function currentReps(){ let v = parseInt($('reps').value, 10); if (!v || v < 1) v = 1; if (v > 999) v = 999; return v; }
  function groupByEx(sets){
    const m = new Map();
    for (const s of sets) { if (!m.has(s.ex)) m.set(s.ex, []); m.get(s.ex).push(s); }
    return m;
  }
  function cleanSets(list){
    if (!Array.isArray(list)) return [];
    return list.filter(s => s && s.ex && Number(s.reps) > 0)
      .map(s => ({ id: String(s.id || uid()), ex: String(s.ex).slice(0,20), reps: Math.min(999, Math.round(Number(s.reps))), t: Number(s.t) || 0 }));
  }

  // ---------- storage (this device only) ----------
  function load(){
    let raw = null;
    try { raw = localStorage.getItem(KEY); }
    catch(e){ state.storageOk = false; }
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (Array.isArray(d.exercises) && d.exercises.length) state.exercises = d.exercises.map(String);
      if (d.days && typeof d.days === 'object') {
        for (const k in d.days) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) state.days[k] = { date: k, sets: cleanSets(d.days[k].sets) };
      }
      if (d.lastEx) state.ex = String(d.lastEx);
      if (Number(d.lastReps) > 0) $('reps').value = Math.min(999, Number(d.lastReps));
    } catch(e){ console.error(e); }
  }
  function persist(){
    const payload = { version: 1, exercises: state.exercises, days: state.days, lastEx: state.ex, lastReps: currentReps() };
    try { localStorage.setItem(KEY, JSON.stringify(payload)); }
    catch(e){ state.storageOk = false; showStorageNotice(); }
  }
  function showStorageNotice(){
    if (state.storageOk) return;
    const n = $('notice'); n.textContent = '這個瀏覽器沒辦法儲存（可能是無痕模式）。現在記的東西關掉頁面就會不見。'; n.classList.add('show');
  }

  // ---------- render ----------
  function render(){ renderHeader(); renderChips(); renderToday(); renderStats(); renderHistory(); }
  function renderHeader(){
    const k = todayKey();
    $('todayDate').textContent = fmtDate(k);
    const sets = (state.days[k] || {sets:[]}).sets;
    $('todayTotal').textContent = sum(sets.map(s=>s.reps));
    $('todaySets').textContent = sets.length;
    $('log').textContent = '記一組' + (state.ex ? '　' + state.ex : '');
    $('log').disabled = !state.ex;
  }
  function renderChips(){
    if (!state.ex || !state.exercises.includes(state.ex)) state.ex = state.exercises[0] || null;
    const c = $('chips'); c.innerHTML = '';
    for (const ex of state.exercises) {
      const b = document.createElement('button');
      b.className = 'chip' + (ex === state.ex ? ' on' : ''); b.textContent = ex;
      b.onclick = () => { state.ex = ex; persist(); render(); };
      c.appendChild(b);
    }
    const add = document.createElement('button');
    add.className = 'chip add'; add.textContent = state.exercises.length ? '編輯' : '＋ 新增動作';
    add.onclick = openSheet; c.appendChild(add);
  }
  function dayRows(container, key, editable){
    const sets = (state.days[key] || {sets:[]}).sets;
    for (const [ex, list] of groupByEx(sets)) {
      const row = document.createElement('div'); row.className = 'row';
      const name = document.createElement('div'); name.className = 'ex'; name.textContent = ex;
      const chips = document.createElement('div'); chips.className = 'sets';
      for (const s of list) {
        const el = document.createElement(editable ? 'button' : 'span');
        const armed = editable && state.armed === s.id;
        el.className = 'set num' + (armed ? ' armed' : '');
        el.textContent = armed ? '刪除' : s.reps;
        if (editable) {
          el.setAttribute('aria-label', armed ? '確認刪除這組' : s.reps + ' 下，點一下可刪除');
          el.onclick = (e) => { e.stopPropagation(); if (armed) removeSet(key, s.id); else arm(s.id); };
        }
        chips.appendChild(el);
      }
      const tot = document.createElement('div'); tot.className = 'tot num';
      tot.innerHTML = sum(list.map(s=>s.reps)) + '<small>下 · ' + list.length + ' 組</small>';
      row.append(name, chips, tot); container.appendChild(row);
    }
  }
  function renderToday(){
    const k = todayKey(); const box = $('todayDay'); box.innerHTML = '';
    const sets = (state.days[k] || {sets:[]}).sets;
    const has = sets.length > 0;
    box.style.display = has ? '' : 'none'; $('todayEmpty').style.display = has ? 'none' : '';
    if (has) dayRows(box, k, true);
  }
  function renderStats(){
    const start = rangeStart();
    const agg = new Map();
    for (const k in state.days) {
      if (k < start) continue;
      for (const s of state.days[k].sets) {
        if (!agg.has(s.ex)) agg.set(s.ex, {total:0, sets:0, days:new Set()});
        const a = agg.get(s.ex); a.total += s.reps; a.sets++; a.days.add(k);
      }
    }
    const box = $('statRows'); box.innerHTML = '';
    if (!agg.size) box.innerHTML = '<div class="empty">這段時間還沒有紀錄。</div>';
    const order = [...state.exercises, ...[...agg.keys()].filter(e=>!state.exercises.includes(e))];
    for (const ex of order) {
      const a = agg.get(ex); if (!a) continue;
      const r = document.createElement('div'); r.className = 'srow';
      r.innerHTML = '<div class="ex"></div>'
        + '<div class="v num">' + a.total + '<small>總共下</small></div>'
        + '<div class="v num">' + a.sets + '<small>組</small></div>'
        + '<div class="v num">' + a.days.size + '<small>天</small></div>';
      r.querySelector('.ex').textContent = ex;
      box.appendChild(r);
    }
    const b = $('bars'); b.innerHTML = '';
    if (!state.ex) { b.style.display = 'none'; return; }
    b.style.display = '';
    const now = new Date(); const keys = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate()-i); keys.push(keyOf(d)); }
    const vals = keys.map(k => sum(((state.days[k]||{sets:[]}).sets).filter(s=>s.ex===state.ex).map(s=>s.reps)));
    const max = Math.max(1, ...vals);
    const cap = document.createElement('div'); cap.className = 'cap';
    cap.innerHTML = '<span></span><span>最近 14 天 · 最多一天 ' + max + ' 下</span>';
    cap.firstChild.textContent = state.ex;
    const grid = document.createElement('div'); grid.className = 'barsgrid';
    const labels = document.createElement('div'); labels.className = 'barlabels';
    keys.forEach((k, i) => {
      const bar = document.createElement('div');
      bar.className = 'bar' + (vals[i] ? '' : ' zero') + (i === 13 ? ' today' : '');
      bar.style.height = vals[i] ? Math.max(6, Math.round(vals[i] / max * 72)) + 'px' : '3px';
      bar.title = fmtDate(k) + ' ' + vals[i] + ' 下';
      grid.appendChild(bar);
      const l = document.createElement('span'); l.textContent = (i % 2 === 1 || i === 13) ? parseKey(k).getDate() : ''; labels.appendChild(l);
    });
    b.append(cap, grid, labels);
  }
  function renderHistory(){
    const h = $('history'); h.innerHTML = '';
    const today = todayKey();
    const keys = Object.keys(state.days).filter(k => k !== today && state.days[k].sets.length).sort().reverse();
    if (!keys.length) { h.innerHTML = '<div class="empty">還沒有過去的紀錄。</div>'; return; }
    for (const k of keys) {
      const sets = state.days[k].sets;
      const d = document.createElement('div'); d.className = 'day';
      const head = document.createElement('div'); head.className = 'head';
      head.innerHTML = '<b></b><span><span class="num">' + sum(sets.map(s=>s.reps)) + '</span> 下 · ' + sets.length + ' 組</span>';
      head.querySelector('b').textContent = fmtDate(k);
      d.appendChild(head); dayRows(d, k, false); h.appendChild(d);
    }
  }

  // ---------- actions ----------
  function arm(id){ state.armed = id; renderToday(); clearTimeout(armTimer); armTimer = setTimeout(()=>{ state.armed = null; renderToday(); }, 3000); }
  document.addEventListener('click', () => { if (state.armed) { state.armed = null; renderToday(); } });

  function setReps(v){ $('reps').value = v; persist(); }
  function saveDay(key, sets){
    if (sets.length) state.days[key] = { date: key, sets }; else delete state.days[key];
    persist(); render();
  }
  function addSet(){
    if (!state.ex) return;
    const key = todayKey(); const reps = currentReps(); $('reps').value = reps;
    const sets = ((state.days[key] || {sets:[]}).sets).concat([{ id: uid(), ex: state.ex, reps, t: Date.now() }]);
    saveDay(key, sets);
    const b = $('log'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    toast(state.ex + ' ' + reps + ' 下，記好了');
  }
  function removeSet(key, id){
    state.armed = null;
    saveDay(key, ((state.days[key] || {sets:[]}).sets).filter(s => s.id !== id));
    toast('刪掉了');
  }

  // ---------- exercise sheet ----------
  function exRow(val){
    const r = document.createElement('div'); r.className = 'exrow';
    const i = document.createElement('input'); i.value = val; i.placeholder = '動作名稱，例如：單槓'; i.maxLength = 20;
    const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label','移除'); x.onclick = () => r.remove();
    r.append(i, x); return r;
  }
  function openSheet(){
    const list = $('exList'); list.innerHTML = '';
    for (const ex of state.exercises) list.appendChild(exRow(ex));
    if (!state.exercises.length) list.appendChild(exRow(''));
    $('sheet').classList.add('open');
    const first = list.querySelector('input'); if (first && !first.value) first.focus();
  }
  function closeSheet(id){ $(id).classList.remove('open'); }
  $('addRow').onclick = () => { const r = exRow(''); $('exList').appendChild(r); r.querySelector('input').focus(); };
  $('cancelEx').onclick = () => closeSheet('sheet');
  $('saveEx').onclick = () => {
    const names = [...$('exList').querySelectorAll('input')].map(i => i.value.trim()).filter(Boolean);
    const list = [...new Set(names)];
    if (!list.length) { toast('至少留一個動作'); return; }
    closeSheet('sheet'); state.exercises = list; persist(); render();
  };
  for (const id of ['sheet','exportSheet','importSheet','clearSheet']) {
    $(id).addEventListener('click', e => { if (e.target === $(id)) closeSheet(id); });
  }

  // ---------- export / import ----------
  function backupJson(){
    return JSON.stringify({ app: 'workoutlog', version: 1, exportedAt: new Date().toISOString(), exercises: state.exercises, days: state.days }, null, 1);
  }
  function backupCsv(){
    const rows = [['日期','動作','次數','時間']];
    for (const k of Object.keys(state.days).sort()) {
      for (const s of state.days[k].sets) {
        const t = s.t ? new Date(s.t) : null;
        rows.push([k, s.ex, s.reps, t ? pad(t.getHours()) + ':' + pad(t.getMinutes()) : '']);
      }
    }
    return '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\r\n');
  }
  function openExport(kind){
    const stamp = todayKey();
    if (kind === 'csv') { state.exportName = '運動紀錄-' + stamp + '.csv'; state.exportMime = 'text/csv'; $('exportBox').value = backupCsv(); $('exportTitle').textContent = '匯出 CSV'; }
    else { state.exportName = '運動紀錄備份-' + stamp + '.json'; state.exportMime = 'application/json'; $('exportBox').value = backupJson(); $('exportTitle').textContent = '匯出備份'; }
    $('exportShare').style.display = (navigator.share ? '' : 'none');
    $('exportSheet').classList.add('open');
  }
  $('exportJson').onclick = () => openExport('json');
  $('exportCsv').onclick = () => openExport('csv');
  $('exportClose').onclick = () => closeSheet('exportSheet');
  $('exportCopy').onclick = async () => {
    const box = $('exportBox');
    try { await navigator.clipboard.writeText(box.value); toast('複製好了'); return; } catch(e) {}
    box.focus(); box.select();
    try { if (document.execCommand('copy')) { toast('複製好了'); return; } } catch(e) {}
    toast('請長按文字框自行複製');
  };
  $('exportShare').onclick = async () => {
    const text = $('exportBox').value;
    try {
      const file = new File([text], state.exportName, { type: state.exportMime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: state.exportName }); return; }
      await navigator.share({ title: state.exportName, text });
    } catch(e) { if (!(e && e.name === 'AbortError')) toast('這裡不能分享，改用複製或下載'); }
  };
  $('exportDl').onclick = async () => {
    const text = $('exportBox').value;
    // Inside the claude.ai viewer, downloads go through its save prompt.
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const dl = await window.claude.use('downloads');
        if (dl) { await dl.save({ filename: state.exportName, data: text }); toast('已匯出'); return; }
      }
    } catch(e) { if (e && e.code === 'declined') return; }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: state.exportMime }));
      a.download = state.exportName; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('已嘗試下載，沒出現就改用複製');
    } catch(e) { toast('這裡不能下載，請用複製'); }
  };

  function mergeBackup(text){
    let d;
    try { d = JSON.parse(text); } catch(e) { throw new Error('看不懂這個內容，確認是之前匯出的備份'); }
    if (!d || typeof d !== 'object' || !d.days) throw new Error('這不是運動紀錄的備份檔');
    let added = 0;
    for (const k in d.days) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const incoming = cleanSets(d.days[k] && d.days[k].sets);
      const cur = (state.days[k] || {sets:[]}).sets.slice();
      const have = new Set(cur.map(s => s.id));
      for (const s of incoming) if (!have.has(s.id)) { cur.push(s); have.add(s.id); added++; }
      cur.sort((a,b) => (a.t||0) - (b.t||0));
      if (cur.length) state.days[k] = { date: k, sets: cur };
    }
    if (Array.isArray(d.exercises)) state.exercises = [...new Set([...state.exercises, ...d.exercises.map(String).filter(Boolean)])];
    persist(); render();
    return added;
  }
  $('importBtn').onclick = () => { $('importBox').value = ''; $('importFile').value = ''; $('importSheet').classList.add('open'); };
  $('importCancel').onclick = () => closeSheet('importSheet');
  $('importFile').addEventListener('change', () => {
    const f = $('importFile').files && $('importFile').files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { $('importBox').value = String(r.result || ''); }; r.readAsText(f);
  });
  $('importGo').onclick = () => {
    const text = $('importBox').value.trim();
    if (!text) { toast('先選檔案或貼上內容'); return; }
    try { const n = mergeBackup(text); closeSheet('importSheet'); toast('匯入完成，新增了 ' + n + ' 組'); }
    catch(e) { toast(e.message); }
  };

  $('clearAll').onclick = () => $('clearSheet').classList.add('open');
  $('clearCancel').onclick = () => closeSheet('clearSheet');
  $('clearGo').onclick = () => {
    state.days = {}; state.exercises = DEFAULT_EX.slice(); state.ex = null;
    try { localStorage.removeItem(KEY); } catch(e) {}
    closeSheet('clearSheet'); render(); toast('已清除');
  };

  // ---------- wiring ----------
  $('minus').onclick = () => setReps(Math.max(1, currentReps()-1));
  $('plus').onclick = () => setReps(Math.min(999, currentReps()+1));
  $('reps').addEventListener('change', () => setReps(currentReps()));
  $('reps').addEventListener('focus', e => e.target.select());
  $('log').onclick = addSet;
  for (const q of QUICK) { const b = document.createElement('button'); b.className = 'num'; b.textContent = q; b.onclick = () => setReps(q); $('quick').appendChild(b); }
  $('seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    state.range = b.dataset.r;
    [...$('seg').children].forEach(x => x.classList.toggle('on', x === b));
    renderStats();
  });

  load(); showStorageNotice(); render();

  let lastKey = todayKey();
  setInterval(() => { const k = todayKey(); if (k !== lastKey) { lastKey = k; render(); } }, 60000);
})();
