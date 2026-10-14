// Interface text in every language. index.html marks its fixed text with data-i18n (text),
// data-i18n-aria (aria-label) and data-i18n-ph (placeholder); app.js calls I18N.t().
// Values are strings, or functions for text with numbers in it. Exercise names are the
// user's own data and are never translated.
(function(){
  const plural = (n, one, many) => n === 1 ? one : many;
  const STRINGS = {
    zh: {
      htmlLang: 'zh-Hant', title: '運動紀錄', manifest: 'manifest.webmanifest',
      defaults: ['單槓', '伏地挺身'],
      fmtDate: d => (d.getMonth()+1) + '月' + d.getDate() + '日 週' + '日一二三四五六'[d.getDay()],
      update: '有新版本，點一下更新',
      minus: '減一下', plus: '加一下', repsInSet: '這組幾下',
      load: '負重', body: '徒手', add: '加重', band: '拉力帶',
      kgMinus: '減 2.5 公斤', kgPlus: '加 2.5 公斤', kg: '公斤',
      logBtn: ex => '記一組' + (ex ? '　' + ex : ''),
      editEx: '編輯', addEx: '＋ 新增動作',
      today: '今天', todayEmpty: '還沒開始，拉一組就會出現在這裡。',
      stats: '統計', week: '本週', month: '本月', all: '全部', history: '之前',
      backup: '備份', backupNote: '紀錄只存在這支手機的瀏覽器裡。清掉瀏覽器資料或換手機前，先匯出備份。',
      exportJson: '匯出備份', exportCsv: '匯出 CSV', importBackup: '匯入備份', clearAll: '清除全部紀錄',
      language: '語言',
      manageEx: '管理動作', exList: '動作清單', addRow: '＋ 新增一個動作', cancel: '取消', save: '儲存',
      editSet: '修改這組', date: '日期', time: '時間', del: '刪除',
      exportLabel: '匯出', exportHint: '按「下載檔案」存成檔案。如果沒有出現下載，就按「複製」再貼到記事本或訊息裡。',
      copy: '複製', share: '分享', download: '下載檔案', close: '關閉',
      importLabel: '匯入', importNote: '選擇之前匯出的備份檔，或把備份內容貼在下面。會跟現有紀錄合併，不會重複。',
      importPh: '把備份內容貼在這裡', importGo: '匯入',
      clearLabel: '清除', clearQ: '清除全部紀錄？',
      clearNote: '會把這支手機上的所有紀錄刪掉，動作清單也會回到預設。刪掉就找不回來了，建議先匯出備份。', clearGo: '清除',
      // header "8下 · 2 組", day rows, history heads
      repsU: n => '下', setsU: n => ' 組',
      rowKg: n => 'kg · ' + n + ' 組', rowReps: n => '下 · ' + n + ' 組',
      dayHead: (r, s) => '<span class="num">' + r + '</span> 下 · ' + s + ' 組',
      bandKg: kg => '帶' + kg + 'kg',
      setAriaKg: (w, r) => w + ' 公斤 ' + r + ' 下，點一下可修改',
      setAria: (r, l) => r + ' 下' + (l ? ' ' + l : '') + '，點一下可修改',
      // stats
      noStats: '這段時間還沒有紀錄。', volKg: '總量 kg', totalReps: '總共下',
      setsL: n => '組', daysL: n => '天', max: x => '最重 ' + x,
      barsCap: (max, unit) => '最近 14 天 · 最多一天 ' + max + unit, unitKg: ' kg', unitReps: ' 下',
      noHistory: '還沒有過去的紀錄。',
      // toasts and messages
      whatKg: (w, r) => w + 'kg × ' + r + ' 下', whatReps: (r, l) => r + ' 下' + (l ? '（' + l + '）' : ''),
      logged: (ex, what) => ex + ' ' + what + '，記好了',
      deleted: '刪掉了', noFuture: '不能選未來的日期', saved: '改好了', movedTo: d => '改好了，移到 ' + d,
      keepOne: '至少留一個動作',
      noStorage: '這個瀏覽器沒辦法儲存（可能是無痕模式）。現在記的東西關掉頁面就會不見。',
      // exercise editor
      exPh: '動作名稱，例如：單槓', typeWeight: '重量', typeBody: '自重',
      typeAria: x => '類型：' + x + '，點一下切換', remove: '移除',
      // export / import
      csvHead: ['日期', '動作', '次數', '負重', '公斤', '時間'],
      kindWeight: '重量', kindAdd: '加重', kindBand: '拉力帶', kindBody: '徒手',
      csvName: d => '運動紀錄-' + d + '.csv', jsonName: d => '運動紀錄備份-' + d + '.json',
      exportCsvTitle: '匯出 CSV', exportJsonTitle: '匯出備份',
      copied: '複製好了', copyManual: '請長按文字框自行複製', noShare: '這裡不能分享，改用複製或下載',
      exported: '已匯出', dlTried: '已嘗試下載，沒出現就改用複製', noDl: '這裡不能下載，請用複製',
      badJson: '看不懂這個內容，確認是之前匯出的備份', notBackup: '這不是運動紀錄的備份檔',
      pickFirst: '先選檔案或貼上內容', imported: n => '匯入完成，新增了 ' + n + ' 組', cleared: '已清除',
    },
    en: {
      htmlLang: 'en', title: 'Workout Log', manifest: 'manifest.en.webmanifest',
      defaults: ['Pull-ups', 'Push-ups'],
      fmtDate: d => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      update: 'New version available — tap to update',
      minus: 'One less', plus: 'One more', repsInSet: 'Reps in this set',
      load: 'Load', body: 'Bodyweight', add: 'Added', band: 'Band',
      kgMinus: 'Minus 2.5 kg', kgPlus: 'Plus 2.5 kg', kg: 'Kilograms',
      logBtn: ex => 'Log a set' + (ex ? ' · ' + ex : ''),
      editEx: 'Edit', addEx: '+ Add exercise',
      today: 'Today', todayEmpty: 'Nothing yet — your sets will show up here.',
      stats: 'Stats', week: 'This week', month: 'This month', all: 'All time', history: 'Earlier',
      backup: 'Backup', backupNote: "Your log is stored only in this phone's browser. Export a backup before clearing browser data or switching phones.",
      exportJson: 'Export backup', exportCsv: 'Export CSV', importBackup: 'Import backup', clearAll: 'Clear all data',
      language: 'Language',
      manageEx: 'Manage exercises', exList: 'Exercises', addRow: '+ Add an exercise', cancel: 'Cancel', save: 'Save',
      editSet: 'Edit set', date: 'Date', time: 'Time', del: 'Delete',
      exportLabel: 'Export', exportHint: 'Tap "Download file" to save it. If no download appears, tap "Copy" and paste it into a note or message.',
      copy: 'Copy', share: 'Share', download: 'Download file', close: 'Close',
      importLabel: 'Import', importNote: "Pick a backup file you exported, or paste its contents below. It's merged with your current log, without duplicates.",
      importPh: 'Paste the backup here', importGo: 'Import',
      clearLabel: 'Clear', clearQ: 'Clear all data?',
      clearNote: "Deletes every set on this phone and resets the exercise list. This can't be undone — export a backup first.", clearGo: 'Clear',
      repsU: n => plural(n, ' rep', ' reps'), setsU: n => plural(n, ' set', ' sets'),
      rowKg: n => 'kg · ' + n + plural(n, ' set', ' sets'), rowReps: n => 'reps · ' + n + plural(n, ' set', ' sets'),
      dayHead: (r, s) => '<span class="num">' + r + '</span>' + plural(r, ' rep', ' reps') + ' · ' + s + plural(s, ' set', ' sets'),
      bandKg: kg => 'band ' + kg + 'kg',
      setAriaKg: (w, r) => w + ' kg × ' + r + plural(r, ' rep', ' reps') + ', tap to edit',
      setAria: (r, l) => r + plural(r, ' rep', ' reps') + (l ? ' ' + l : '') + ', tap to edit',
      noStats: 'No sets in this period yet.', volKg: 'kg volume', totalReps: 'reps',
      setsL: n => plural(n, 'set', 'sets'), daysL: n => plural(n, 'day', 'days'), max: x => 'max ' + x,
      barsCap: (max, unit) => 'Last 14 days · best day ' + max + unit, unitKg: ' kg', unitReps: ' reps',
      noHistory: 'No past sets yet.',
      whatKg: (w, r) => w + 'kg × ' + r, whatReps: (r, l) => r + plural(r, ' rep', ' reps') + (l ? ' (' + l + ')' : ''),
      logged: (ex, what) => ex + ' ' + what + ' — logged',
      deleted: 'Deleted', noFuture: "Can't pick a future date", saved: 'Saved', movedTo: d => 'Saved — moved to ' + d,
      keepOne: 'Keep at least one exercise',
      noStorage: "This browser can't save (private browsing?). Anything you log will be gone when you close the page.",
      exPh: 'Exercise name, e.g. Pull-ups', typeWeight: 'Weight', typeBody: 'Bodyweight',
      typeAria: x => 'Type: ' + x + ', tap to switch', remove: 'Remove',
      csvHead: ['Date', 'Exercise', 'Reps', 'Load', 'kg', 'Time'],
      kindWeight: 'weight', kindAdd: 'added', kindBand: 'band', kindBody: 'bodyweight',
      csvName: d => 'workout-log-' + d + '.csv', jsonName: d => 'workout-log-backup-' + d + '.json',
      exportCsvTitle: 'Export CSV', exportJsonTitle: 'Export backup',
      copied: 'Copied', copyManual: 'Long-press the text box to copy it', noShare: "Sharing isn't available here — copy or download instead",
      exported: 'Exported', dlTried: "Download started — if nothing appears, use Copy", noDl: "Downloads aren't available here — use Copy",
      badJson: "Couldn't read this — make sure it's a backup you exported", notBackup: "This isn't a Workout Log backup",
      pickFirst: 'Pick a file or paste a backup first', imported: n => 'Imported — ' + n + plural(n, ' new set', ' new sets'), cleared: 'Cleared',
    },
  };

  // A choice made with the language switch wins; otherwise Chinese phones get Chinese, everyone else English.
  const KEY = 'workoutlog.lang';
  function pick(){
    try { const saved = localStorage.getItem(KEY); if (saved && STRINGS[saved]) return saved; } catch(e) {}
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh/i.test(nav) ? 'zh' : 'en';
  }
  let lang = pick();

  function t(key, ...args){
    const v = STRINGS[lang][key];
    return typeof v === 'function' ? v(...args) : v;
  }
  function apply(){
    document.documentElement.lang = t('htmlLang');
    document.title = t('title');
    document.querySelector('meta[name="apple-mobile-web-app-title"]').content = t('title');
    document.querySelector('link[rel="manifest"]').setAttribute('href', t('manifest'));
    for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
    for (const e of document.querySelectorAll('[data-i18n-aria]')) e.setAttribute('aria-label', t(e.dataset.i18nAria));
    for (const e of document.querySelectorAll('[data-i18n-ph]')) e.placeholder = t(e.dataset.i18nPh);
    for (const b of document.querySelectorAll('.lang button')) b.classList.toggle('on', b.dataset.lang === lang);
  }
  function setLang(l){
    if (!STRINGS[l]) return;
    lang = l;
    try { localStorage.setItem(KEY, l); } catch(e) {}
    apply();
  }

  window.I18N = { t, apply, setLang, strings: STRINGS, get lang(){ return lang; } };
  apply();
})();
