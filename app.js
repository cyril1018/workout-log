(function(){
  const $ = id => document.getElementById(id);
  const t = I18N.t;
  const defaults = () => t('defaults').slice();
  const QUICK = [5, 8, 10, 12, 15, 20];
  const KEY = 'workoutlog.v1';

  const state = {
    exercises: defaults(),
    days: {},            // date -> {date, sets:[{id, ex, reps, t, w?, u?}]}
    loads: {},           // exercise -> last load used, in the current unit
    types: {},           // exercise -> 'weight' for barbell/machine lifts; absent = bodyweight
    unit: defaultUnit(), // 'kg' or 'lb': how weights are entered and shown
    ex: null, range: 'week',
    storageOk: true, exportName: '', exportMime: 'application/json',
  };

  // ---------- helpers ----------
  function pad(n){ return String(n).padStart(2,'0'); }
  function keyOf(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function todayKey(){ return keyOf(new Date()); }
  function parseKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
  function fmtDate(k){ return t('fmtDate', parseKey(k)); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
  function sum(arr){ return arr.reduce((a,b)=>a+b,0); }
  function rangeStart(){
    const now = new Date();
    if (state.range === 'month') return keyOf(new Date(now.getFullYear(), now.getMonth(), 1));
    if (state.range === 'week') { const dow = (now.getDay()+6)%7; const d = new Date(now); d.setDate(now.getDate()-dow); return keyOf(d); }
    return '0000-00-00';
  }
  let toastTimer;
  function toast(msg){ const el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'), 1800); }
  function clampReps(raw){ let v = parseInt(raw, 10); if (!v || v < 1) v = 1; if (v > 999) v = 999; return v; }
  function currentReps(){ return clampReps($('reps').value); }
  // Load is a signed weight on the set: w > 0 加重, w < 0 拉力帶, no w = 徒手.
  // u: 'lb' if it was entered in pounds (absent = kg). It stays as entered; display converts.
  function cleanW(v){ const n = Math.round(Number(v) * 10) / 10; return Number.isFinite(n) ? Math.max(-999, Math.min(999, n)) : 0; }
  function loadLabel(w, short){ const u = state.unit; return w > 0 ? '+' + w + u : w < 0 ? t(short ? 'bandShort' : 'bandW', -w, u) : ''; }
  function makeSet(id, ex, reps, w, t, u){ const s = { id, ex, reps, t }; if (w) { s.w = w; if (u === 'lb') s.u = 'lb'; } return s; }
  const LB = 0.45359237;  // kg per pound
  function defaultUnit(){
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /-US$/i.test(nav) ? 'lb' : 'kg';
  }
  function convert(w, from, to){ return from === to ? w : to === 'lb' ? w / LB : w * LB; }
  // A set's weight in the unit being shown, rounded to 0.1.
  function shownW(s){ return s.w ? Math.round(convert(s.w, s.u || 'kg', state.unit) * 10) / 10 : 0; }
  function isWeight(ex){ return Object.prototype.hasOwnProperty.call(state.types, ex) && state.types[ex] === 'weight'; }
  // Training volume counts only weight-type lifts: weight × reps, in the unit being shown.
  function volume(sets){ return sum(sets.map(s => isWeight(s.ex) && s.w > 0 ? convert(s.w, s.u || 'kg', state.unit) * s.reps : 0)); }
  function fmtNum(n){ return (Math.round(n * 10) / 10).toLocaleString('en-US'); }
  function cleanTypes(obj){
    const out = {};
    if (obj && typeof obj === 'object') for (const ex in obj) if (obj[ex] === 'weight') out[String(ex).slice(0,20)] = 'weight';
    return out;
  }
  function fmtTime(t){ const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function groupByEx(sets){
    const m = new Map();
    for (const s of sets) { if (!m.has(s.ex)) m.set(s.ex, []); m.get(s.ex).push(s); }
    return m;
  }
  function cleanSets(list){
    if (!Array.isArray(list)) return [];
    return list.filter(s => s && s.ex && Number(s.reps) > 0)
      .map(s => makeSet(String(s.id || uid()), String(s.ex).slice(0,20), Math.min(999, Math.round(Number(s.reps))), cleanW(s.w), Number(s.t) || 0, s.u));
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
      if (d.loads && typeof d.loads === 'object') for (const ex in d.loads) state.loads[ex] = cleanW(d.loads[ex]);
      state.types = cleanTypes(d.types);
      state.unit = d.unit === 'lb' ? 'lb' : 'kg';  // saved before units existed = kg
      if (d.lastEx) state.ex = String(d.lastEx);
      if (Number(d.lastReps) > 0) $('reps').value = Math.min(999, Number(d.lastReps));
    } catch(e){ console.error(e); }
  }
  function persist(){
    const payload = { version: 4, unit: state.unit, exercises: state.exercises, types: state.types, days: state.days, loads: state.loads, lastEx: state.ex, lastReps: currentReps() };
    try { localStorage.setItem(KEY, JSON.stringify(payload)); }
    catch(e){ state.storageOk = false; showStorageNotice(); }
  }
  function showStorageNotice(){
    if (state.storageOk) return;
    const n = $('notice'); n.textContent = t('noStorage'); n.classList.add('show');
  }

  // ---------- render ----------
  function render(){
    // Pick the default exercise first: the header and the log button depend on it.
    if (!state.ex || !state.exercises.includes(state.ex)) state.ex = state.exercises[0] || null;
    const w = cleanW(state.loads[state.ex]);
    if (isWeight(state.ex)) mainLoad.set(Math.max(0, w), true); else mainLoad.set(w);
    renderUnit(); renderHeader(); renderChips(); renderToday(); renderStats(); renderHistory();
  }
  function renderUnit(){
    const u = state.unit, step = u === 'lb' ? 5 : 2.5;  // one plate a side
    for (const b of document.querySelectorAll('.units button')) b.classList.toggle('on', b.dataset.unit === u);
    for (const root of [$('load'), $('editLoad')]) {
      root.querySelector('.kg span').textContent = u;
      root.querySelector('.kg input').setAttribute('aria-label', t('weightAria', u));
      for (const b of root.querySelectorAll('button[data-d]')) {
        const d = Number(b.dataset.d) < 0 ? -step : step;
        b.dataset.d = d; b.textContent = (d < 0 ? '−' : '+') + step; b.setAttribute('aria-label', t('stepAria', d, u));
      }
    }
  }
  function renderHeader(){
    const k = todayKey();
    $('todayDate').textContent = fmtDate(k);
    const sets = (state.days[k] || {sets:[]}).sets;
    const reps = sum(sets.map(s=>s.reps));
    $('todayTotal').textContent = reps; $('todayRepsU').textContent = t('repsU', reps);
    $('todaySets').textContent = sets.length; $('todaySetsU').textContent = t('setsU', sets.length);
    $('log').textContent = t('logBtn', state.ex);
    $('log').disabled = !state.ex;
  }
  function renderChips(){
    const c = $('chips'); c.innerHTML = '';
    for (const ex of state.exercises) {
      const b = document.createElement('button');
      b.className = 'chip' + (ex === state.ex ? ' on' : ''); b.textContent = ex;
      b.onclick = () => { state.ex = ex; persist(); render(); };
      c.appendChild(b);
    }
    const add = document.createElement('button');
    add.className = 'chip add'; add.textContent = state.exercises.length ? t('editEx') : t('addEx');
    add.onclick = openSheet; c.appendChild(add);
  }
  function dayRows(container, key){
    const sets = (state.days[key] || {sets:[]}).sets;
    for (const [ex, list] of groupByEx(sets)) {
      const lifted = isWeight(ex);
      const row = document.createElement('div'); row.className = 'row' + (lifted ? ' lifted' : '');
      const name = document.createElement('div'); name.className = 'ex'; name.textContent = ex;
      const chips = document.createElement('div'); chips.className = 'sets';
      for (const s of list) {
        const el = document.createElement('button');
        el.className = 'set num';
        const w = shownW(s);
        if (lifted && w > 0) {
          const sm = document.createElement('small'); sm.textContent = state.unit;
          el.append(String(w), sm, '×' + s.reps);
          el.setAttribute('aria-label', t('setAriaW', w, state.unit, s.reps));
        } else {
          el.textContent = s.reps;
          if (w) { const sm = document.createElement('small'); sm.textContent = loadLabel(w, true); el.appendChild(sm); }
          el.setAttribute('aria-label', t('setAria', s.reps, loadLabel(w)));
        }
        el.onclick = () => openEdit(key, s.id);
        chips.appendChild(el);
      }
      const tot = document.createElement('div'); tot.className = 'tot num';
      tot.innerHTML = lifted
        ? fmtNum(volume(list)) + '<small>' + t('rowVol', list.length, state.unit) + '</small>'
        : sum(list.map(s=>s.reps)) + '<small>' + t('rowReps', list.length) + '</small>';
      row.append(name, chips, tot); container.appendChild(row);
    }
  }
  function renderToday(){
    const k = todayKey(); const box = $('todayDay'); box.innerHTML = '';
    const sets = (state.days[k] || {sets:[]}).sets;
    const has = sets.length > 0;
    box.style.display = has ? '' : 'none'; $('todayEmpty').style.display = has ? 'none' : '';
    if (has) dayRows(box, k);
  }
  function renderStats(){
    const start = rangeStart();
    const agg = new Map();
    for (const k in state.days) {
      if (k < start) continue;
      for (const s of state.days[k].sets) {
        if (!agg.has(s.ex)) agg.set(s.ex, {total:0, vol:0, sets:0, days:new Set(), max:0});
        const a = agg.get(s.ex); a.total += s.reps; a.vol += volume([s]); a.sets++; a.days.add(k);
        if (shownW(s) > a.max) a.max = shownW(s);
      }
    }
    const box = $('statRows'); box.innerHTML = '';
    if (!agg.size) box.innerHTML = '<div class="empty">' + t('noStats') + '</div>';
    const order = [...state.exercises, ...[...agg.keys()].filter(e=>!state.exercises.includes(e))];
    for (const ex of order) {
      const a = agg.get(ex); if (!a) continue;
      const r = document.createElement('div'); r.className = 'srow';
      const lifted = isWeight(ex);
      r.innerHTML = '<div class="ex"></div>'
        + (lifted ? '<div class="v num">' + fmtNum(a.vol) + '<small>' + t('volL', state.unit) + '</small></div>'
                  : '<div class="v num">' + a.total + '<small>' + t('totalReps') + '</small></div>')
        + '<div class="v num">' + a.sets + '<small>' + t('setsL', a.sets) + '</small></div>'
        + '<div class="v num">' + a.days.size + '<small>' + t('daysL', a.days.size) + '</small></div>';
      r.querySelector('.ex').textContent = ex;
      if (a.max) { const sm = document.createElement('small'); sm.textContent = t('max', lifted ? a.max + state.unit : loadLabel(a.max)); r.querySelector('.ex').appendChild(sm); }
      box.appendChild(r);
    }
    const b = $('bars'); b.innerHTML = '';
    if (!state.ex) { b.style.display = 'none'; return; }
    b.style.display = '';
    const now = new Date(); const keys = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(now.getDate()-i); keys.push(keyOf(d)); }
    // Weight-type lifts chart daily volume; bodyweight ones chart reps.
    const lifted = isWeight(state.ex);
    const unit = lifted ? t('unitW', state.unit) : t('unitReps');
    const vals = keys.map(k => {
      const sets = ((state.days[k]||{sets:[]}).sets).filter(s=>s.ex===state.ex);
      return lifted ? volume(sets) : sum(sets.map(s=>s.reps));
    });
    const max = Math.max(1, ...vals);
    const cap = document.createElement('div'); cap.className = 'cap';
    cap.innerHTML = '<span></span><span>' + t('barsCap', fmtNum(max), unit) + '</span>';
    cap.firstChild.textContent = state.ex;
    const grid = document.createElement('div'); grid.className = 'barsgrid';
    const labels = document.createElement('div'); labels.className = 'barlabels';
    keys.forEach((k, i) => {
      const bar = document.createElement('div');
      bar.className = 'bar' + (vals[i] ? '' : ' zero') + (i === 13 ? ' today' : '');
      bar.style.height = vals[i] ? Math.max(6, Math.round(vals[i] / max * 72)) + 'px' : '3px';
      bar.title = fmtDate(k) + ' ' + fmtNum(vals[i]) + unit;
      grid.appendChild(bar);
      const l = document.createElement('span'); l.textContent = (i % 2 === 1 || i === 13) ? parseKey(k).getDate() : ''; labels.appendChild(l);
    });
    b.append(cap, grid, labels);
  }
  function renderHistory(){
    const h = $('history'); h.innerHTML = '';
    const today = todayKey();
    const keys = Object.keys(state.days).filter(k => k !== today && state.days[k].sets.length).sort().reverse();
    if (!keys.length) { h.innerHTML = '<div class="empty">' + t('noHistory') + '</div>'; return; }
    for (const k of keys) {
      const sets = state.days[k].sets;
      const d = document.createElement('div'); d.className = 'day';
      const head = document.createElement('div'); head.className = 'head';
      head.innerHTML = '<b></b><span>' + t('dayHead', sum(sets.map(s=>s.reps)), sets.length) + '</span>';
      head.querySelector('b').textContent = fmtDate(k);
      d.appendChild(head); dayRows(d, k); h.appendChild(d);
    }
  }

  // ---------- actions ----------
  function setReps(v){ $('reps').value = v; persist(); }
  function setDay(key, sets){
    if (sets.length) state.days[key] = { date: key, sets }; else delete state.days[key];
  }
  function saveDay(key, sets){ setDay(key, sets); persist(); render(); }
  function addSet(){
    if (!state.ex) return;
    const key = todayKey(); const reps = currentReps(); $('reps').value = reps;
    const w = mainLoad.get(); state.loads[state.ex] = w;
    const sets = ((state.days[key] || {sets:[]}).sets).concat([makeSet(uid(), state.ex, reps, w, Date.now(), state.unit)]);
    saveDay(key, sets);
    const b = $('log'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    const what = isWeight(state.ex) && w > 0 ? t('whatW', w, state.unit, reps) : t('whatReps', reps, loadLabel(w));
    toast(t('logged', state.ex, what));
  }
  function removeSet(key, id){
    saveDay(key, ((state.days[key] || {sets:[]}).sets).filter(s => s.id !== id));
    toast(t('deleted'));
  }

  // ---------- load picker (徒手 / 加重 / 拉力帶 + weight with ± one plate), used by the counter and the edit sheet ----------
  // For weight-type exercises it is fixed to the weight only (the 徒手/加重/拉力帶 choice is hidden).
  function loadPicker(root, kgInput, onChange){
    let mode = 'body';
    function show(fixed){
      for (const b of root.querySelectorAll('button[data-m]')) b.classList.toggle('on', b.dataset.m === mode);
      if (fixed !== undefined) root.querySelector('.seg').style.display = fixed ? 'none' : '';
      kgInput.parentElement.style.display = mode === 'body' ? 'none' : '';
    }
    root.addEventListener('click', e => {
      const step = e.target.closest('button[data-d]');
      if (step) {
        const kg = Math.max(0, Math.abs(cleanW(kgInput.value)) + Number(step.dataset.d));
        kgInput.value = cleanW(kg) || '';
        if (onChange) onChange();
        return;
      }
      const b = e.target.closest('button[data-m]'); if (!b) return;
      mode = b.dataset.m; show();
      if (mode !== 'body' && !kgInput.value) kgInput.focus();
      if (onChange) onChange();
    });
    kgInput.addEventListener('input', () => { if (onChange) onChange(); });
    kgInput.addEventListener('focus', () => kgInput.select());
    return {
      get(){ if (mode === 'body') return 0; const kg = Math.abs(cleanW(kgInput.value)); return mode === 'band' ? -kg : kg; },
      set(w, fixed){ mode = fixed || w > 0 ? 'add' : w < 0 ? 'band' : 'body'; kgInput.value = w ? Math.abs(w) : ''; show(!!fixed); },
    };
  }
  const mainLoad = loadPicker($('load'), $('kg'), () => { if (state.ex) { state.loads[state.ex] = mainLoad.get(); persist(); } });
  const editLoad = loadPicker($('editLoad'), $('editKg'));

  // ---------- edit sheet ----------
  let editing = null;  // {key, id, shown} of the set being edited; shown = weight as first displayed
  function openEdit(key, id){
    const s = (state.days[key] || {sets:[]}).sets.find(x => x.id === id); if (!s) return;
    editing = { key, id };
    $('editTitle').textContent = s.ex;
    $('editDate').value = key; $('editDate').max = todayKey();
    $('editTime').value = s.t ? fmtTime(s.t) : '';
    $('editReps').value = s.reps;
    if (isWeight(s.ex)) editLoad.set(Math.max(0, shownW(s)), true); else editLoad.set(shownW(s));
    editing.shown = editLoad.get();
    $('editSheet').classList.add('open');
  }
  $('editMinus').onclick = () => { $('editReps').value = Math.max(1, clampReps($('editReps').value)-1); };
  $('editPlus').onclick = () => { $('editReps').value = Math.min(999, clampReps($('editReps').value)+1); };
  $('editReps').addEventListener('focus', e => e.target.select());
  $('editCancel').onclick = () => closeSheet('editSheet');
  $('editSave').onclick = () => {
    const { key, id } = editing; const reps = clampReps($('editReps').value), w = editLoad.get();
    const date = /^\d{4}-\d\d-\d\d$/.test($('editDate').value) ? $('editDate').value : key;
    if (date > todayKey()) { toast(t('noFuture')); return; }
    const old = state.days[key].sets, s = old.find(x => x.id === id);
    const time = $('editTime').value;
    // Untouched time keeps the exact timestamp (seconds and all) so same-minute sets keep their order.
    const ts = time === (s.t ? fmtTime(s.t) : '') ? (s.t ? atTime(date, new Date(s.t)) : undefined)
      : time ? atTime(date, time) : undefined;
    const rest = old.filter(x => x.id !== id);
    const target = date === key ? rest : (state.days[date] || {sets:[]}).sets;
    if (date !== key) setDay(key, rest);
    // An untouched weight keeps its original number and unit (no kg/lb round-trip drift).
    const keep = w === editing.shown;
    setDay(date, target.concat([makeSet(id, s.ex, reps, keep ? s.w : w, ts, keep ? s.u : state.unit)]).sort((a,b) => (a.t||0) - (b.t||0)));
    closeSheet('editSheet'); persist(); render();
    toast(date === key ? t('saved') : t('movedTo', fmtDate(date)));
  };
  // Timestamp on day `key` at `time`: a Date (keeps its h:m:s.ms) or an "HH:MM" string.
  function atTime(key, time){
    const d = parseKey(key);
    if (typeof time === 'string') { const [h, m] = time.split(':').map(Number); d.setHours(h, m); }
    else d.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
    return d.getTime();
  }
  $('editDelete').onclick = () => { closeSheet('editSheet'); removeSet(editing.key, editing.id); };

  // ---------- exercise sheet ----------
  function exRow(val, weight){
    const r = document.createElement('div'); r.className = 'exrow';
    const i = document.createElement('input'); i.value = val; i.placeholder = t('exPh'); i.maxLength = 20;
    const b = document.createElement('button'); b.className = 'type';
    const showType = () => { b.textContent = weight ? t('typeWeight') : t('typeBody'); b.classList.toggle('on', weight); b.setAttribute('aria-label', t('typeAria', b.textContent)); };
    b.onclick = () => { weight = !weight; showType(); }; showType();
    r.isWeight = () => weight; r.orig = val;
    const x = document.createElement('button'); x.textContent = '×'; x.setAttribute('aria-label', t('remove')); x.onclick = () => r.remove();
    r.append(i, b, x); return r;
  }
  function openSheet(){
    const list = $('exList'); list.innerHTML = '';
    for (const ex of state.exercises) list.appendChild(exRow(ex, isWeight(ex)));
    if (!state.exercises.length) list.appendChild(exRow('', false));
    $('sheet').classList.add('open');
    const first = list.querySelector('input'); if (first && !first.value) first.focus();
  }
  function closeSheet(id){ $(id).classList.remove('open'); }
  $('addRow').onclick = () => { const r = exRow('', false); $('exList').appendChild(r); r.querySelector('input').focus(); };
  $('cancelEx').onclick = () => closeSheet('sheet');
  $('saveEx').onclick = () => {
    const list = [], types = {}, renamed = new Map();
    for (const r of $('exList').querySelectorAll('.exrow')) {
      const name = r.querySelector('input').value.trim();
      if (r.orig && name && name !== r.orig) renamed.set(r.orig, name);
      if (!name || list.includes(name)) continue;
      list.push(name); if (r.isWeight()) types[name] = 'weight';
    }
    if (!list.length) { toast(t('keepOne')); return; }
    closeSheet('sheet'); state.exercises = list; state.types = types;
    if (renamed.size) renameSets(renamed);
    persist(); render();
  };
  // A renamed exercise keeps its history: move its sets, last load and selection to the new name.
  // One pass with a map, so swapping two names works too.
  function renameSets(renamed){
    for (const k in state.days) for (const s of state.days[k].sets) if (renamed.has(s.ex)) s.ex = renamed.get(s.ex);
    const loads = {};
    for (const ex in state.loads) if (!renamed.has(ex)) loads[ex] = state.loads[ex];
    for (const [from, to] of renamed) if (from in state.loads) loads[to] = state.loads[from];
    state.loads = loads;
    if (renamed.has(state.ex)) state.ex = renamed.get(state.ex);
  }
  for (const id of ['sheet','editSheet','exportSheet','importSheet','clearSheet']) {
    $(id).addEventListener('click', e => { if (e.target === $(id)) closeSheet(id); });
  }

  // ---------- export / import ----------
  function backupJson(){
    return JSON.stringify({ app: 'workoutlog', version: 4, exportedAt: new Date().toISOString(), exercises: state.exercises, types: state.types, days: state.days }, null, 1);
  }
  function backupCsv(){
    const rows = [t('csvHead')];
    for (const k of Object.keys(state.days).sort()) {
      for (const s of state.days[k].sets) {
        const kind = t(isWeight(s.ex) && s.w > 0 ? 'kindWeight' : s.w > 0 ? 'kindAdd' : s.w < 0 ? 'kindBand' : 'kindBody');
        rows.push([k, s.ex, s.reps, kind, s.w ? Math.abs(s.w) : '', s.w ? s.u || 'kg' : '', s.t ? fmtTime(s.t) : '']);
      }
    }
    return '\ufeff' + rows.map(r => r.map(v => '"' + String(v).replace(/"/g,'""') + '"').join(',')).join('\r\n');
  }
  function openExport(kind){
    const stamp = todayKey();
    if (kind === 'csv') { state.exportName = t('csvName', stamp); state.exportMime = 'text/csv'; $('exportBox').value = backupCsv(); $('exportTitle').textContent = t('exportCsvTitle'); }
    else { state.exportName = t('jsonName', stamp); state.exportMime = 'application/json'; $('exportBox').value = backupJson(); $('exportTitle').textContent = t('exportJsonTitle'); }
    $('exportShare').style.display = (navigator.share ? '' : 'none');
    $('exportSheet').classList.add('open');
  }
  $('exportJson').onclick = () => openExport('json');
  $('exportCsv').onclick = () => openExport('csv');
  $('exportClose').onclick = () => closeSheet('exportSheet');
  $('exportCopy').onclick = async () => {
    const box = $('exportBox');
    try { await navigator.clipboard.writeText(box.value); toast(t('copied')); return; } catch(e) {}
    box.focus(); box.select();
    try { if (document.execCommand('copy')) { toast(t('copied')); return; } } catch(e) {}
    toast(t('copyManual'));
  };
  $('exportShare').onclick = async () => {
    const text = $('exportBox').value;
    try {
      const file = new File([text], state.exportName, { type: state.exportMime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: state.exportName }); return; }
      await navigator.share({ title: state.exportName, text });
    } catch(e) { if (!(e && e.name === 'AbortError')) toast(t('noShare')); }
  };
  $('exportDl').onclick = async () => {
    const text = $('exportBox').value;
    // Inside the claude.ai viewer, downloads go through its save prompt.
    try {
      if (window.claude && typeof window.claude.use === 'function') {
        const dl = await window.claude.use('downloads');
        if (dl) { await dl.save({ filename: state.exportName, data: text }); toast(t('exported')); return; }
      }
    } catch(e) { if (e && e.code === 'declined') return; }
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], { type: state.exportMime }));
      a.download = state.exportName; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast(t('dlTried'));
    } catch(e) { toast(t('noDl')); }
  };

  function mergeBackup(text){
    let d;
    try { d = JSON.parse(text); } catch(e) { throw new Error(t('badJson')); }
    if (!d || typeof d !== 'object' || !d.days) throw new Error(t('notBackup'));
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
    // Imported types only add; an exercise already set up here keeps its type.
    const types = cleanTypes(d.types);
    for (const ex in types) if (!Object.prototype.hasOwnProperty.call(state.types, ex)) state.types[ex] = types[ex];
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
    if (!text) { toast(t('pickFirst')); return; }
    try { const n = mergeBackup(text); closeSheet('importSheet'); toast(t('imported', n)); }
    catch(e) { toast(e.message); }
  };

  $('clearAll').onclick = () => $('clearSheet').classList.add('open');
  $('clearCancel').onclick = () => closeSheet('clearSheet');
  $('clearGo').onclick = () => {
    state.days = {}; state.exercises = defaults(); state.loads = {}; state.types = {}; state.ex = null;
    try { localStorage.removeItem(KEY); } catch(e) {}
    closeSheet('clearSheet'); render(); toast(t('cleared'));
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
  document.querySelector('.units').addEventListener('click', e => {
    const b = e.target.closest('button[data-unit]'); if (!b || b.dataset.unit === state.unit) return;
    // Last-used loads are plain numbers in the current unit: convert them, rounded to a half.
    for (const ex in state.loads) state.loads[ex] = Math.round(convert(state.loads[ex], state.unit, b.dataset.unit) * 2) / 2;
    state.unit = b.dataset.unit; persist(); render();
  });
  document.querySelector('.lang').addEventListener('click', e => {
    const b = e.target.closest('button[data-lang]'); if (!b || b.dataset.lang === I18N.lang) return;
    // Before anything is logged, the untouched starter exercises follow the language.
    const starter = !Object.keys(state.days).length && state.exercises.join('\n') === defaults().join('\n');
    I18N.setLang(b.dataset.lang);
    if (starter) { state.exercises = defaults(); state.ex = null; }
    showStorageNotice(); render();
  });

  load(); showStorageNotice(); render();

  // ---------- updates & offline (http(s) only; tests on file:// skip this) ----------
  if (location.protocol !== 'file:') {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    // Phones resume a backgrounded tab without reloading, so look for a newer
    // deploy whenever the app comes back to the front.
    const scriptSrc = text => (text.match(/app\.js\?v=[^"]+/) || [''])[0];
    const mine = scriptSrc(document.querySelector('script[src*="app.js"]').getAttribute('src'));
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const html = await (await fetch('index.html', { cache: 'no-store' })).text();
        const latest = scriptSrc(html);
        if (latest && latest !== mine) $('update').classList.add('show');
      } catch(e) {}
    });
    $('update').onclick = () => location.reload();
  }

  let lastKey = todayKey();
  setInterval(() => { const k = todayKey(); if (k !== lastKey) { lastKey = k; render(); } }, 60000);
})();
