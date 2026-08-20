/**
 * 荳荳團分帳計算器 — 全功能回歸測試（精簡輸出版）
 * 用法：node test-all.js [檔案路徑]
 * 只印 FAIL，全部通過時印一行 ALL PASS
 */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const FILE = process.argv[2] || '/mnt/user-data/outputs/index.html';
const html = fs.readFileSync(FILE, 'utf8');

const fails = [];
const ok = (name, cond, extra) => { if (!cond) fails.push(name + (extra ? ' → ' + extra : '')); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function boot(opts = {}) {
  const vc = new VirtualConsole();
  const errs = [];
  vc.on('jsdomError', e => errs.push(e.message.split('\n')[0]));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    url: opts.url || 'http://localhost/', virtualConsole: vc
  });
  const w = dom.window;
  w.fetch = opts.fetch || (() => Promise.reject(new Error('offline')));
  if (opts.secure) Object.defineProperty(w, 'isSecureContext', { value: true, configurable: true });
  return { w, d: w.document, errs };
}
const pick = (d, sel, i = 0) => d.querySelectorAll(sel)[i];
const fire = (el, type, w) => el.dispatchEvent(new w.Event(type, { bubbles: true }));
const setVal = (el, v, w) => { el.value = String(v); fire(el, 'input', w); };
const body = f => [...f.children].find(e => !e.className);
const identify = (d, name) => {
  const b = [...d.querySelectorAll('.ibtn')].find(x => x.textContent === name) || d.querySelector('.ibtn');
  b.click(); d.getElementById('iOk').click();
};

(async () => {
  /* ---------- A. 載入與基本結構 ---------- */
  const A = boot();
  await sleep(1300);
  ok('載入無錯誤', A.errs.length === 0, A.errs[0]);
  ok('身分視窗跳出', !A.d.getElementById('imodal').hidden);
  identify(A.d, '語安家');
  await sleep(400);
  ok('關鍵函式存在', ['askCode', 'merge3', 'transfers', 'calc', 'buildReport']
    .every(fn => A.w.eval('typeof ' + fn) === 'function'));
  ok('頁首單列', A.d.querySelector('.apphead') && A.d.querySelector('.acts'));
  ok('版權存在', /Copyright/.test(A.d.querySelector('.copyright').textContent));
  ok('五家卡片', A.d.querySelectorAll('.fam').length === 5);
  ok('預設全部收合', [...A.d.querySelectorAll('.fam')].every(f => body(f).hidden));
  ok('總花費正確', A.d.getElementById('sTotal').textContent === '$18,965',
    A.d.getElementById('sTotal').textContent);
  ok('每家平均正確', A.d.getElementById('sAvg').textContent === '$3,793');
  ok('日期用斜線', /\//.test(A.d.getElementById('switchDate').textContent));
  ok('預設集中匯', [...A.d.querySelectorAll('.mode')]
    .find(b => b.getAttribute('aria-pressed') === 'true').textContent.includes('集中'));

  /* ---------- B. 編輯與計算 ---------- */
  A.d.getElementById('lockToggle').click();
  await sleep(200);
  ok('解鎖後顯示可編輯', A.d.getElementById('lockMsg').textContent === '可編輯');
  const f0 = pick(A.d, '.fam');
  f0.querySelector('.caretbtn').click();
  ok('可展開', !body(pick(A.d, '.fam')).hidden);
  const amt = pick(A.d, '.fam').querySelector('.amt');
  setVal(amt, '12000', A.w);
  ok('改金額即時重算', A.d.getElementById('sTotal').textContent === '$21,465',
    A.d.getElementById('sTotal').textContent);
  ok('金額擋非數字', (setVal(amt, '-9a5', A.w), amt.value === '95'), amt.value);
  setVal(amt, '9500', A.w);
  const nm = pick(A.d, '.fam').querySelector('.famname');
  ok('名稱預設唯讀', nm.readOnly);
  nm.dispatchEvent(new A.w.MouseEvent('dblclick', { bubbles: true }));
  ok('雙擊可改名', !nm.readOnly);
  nm.dispatchEvent(new A.w.Event('blur', { bubbles: true }));
  pick(A.d, '.fam').querySelector('.add').click();
  await sleep(150);
  ok('新增項目', pick(A.d, '.fam').querySelectorAll('.item').length === 2);
  pick(A.d, '.fam').querySelectorAll('.item .x')[1].click();
  await sleep(150);
  ok('刪除項目', pick(A.d, '.fam').querySelectorAll('.item').length === 1);

  /* ---------- C. 驗算與匯款 ---------- */
  ok('驗算平衡', /完全平衡/.test(A.d.querySelector('.verdict').textContent));
  ok('匯款清單 4 筆', A.d.querySelectorAll('.leg').length === 4, A.d.querySelectorAll('.leg').length);
  A.d.querySelector('.mode[data-mode="min"]').click();
  await sleep(150);
  ok('可切換彼此匯', A.w.eval('trip().mode') === 'min');
  A.d.querySelector('.mode[data-mode="hub"]').click();
  await sleep(150);
  const leg = A.d.querySelector('.leg');
  leg.querySelector('.legacc').click();
  await sleep(150);
  const arow = leg.querySelector('.legaccrow');
  ok('帳號欄位帶出預設值', arow.querySelector('.accbank').value === '822');
  ok('未確認時複製停用', arow.querySelector('.acccopy').disabled);
  arow.querySelector('.accok').click();
  await sleep(150);
  ok('確認後複製可用', !arow.querySelector('.acccopy').disabled);
  ok('確認狀態已存', A.w.eval("!!(state.accOk && state.accOk['語安家'])"));

  /* ---------- D. 破壞性操作需驗證碼 ---------- */
  for (const [id, label] of [['delTrip', '刪除紀錄'], ['clear', '清空金額']]) {
    const before = A.d.querySelectorAll('.hrow').length;
    A.d.getElementById(id).click();
    await sleep(150);
    ok(label + '跳確認框', !A.d.getElementById('modal').hidden);
    ok(label + '確認鈕預設停用', A.d.getElementById('mOk').disabled);
    const code = A.d.getElementById('mCode').textContent;
    const inp = A.d.getElementById('mInput');
    setVal(inp, code === '1111' ? '2222' : '1111', A.w);
    ok(label + '錯碼擋住', A.d.getElementById('mOk').disabled);
    A.d.getElementById('mOk').click();
    await sleep(100);
    ok(label + '錯碼不執行', A.d.querySelectorAll('.hrow').length === before);
    setVal(inp, code, A.w);
    ok(label + '正確碼可執行', !A.d.getElementById('mOk').disabled);
    A.d.getElementById('mCancel').click();
    await sleep(100);
    ok(label + '取消可關閉', A.d.getElementById('modal').hidden);
  }
  const fam2 = A.d.querySelectorAll('.fam')[1];
  fam2.querySelector('.famx').click();
  await sleep(150);
  ok('移除有資料的家跳確認', !A.d.getElementById('modal').hidden);
  A.d.getElementById('mCancel').click();

  /* ---------- E. 報表與匯出 ---------- */
  A.d.getElementById('pdf').click();
  await sleep(300);
  const pv = A.d.getElementById('pdfView');
  ok('報表開啟', !pv.hidden);
  ok('報表四章節', A.d.querySelectorAll('#pdfDoc h2').length === 4);
  ok('報表含費用分類', [...A.d.querySelectorAll('#pdfDoc h2')].some(e => /費用分類/.test(e.textContent)));
  ok('報表含運算符號', [...A.d.querySelectorAll('#pdfDoc .op')].some(e => e.textContent === '−'));
  ok('報表含帳號', /\d{3} \d+/.test(A.d.querySelector('#pdfDoc .pay .acc').textContent));
  A.d.getElementById('pdfClose').click();
  ok('報表可關閉', pv.hidden);

  const S = boot({ secure: true });
  await sleep(1300);
  identify(S.d, '語安家');
  await sleep(300);
  let copied = '';
  Object.defineProperty(S.w.navigator, 'clipboard',
    { value: { writeText: async v => { copied = v; } }, configurable: true });
  S.d.getElementById('copy').click();
  await sleep(300);
  ok('複製結算有內容', copied.length > 200);
  ok('複製含運算式', /−.*=/.test(copied));
  ok('複製含帳號', /822 245540246943/.test(copied));
  ok('複製含費用分類', /四、費用分類/.test(copied) && /・/.test(copied));
  ok('複製分類含明細', /　－.+（.+）\$/.test(copied));
  ok('複製有提示', /已複製/.test(S.d.getElementById('toast').textContent));

  /* ---------- F. 備份還原 ---------- */
  let dl = null;
  S.w.URL.createObjectURL = b => { dl = { size: b.size }; return 'blob:x'; };
  S.w.URL.revokeObjectURL = () => {};
  S.w.HTMLAnchorElement.prototype.click = function () { dl.name = this.download; };
  S.d.getElementById('backup').click();
  ok('備份可下載', dl && /\.json$/.test(dl.name || ''), dl && dl.name);
  S.d.getElementById('restore').click();
  ok('還原視窗開啟', !S.d.getElementById('bmodal').hidden);
  S.d.getElementById('bText').value = JSON.stringify({
    trips: [{ id: 'x', name: '還原測試', date: '2026-07-01', mode: 'hub',
      families: [{ id: 'f', name: '甲家', items: [{ id: 'i', note: '食材', amount: '600' }] }] }],
    currentId: 'x', seed: 3
  });
  S.d.getElementById('bRestore').click();
  await sleep(150);
  const rc = S.d.getElementById('mCode').textContent;
  setVal(S.d.getElementById('mInput'), rc, S.w);
  S.d.getElementById('mOk').click();
  await sleep(250);
  ok('還原成功', S.d.getElementById('sTotal').textContent === '$600',
    S.d.getElementById('sTotal').textContent);

  /* ---------- G. 三方合併（不連線也能驗演算法） ---------- */
  const base = { trips: [{ id: 't1', name: '露營', date: '2026-08-18', families: [
    { id: 'f1', name: '語安家', items: [{ id: 'i1', note: '合菜', amount: '9500' }] },
    { id: 'f2', name: '言琳家', items: [{ id: 'i2', note: '營位費', amount: '6000' }] }] }], accounts: {} };
  const mine = JSON.parse(JSON.stringify(base)); mine.trips[0].families[1].items[0].amount = '7000';
  const theirs = JSON.parse(JSON.stringify(base)); theirs.trips[0].families[0].items[0].amount = '12000';
  const merged = A.w.eval('merge3')(JSON.stringify(base), mine, theirs);
  const val = (o, i) => o.trips[0].families[i].items[0].amount;
  ok('合併保留雙方修改', val(merged, 0) === '12000' && val(merged, 1) === '7000',
    val(merged, 0) + '/' + val(merged, 1));
  const added = JSON.parse(JSON.stringify(base));
  added.trips[0].families[1].items.push({ id: 'i9', note: '冰塊', amount: '250' });
  const m2 = A.w.eval('merge3')(JSON.stringify(base), added, theirs);
  ok('合併保留新增項目', m2.trips[0].families[1].items.length === 2);

  /* ---------- H. 分類自動判斷（長詞優先，防短詞誤中） ---------- */
  const gc = A.w.eval('guessCat');
  const CASES = [
    ['沙拉油', 'food'], ['醬油', 'food'], ['奶油', 'food'], ['烤肉食材', 'food'],
    ['買菜', 'food'], ['啤酒', 'food'], ['冰塊', 'food'], ['全聯', 'food'], ['7-11', 'food'],
    ['營位費', 'stay'], ['營區清潔費', 'stay'], ['包棟', 'stay'],
    ['加油', 'ride'], ['國道通行費', 'ride'], ['停車費', 'ride'], ['船票', 'ride'], ['露營車', 'ride'],
    ['門票', 'tick'], ['溫泉票', 'tick'], ['兒童票', 'tick'],
    ['帳篷租借', 'gear'], ['瓦斯', 'gear'], ['菜刀', 'gear'], ['行動電源', 'gear'], ['推車', 'gear'],
    ['木炭', 'misc'], ['酒精', 'misc'], ['蚊香', 'misc'], ['清潔費', 'misc'], ['水電費', 'misc'],
    ['發票', ''], ['統一發票', ''], ['公基金', ''], ['補差額', ''], ['退費', ''], ['', ''],
    ['合菜及咖哩', 'food'], ['肉片', 'food'], ['熟飯', 'food'], ['蘋果', 'food'],
    ['烏龍麵', 'food'], ['吐司', 'food'], ['蔬菜、起司', 'food'],
    ['露營椅', 'gear'], ['機油', 'ride']
  ];
  CASES.forEach(([note, want]) => ok('分類判斷「' + (note || '空白') + '」', gc(note) === want, gc(note) || '無'));
  ok('分類全形轉半形', gc('ＵＢＥＲ車資') === 'ride');
  ok('分類忽略空白', gc('晚 餐') === 'food');
  const eff = A.w.eval('effCat');
  ok('手動分類優先於自動', eff({ note: '沙拉油', cat: 'gear' }) === 'gear');
  ok('猜不到歸無法判斷', eff({ note: '公基金' }) === 'none');

  /* ---------- 結果 ---------- */
  console.log(fails.length ? 'FAIL (' + fails.length + ')\n - ' + fails.join('\n - ') : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
