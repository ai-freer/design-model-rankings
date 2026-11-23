const DATA = window.RANKINGS_DATA;
const snapshot = DATA.current;
const providers = DATA.providers;
const snapshotHistory = DATA.history;
const latestEntry = snapshotHistory[snapshotHistory.length - 1];
const byId = (id) => document.getElementById(id);

const FIELD_LABELS = {
  title: '名称',
  label: '官方名称',
  category: '分类',
  officialDate: '官方日期',
  sourceVersion: '官方版本',
  coverage: '覆盖范围',
  method: '口径说明'
};

const categories = snapshot.categories.map((category) => ({
  ...category,
  boards: snapshot.boards.filter((board) => board.category === category.id)
}));
const boardsById = new Map(snapshot.boards.map((board) => [board.id, board]));
const models = new Map();
for (const board of snapshot.boards) {
  for (const row of board.rows) {
    if (!models.has(row.modelId)) models.set(row.modelId, { modelId: row.modelId, name: row.name, provider: row.provider, boards: 0 });
    models.get(row.modelId).boards += 1;
  }
}
const changeByRow = new Map(latestEntry.changes
  .filter((change) => change.modelId)
  .map((change) => [change.boardId + '|' + change.modelId, change]));
const newModelIds = new Set(latestEntry.newModels.map((model) => model.modelId));

function defaultPicks() {
  const rows = snapshot.boards[0].rows;
  const second = rows.find((row) => row.provider !== rows[0].provider) || rows[1];
  return { pickA: rows[0].modelId, pickB: second ? second.modelId : 'none' };
}

const state = { categoryId: categories[0].id, ...defaultPicks(), userPicked: false, compareVisible: false };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function formatNumber(value) {
  return value.toLocaleString('en-US');
}

function formatCheckedAt(iso, includeTime = true) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(iso));
  const part = (type) => parts.find((item) => item.type === type).value;
  const date = part('year') + '.' + part('month') + '.' + part('day');
  return includeTime ? date + ' ' + part('hour') + ':' + part('minute') + ' 日本时间' : date;
}

function brandMark(provider, size) {
  const brand = providers[provider];
  if (brand) {
    return '<span class="brandmark brandmark-' + size + '"><img src="' + escapeHtml(brand.asset) + '" alt="' + escapeHtml(brand.alt) + '"></span>';
  }
  const initials = provider.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return '<span class="brandmark brandmark-' + size + ' brandmark-text" role="img" aria-label="' + escapeHtml(provider) + '" title="' + escapeHtml(provider) + '">' + escapeHtml(initials) + '</span>';
}

function splitName(name) {
  const match = name.match(/^(.+?)\s*\(([^)]*)\)$/);
  return match ? { base: match[1], effort: match[2] } : { base: name, effort: '' };
}

function parseCi(text) {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  return match ? { low: Number(match[1]), high: Number(match[2]) } : undefined;
}

function scoreDomain(board) {
  const values = board.rows.flatMap((row) => {
    const ci = row.ci ? parseCi(row.ci) : undefined;
    return ci ? [row.score, ci.low, ci.high] : [row.score];
  });
  const low = Math.min(...values);
  const high = Math.max(...values);
  const span = Math.max(high - low, 1);
  const step = Math.max(5, Math.pow(10, Math.floor(Math.log10(span)) - 1));
  const min = Math.floor((low - span * 0.06) / step) * step;
  const max = Math.ceil((high + span * 0.06) / step) * step;
  const roughTickStep = (max - min) / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughTickStep)));
  const tickStep = [1, 2, 2.5, 5, 10].map((multiple) => multiple * magnitude).find((candidate) => candidate >= roughTickStep);
  const ticks = [];
  for (let tick = Math.ceil(min / tickStep) * tickStep; tick <= max; tick += tickStep) ticks.push(tick);
  return { min, max, ticks };
}

function position(value, axis) {
  return ((value - axis.min) / (axis.max - axis.min)) * 100;
}

function gridLines(axis) {
  return axis.ticks.map((tick) => {
    const x = position(tick, axis).toFixed(2) + '%';
    return 'linear-gradient(to right, transparent calc(' + x + ' - 0.5px), var(--grid) calc(' + x + ' - 0.5px), var(--grid) calc(' + x + ' + 0.5px), transparent calc(' + x + ' + 0.5px))';
  }).join(', ');
}

function slotFor(modelId) {
  if (modelId === state.pickA) return 'A';
  if (modelId === state.pickB) return 'B';
  return '';
}

function rowSlot(modelId) {
  return state.userPicked ? slotFor(modelId) : '';
}

function sourceDates(board) {
  return [
    board.officialDate && '官方 ' + board.officialDate,
    board.sourceVersion && '版本 ' + board.sourceVersion,
    !board.officialDate && '核验 ' + formatCheckedAt(snapshot.checkedAt, false)
  ].filter(Boolean);
}

function renderHero() {
  const stats = [
    ['官方榜单', formatNumber(snapshot.boards.length)],
    ['模型', formatNumber(models.size)],
    ['创作方向', formatNumber(categories.length)],
    ['最近核验', formatCheckedAt(snapshot.checkedAt, false).slice(5)]
  ];
  byId('hero-stats').innerHTML = stats.map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>').join('');
  renderSpotlight();
  byId('snapshot-pill').innerHTML = '<span aria-hidden="true"></span>已核验 ' + formatCheckedAt(snapshot.checkedAt, false);
  byId('footer-snapshot').textContent = '当前快照 ' + snapshot.id + ' · ' + snapshot.summary;
}

function renderSpotlight() {
  const category = categories.find((item) => item.id === byId('spot-category').value) || categories[0];
  const board = boardsById.get(category.representativeBoard) || category.boards[0];
  const [first, second] = board.rows;
  const leaders = board.rows.filter((row) => row.rank <= 3);
  let reading = '';
  if (second) {
    const gap = first.score - second.score;
    reading = gap === 0 ? '前两项公布得分相同。' : '前两项公布得分相差 ' + formatNumber(Math.abs(gap)) + ' 分。';
    const a = parseCi(first.ci);
    const b = parseCi(second.ci);
    if (a && b) reading += Math.max(a.low, b.low) <= Math.min(a.high, b.high)
      ? '两者的置信区间有重叠。' : '两者的置信区间未重叠。';
  }
  byId('spot-content').innerHTML = '<small class="spot-source">' + escapeHtml(board.source.name) + '</small>'
    + '<h3>' + escapeHtml(board.title) + '</h3><p class="spot-reason">' + escapeHtml(category.selectionReason || board.label) + '</p>'
    + '<ol class="spot-rows">' + leaders.slice(0, 3).map((row) =>
      '<li><span class="spot-rank">' + String(row.rank).padStart(2, '0') + '</span>' + brandMark(row.provider, 'sm')
      + '<strong>' + escapeHtml(row.name) + '</strong><b>' + formatNumber(row.score) + '</b></li>').join('') + '</ol>'
    + '<p class="spot-reading">' + (board.carriedForward ? '本期沿用上期读数。' : '') + reading
    + (leaders.length > 3 ? '另有并列，详见完整榜。' : '') + '</p>'
    + '<a class="button button-primary spot-link" href="#board-' + board.id + '" data-board-link="' + board.id + '">查看完整榜单</a>';
}

function renderCategoryTabs() {
  byId('category-tabs').innerHTML = categories.map((category) => {
    const active = category.id === state.categoryId;
    return '<button type="button" role="tab" id="tab-' + category.id + '" data-category="' + category.id + '" aria-controls="category-panel" aria-selected="' + active + '" tabindex="' + (active ? 0 : -1) + '">'
      + '<span>' + escapeHtml(category.label) + '</span><small>' + category.boards.length + '</small></button>';
  }).join('');
}

function renderCategoryPanel() {
  const category = categories.find((item) => item.id === state.categoryId);
  const panel = byId('category-panel');
  const groups = new Map();
  for (const board of category.boards) {
    const key = board.module || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(board);
  }
  const index = [...groups].map(([label, boards]) => '<div class="index-group">'
    + (label ? '<strong>' + escapeHtml(label) + '</strong>' : '')
    + '<nav class="board-index" aria-label="' + escapeHtml(label || category.label) + '榜单导航">'
    + boards.map((board) => '<a href="#board-' + board.id + '">' + escapeHtml(board.title) + '</a>').join('') + '</nav></div>').join('');
  byId('subnav').innerHTML = category.boards.length > 1 ? index : '';
  byId('subnav').scrollLeft = 0;
  byId('subnav-select').innerHTML = [...groups].map(([label, boards]) => {
    const options = boards.map((board) => '<option value="board-' + board.id + '">' + escapeHtml(board.title) + '</option>').join('');
    return label ? '<optgroup label="' + escapeHtml(label) + '">' + options + '</optgroup>' : options;
  }).join('');
  panel.setAttribute('aria-labelledby', 'tab-' + category.id);
  const legend = '<div class="panel-note"><p>' + escapeHtml(category.description) + '</p>'
    + '<ul class="legend" aria-label="图例"><li><i class="legend-dot"></i>官方得分</li><li><i class="legend-ci"></i>95% 置信区间</li>'
    + '<li><i class="legend-leader"></i>榜首</li><li>横轴按各榜可见分数截断</li></ul></div>';
  panel.innerHTML = legend + [...groups].map(([label, boards]) => (label ? '<h3 class="module-heading">' + escapeHtml(label) + '</h3>' : '')
    + '<div class="board-stack">' + boards.map((board) => renderBoard(board, label ? 4 : 3)).join('') + '</div>').join('');
  syncBoardNav();
  updateScrollFades();
}

function renderBoard(board, headingLevel) {
  const axis = scoreDomain(board);
  const leader = board.rows[0].score;
  const hasCi = board.rows.some((row) => row.ci);
  const ticks = axis.ticks.map((tick) => '<span style="--x:' + position(tick, axis) + '%">' + formatNumber(tick) + '</span>').join('');
  const rows = board.rows.map((row, index) => {
    const previous = board.rows[index - 1];
    const missing = previous && row.rank - previous.rank > 1
      ? '<li class="rank-gap">官方第 ' + (previous.rank + 1) + (row.rank - previous.rank > 2 ? '–' + (row.rank - 1) : '') + ' 名未在本页展开</li>'
      : '';
    return missing + renderRow(board, row, axis, leader);
  }).join('');
  const carried = board.carriedForward
    ? '<p class="board-warning">本期未能重新核对，沿用 ' + escapeHtml(board.carriedForward.from) + ' 的数据：' + escapeHtml(board.carriedForward.reason) + '</p>'
    : '';
  const notes = (board.notes || []).map((note) => '<p>' + escapeHtml(note) + '</p>').join('');
  const scope = board.parentBoard ? boardsById.get(board.parentBoard).title + ' · ' + board.role : board.role;
  const meta = [board.label, ...sourceDates(board), board.coverage, !hasCi && '未公布置信区间'].filter(Boolean);
  const heading = 'h' + headingLevel;
  return '<article class="board" id="board-' + board.id + '" aria-labelledby="board-title-' + board.id + '" style="--ticks:' + gridLines(axis) + '">'
    + '<header class="board-head"><div class="board-title">'
    + '<p class="board-source">' + escapeHtml([board.source.name, scope].filter(Boolean).join(' / ')) + '</p>'
    + '<' + heading + ' id="board-title-' + board.id + '">' + escapeHtml(board.title) + '</' + heading + '>'
    + '<p class="board-meta">' + meta.map((item) => '<span>' + escapeHtml(item) + '</span>').join('') + '</p></div>'
    + '<a class="source-link" href="' + escapeHtml(board.source.url) + '" target="_blank" rel="noreferrer">官方原榜</a></header>'
    + carried
    + '<div class="row-grid board-axis" aria-hidden="true"><span>名次</span><span></span><span>模型</span><div class="axis-ticks"><div>' + ticks + '</div></div><span class="axis-score">得分</span><span></span></div>'
    + '<ol class="rows" aria-label="' + escapeHtml(board.title) + '官方排名">' + rows + '</ol>'
    + (notes ? '<div class="board-notes">' + notes + '</div>' : '')
    + '<details class="board-method"><summary>口径说明</summary><p>' + escapeHtml(board.method) + '</p>'
    + (board.source.detail ? '<p>数据来源补充：' + escapeHtml(board.source.detail) + '</p>' : '') + '</details>'
    + '</article>';
}

function movementBadge(board, row) {
  if (latestEntry.baseline) return '';
  if (newModelIds.has(row.modelId)) return '<span class="badge badge-new">新模型</span>';
  const change = changeByRow.get(board.id + '|' + row.modelId);
  if (!change) return '';
  if (change.type === 'model-added') return '<span class="badge badge-new">新进</span>';
  const rankDelta = change.rank.from - change.rank.to;
  const title = '上期第 ' + change.rank.from + ' 名，' + formatNumber(change.score.from) + ' 分';
  if (rankDelta > 0) return '<span class="badge badge-up" title="' + title + '">↑' + rankDelta + '</span>';
  if (rankDelta < 0) return '<span class="badge badge-down" title="' + title + '">↓' + Math.abs(rankDelta) + '</span>';
  const scoreDelta = change.score.to - change.score.from;
  return '<span class="badge" title="' + title + '">' + (scoreDelta > 0 ? '+' : '−') + formatNumber(Math.abs(scoreDelta)) + ' 分</span>';
}

function renderRow(board, row, axis, leader) {
  const name = splitName(row.name);
  const slot = rowSlot(row.modelId);
  const gap = leader - row.score;
  const details = [row.ci && '95% CI ' + row.ci, row.rankRange && '名次区间 ' + row.rankRange, row.extra].filter(Boolean);
  const colors = providers[row.provider] || { light: '#7b808a', dark: '#a6abb5' };
  const classes = ['row', 'row-grid'];
  if (row.rank <= 3) classes.push('row-top');
  if (slot) classes.push('row-picked-' + slot.toLowerCase());
  if (row.rank === 1) classes.push('row-first');

  return '<li class="' + classes.join(' ') + '" style="--provider-light:' + colors.light + ';--provider-dark:' + colors.dark + '">'
    + '<span class="row-rank">' + String(row.rank).padStart(2, '0') + '</span>'
    + brandMark(row.provider, 'sm')
    + '<div class="row-model"><div class="row-name"><span class="model-base">' + escapeHtml(name.base) + '</span>'
    + (name.effort ? '<span class="effort">' + escapeHtml(name.effort) + '</span>' : '') + movementBadge(board, row) + '</div>'
    + (details.length ? '<details class="row-data"><summary><span>' + escapeHtml(row.provider) + '</span>'
      + '<span class="info-icon" aria-hidden="true">i</span><span class="visually-hidden">查看评测数据</span></summary><p>'
      + escapeHtml(details.join(' · ')) + '</p></details>' : '<div class="row-meta">' + escapeHtml(row.provider) + '</div>')
    + '</div>'
    + renderTrack(row, axis, leader)
    + '<div class="row-score"><strong>' + formatNumber(row.score) + '</strong><span>' + (gap === 0 ? '榜首' : '−' + formatNumber(gap)) + '</span></div>'
    + '<button class="pick-button" type="button" data-compare="' + escapeHtml(row.modelId) + '" aria-pressed="' + Boolean(slot) + '" aria-label="对照 ' + escapeHtml(row.name) + '">' + (slot || '对照') + '</button>'
    + '</li>';
}

function renderTrack(row, axis, leader) {
  const ci = row.ci ? parseCi(row.ci) : undefined;
  const label = '得分 ' + row.score + '，截断横轴 ' + axis.min + ' 至 ' + axis.max + (row.ci ? '，95% 置信区间 ' + row.ci : '');
  const band = ci ? '<span class="track-ci" style="--from:' + position(ci.low, axis) + '%;--to:' + position(ci.high, axis) + '%"></span>' : '';
  return '<div class="track" role="img" aria-label="' + escapeHtml(label) + '"><div class="track-area" style="--x:' + position(row.score, axis) + '%;--leader:' + position(leader, axis) + '%">'
    + '<span class="track-fill"></span>' + band + '<span class="track-dot"></span></div></div>';
}

function syncPickedRows() {
  for (const button of document.querySelectorAll('[data-compare]')) {
    const slot = rowSlot(button.dataset.compare);
    const row = button.closest('.row');
    button.textContent = slot || '对照';
    button.setAttribute('aria-pressed', String(Boolean(slot)));
    row.classList.toggle('row-picked-a', slot === 'A');
    row.classList.toggle('row-picked-b', slot === 'B');
  }
}

function modelOptions(placeholder, excludedId) {
  const groups = new Map();
  const sorted = [...models.values()].sort((first, second) => first.provider.localeCompare(second.provider) || first.name.localeCompare(second.name));
  for (const model of sorted) {
    if (!groups.has(model.provider)) groups.set(model.provider, []);
    groups.get(model.provider).push(model);
  }
  return '<option value="none">' + placeholder + '</option>' + [...groups].map(([provider, list]) => '<optgroup label="' + escapeHtml(provider) + '">'
    + list.map((model) => '<option value="' + escapeHtml(model.modelId) + '"' + (model.modelId === excludedId ? ' disabled' : '') + '>' + escapeHtml(model.name) + '</option>').join('')
    + '</optgroup>').join('');
}

function renderPickers() {
  byId('pick-a').innerHTML = modelOptions('选择模型 A', state.pickB);
  byId('pick-b').innerHTML = modelOptions('选择模型 B', state.pickA);
  byId('pick-a').value = state.pickA;
  byId('pick-b').value = state.pickB;
  byId('clear-picks').disabled = state.pickA === 'none' && state.pickB === 'none';
  byId('swap-picks').disabled = state.pickA === 'none' && state.pickB === 'none';
}

function butterflyModel(modelId, slot) {
  const model = models.get(modelId);
  if (!model) return '<div class="bf-model bf-model-' + slot.toLowerCase() + ' bf-model-empty"><span class="slot-tag">' + slot + '</span><strong>选择模型 ' + slot + '</strong><span>从上方下拉框或任意排名行加入</span></div>';
  return '<div class="bf-model bf-model-' + slot.toLowerCase() + '"><span class="slot-tag">' + slot + '</span>' + brandMark(model.provider, 'md')
    + '<div><strong>' + escapeHtml(splitName(model.name).base) + '</strong><span>' + escapeHtml(model.provider) + '</span><span class="bf-count">出现在 ' + model.boards + ' 个榜单</span></div></div>';
}

function butterflySide(item, row, side, lead) {
  if (!row) return '<div class="bf-side bf-side-' + side + ' bf-missing"><span>本页未收录</span></div>';
  const leader = item.board.rows[0].score;
  const ratio = Math.max(0.06, (row.score - item.axis.min) / (leader - item.axis.min));
  const effort = splitName(row.name).effort;
  return '<div class="bf-side bf-side-' + side + '" title="' + escapeHtml(row.name) + '">'
    + '<div class="bf-value"><strong>#' + row.rank + (lead ? '<b class="bf-lead">+' + formatNumber(lead) + '</b>' : '') + '</strong>'
    + '<span>' + formatNumber(row.score) + (effort ? ' · ' + escapeHtml(effort) : '') + '</span></div>'
    + '<span class="bf-bar" style="--r:' + ratio.toFixed(3) + '"></span></div>';
}

function butterflyCenter(item) {
  let note = '';
  if (!item.a || !item.b) note = '<span class="verdict">单侧收录</span>';
  else if (item.a.score === item.b.score) note = '<span class="verdict">同分</span>';
  return '<div class="bf-center"><a href="#board-' + item.board.id + '" data-board-link="' + item.board.id + '" title="' + escapeHtml(item.board.source.name) + '">'
    + escapeHtml(item.board.title) + '</a>' + note + '</div>';
}

function butterflyRow(item) {
  const difference = item.a && item.b ? item.a.score - item.b.score : 0;
  return '<div class="bf-row">' + butterflySide(item, item.a, 'a', Math.max(difference, 0)) + butterflyCenter(item)
    + butterflySide(item, item.b, 'b', Math.max(-difference, 0)) + '</div>';
}

function renderButterfly() {
  const container = byId('butterfly');
  if (state.pickA === 'none' && state.pickB === 'none') {
    container.innerHTML = '<div class="empty-state"><strong>选择两个模型开始对照</strong><p>在榜单行点击“对照”，或用上方下拉框选择。</p></div>';
    return;
  }
  const items = snapshot.boards.map((board) => ({
    board,
    axis: scoreDomain(board),
    a: board.rows.find((row) => row.modelId === state.pickA),
    b: board.rows.find((row) => row.modelId === state.pickB)
  })).filter((item) => item.a || item.b);
  const shared = items.filter((item) => item.a && item.b);
  const aHigher = shared.filter((item) => item.a.score > item.b.score).length;
  const bHigher = shared.filter((item) => item.b.score > item.a.score).length;
  const groups = categories.map((category) => {
    const groupItems = items.filter((item) => item.board.category === category.id);
    if (!groupItems.length) return '';
    return '<div class="bf-group"><p class="bf-group-label">' + escapeHtml(category.label) + '</p>'
      + groupItems.map(butterflyRow).join('')
      + '</div>';
  }).join('');
  const hiddenBoards = snapshot.boards.length - items.length;

  container.innerHTML = '<div class="butterfly">'
    + '<div class="bf-head">' + butterflyModel(state.pickA, 'A')
    + '<div class="bf-score"><strong><span class="score-a">' + aHigher + '</span><i>:</i><span class="score-b">' + bHigher + '</span></strong><span>' + (shared.length ? '同时出现的 ' + shared.length + ' 个榜单中得分更高的次数' : '两者没有同时出现的榜单') + '</span></div>'
    + butterflyModel(state.pickB, 'B') + '</div>'
    + (groups || '<div class="empty-state"><p>所选模型在当前快照中没有收录记录。</p></div>')
    + '<p class="bf-foot">条长只在同一榜单内可比。数字为官方名次、得分和努力档位，+N 为同榜得分领先幅度。'
    + (hiddenBoards ? '另有 ' + hiddenBoards + ' 个榜单的可见范围内未收录所选模型，未收录不等于未参评。' : '') + '</p></div>';
}

function renderTray() {
  const tray = byId('compare-tray');
  const picks = [['A', state.pickA], ['B', state.pickB]].filter(([, modelId]) => models.has(modelId));
  tray.hidden = !state.userPicked || state.compareVisible || !picks.length;
  tray.innerHTML = picks.map(([slot, modelId]) => '<span class="tray-pick tray-pick-' + slot.toLowerCase() + '"><b>' + slot + '</b>' + escapeHtml(splitName(models.get(modelId).name).base) + '</span>').join('')
    + '<span class="tray-action">查看对照</span>';
}

function describeChange(change) {
  const board = '<b>' + escapeHtml(change.boardTitle) + '</b> ';
  const name = escapeHtml(change.name || '');
  switch (change.type) {
    case 'model-added':
      return board + name + ' 进入第 ' + change.rank + ' 名，' + formatNumber(change.score) + ' 分';
    case 'model-removed':
      return board + name + ' 移出本页收录范围，上期第 ' + change.rank + ' 名';
    case 'model-moved':
      return board + name + ' 第 ' + change.rank.from + ' → ' + change.rank.to + ' 名，' + formatNumber(change.score.from) + ' → ' + formatNumber(change.score.to) + ' 分';
    case 'board-added':
      return '新增榜单 ' + board + change.rows + ' 条';
    case 'board-removed':
      return '移除榜单 ' + board;
    default:
      return change.field === 'method'
        ? board + '口径说明已更新'
        : board + FIELD_LABELS[change.field] + '：' + escapeHtml(change.from ?? '未标注') + ' → ' + escapeHtml(change.to ?? '未标注');
  }
}

function renderTimeline() {
  byId('update-timeline').innerHTML = snapshotHistory.slice().reverse().map((entry, index) => {
    const counts = entry.counts;
    const chips = entry.baseline
      ? ['基线快照', entry.boardCount + ' 个榜单', entry.rowCount + ' 条记录', entry.modelCount + ' 个模型']
      : [
        entry.newModels.length && '首次出现 ' + entry.newModels.length + ' 个模型',
        counts['model-added'] && '进入 ' + counts['model-added'],
        counts['model-removed'] && '移出 ' + counts['model-removed'],
        counts['model-moved'] && '名次或得分变化 ' + counts['model-moved'],
        counts['board-added'] && '新增榜单 ' + counts['board-added'],
        counts['board-removed'] && '移除榜单 ' + counts['board-removed'],
        counts['board-updated'] && '榜单信息更新 ' + counts['board-updated'],
        entry.carriedForwardBoards.length && '沿用上期 ' + entry.carriedForwardBoards.length + ' 个榜单'
      ].filter(Boolean);
    const changeList = entry.changes.length
      ? '<details><summary>查看 ' + entry.changes.length + ' 项变化</summary><ul class="change-list">' + entry.changes.map((change) => '<li>' + describeChange(change) + '</li>').join('') + '</ul></details>'
      : '';
    return '<li class="timeline-item' + (index === 0 ? ' is-latest' : '') + '"><time datetime="' + escapeHtml(entry.checkedAt) + '">' + formatCheckedAt(entry.checkedAt) + '</time>'
      + '<div class="timeline-body"><p class="timeline-summary">' + escapeHtml(entry.summary) + '</p>'
      + '<p class="timeline-by">' + escapeHtml(entry.checkedBy) + ' · ' + escapeHtml(entry.id) + '</p>'
      + '<div class="chips">' + (chips.length ? chips : ['与上期相比无变化']).map((chip) => '<span>' + escapeHtml(chip) + '</span>').join('') + '</div>'
      + changeList + '</div></li>';
  }).join('');
}

function renderMethods() {
  const method = snapshot.overview;
  byId('overview-method').innerHTML = '<h3>首页代表榜' + (method ? ' · 选榜规则 v' + escapeHtml(method.version) : '') + '</h3><p>'
    + escapeHtml(method ? method.policy : '每个方向展示一张官方榜单的前三名。') + '</p>';
  byId('snapshot-notes').innerHTML = snapshot.notes.length
    ? '<h3 class="subhead">本期核验备注</h3>' + snapshot.notes.map((note) => '<p>' + escapeHtml(note) + '</p>').join('')
    : '';
  byId('source-list').innerHTML = categories.map((category) => category.boards.map((board) => '<a class="source-card" href="' + escapeHtml(board.source.url) + '" target="_blank" rel="noreferrer">'
    + '<span class="source-category">' + escapeHtml(category.label) + '</span><strong>' + escapeHtml(board.label) + '</strong>'
    + '<small>' + escapeHtml(board.source.name) + '</small><small>' + escapeHtml(sourceDates(board).join(' · ')) + '</small></a>').join('')).join('');
}

function syncBoardNav() {
  const nav = byId('subnav');
  const links = nav.querySelectorAll('a');
  if (!links.length) return;
  const navBottom = byId('ranking-nav').getBoundingClientRect().bottom;
  const line = navBottom + (window.innerHeight - navBottom) * 0.3;
  let current = links[0];
  for (const link of links) {
    if (byId(link.hash.slice(1)).getBoundingClientRect().top > line) break;
    current = link;
  }
  byId('subnav-select').value = current.hash.slice(1);
  if (current.hasAttribute('aria-current')) return;
  nav.querySelector('[aria-current]')?.removeAttribute('aria-current');
  current.setAttribute('aria-current', 'location');
  const chipLeft = current.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
  if (chipLeft < nav.scrollLeft || chipLeft + current.offsetWidth > nav.scrollLeft + nav.clientWidth) {
    nav.scrollTo({ left: chipLeft - 24, behavior: 'smooth' });
  }
}

const navLinks = [...document.querySelectorAll('.global-nav a')];
function syncGlobalNav() {
  const line = document.querySelector('.topbar').offsetHeight + 24;
  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  let current = atBottom ? navLinks[navLinks.length - 1] : null;
  if (!atBottom) {
    for (const link of navLinks) {
      if (document.querySelector(link.hash).getBoundingClientRect().top <= line) current = link;
    }
  }
  for (const link of navLinks) {
    if (link === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

const scrollStrips = [byId('category-tabs'), byId('subnav'), document.querySelector('.global-nav')];
function updateScrollFades() {
  for (const strip of scrollStrips) {
    strip.classList.toggle('fade-start', strip.scrollLeft > 2);
    strip.classList.toggle('fade-end', strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2);
  }
}
for (const strip of scrollStrips) strip.addEventListener('scroll', updateScrollFades, { passive: true });
window.addEventListener('resize', updateScrollFades);

let navFrame = 0;
window.addEventListener('scroll', () => {
  if (navFrame) return;
  navFrame = requestAnimationFrame(() => {
    navFrame = 0;
    syncBoardNav();
    syncGlobalNav();
  });
}, { passive: true });

function sizeRankingNav() {
  const height = byId('ranking-nav').offsetHeight;
  document.documentElement.style.setProperty('--ranking-nav-height', height + 'px');
}
new ResizeObserver(sizeRankingNav).observe(byId('ranking-nav'));

function chooseCategory(categoryId, scrollToPanel = false) {
  if (!categories.some((category) => category.id === categoryId)) return;
  state.categoryId = categoryId;
  renderCategoryTabs();
  renderCategoryPanel();
  const panelTop = byId('category-panel').getBoundingClientRect().top;
  sizeRankingNav();
  const stickyHeight = document.querySelector('.topbar').offsetHeight + byId('ranking-nav').offsetHeight;
  if (scrollToPanel && panelTop < stickyHeight) window.scrollTo({ top: window.scrollY + panelTop - stickyHeight, behavior: 'smooth' });
}

function updateComparison() {
  syncPickedRows();
  renderPickers();
  renderButterfly();
  renderTray();
}

function togglePick(modelId) {
  if (!state.userPicked) {
    state.pickA = modelId;
    state.pickB = 'none';
  } else if (state.pickA === modelId) state.pickA = 'none';
  else if (state.pickB === modelId) state.pickB = 'none';
  else if (state.pickA === 'none') state.pickA = modelId;
  else state.pickB = modelId;
  state.userPicked = true;
  updateComparison();
}

byId('category-tabs').addEventListener('click', (event) => {
  const tab = event.target.closest('[data-category]');
  if (tab) chooseCategory(tab.dataset.category, true);
});

byId('category-tabs').addEventListener('keydown', (event) => {
  const index = categories.findIndex((category) => category.id === state.categoryId);
  const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: categories.length - 1 };
  if (!(event.key in targets)) return;
  const target = categories[(targets[event.key] + categories.length) % categories.length];
  event.preventDefault();
  chooseCategory(target.id, true);
  byId('tab-' + target.id).focus();
});

function jumpToBoard(hash) {
  if (location.hash !== hash) history.pushState(null, '', hash);
  byId(hash.slice(1)).scrollIntoView({ behavior: 'instant', block: 'start' });
  syncBoardNav();
}

byId('subnav-select').addEventListener('change', (event) => jumpToBoard('#' + event.target.value));
byId('subnav').addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  jumpToBoard(link.hash);
});

byId('category-panel').addEventListener('click', (event) => {
  const button = event.target.closest('[data-compare]');
  if (button) togglePick(button.dataset.compare);
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-board-link]');
  if (link) {
    const category = boardsById.get(link.dataset.boardLink).category;
    if (category !== state.categoryId) chooseCategory(category);
  }
});

byId('pick-a').addEventListener('change', (event) => {
  state.pickA = event.target.value;
  state.userPicked = true;
  updateComparison();
});

byId('pick-b').addEventListener('change', (event) => {
  state.pickB = event.target.value;
  state.userPicked = true;
  updateComparison();
});

byId('swap-picks').addEventListener('click', () => {
  [state.pickA, state.pickB] = [state.pickB, state.pickA];
  state.userPicked = true;
  updateComparison();
});

byId('clear-picks').addEventListener('click', () => {
  state.pickA = 'none';
  state.pickB = 'none';
  updateComparison();
});

const themeToggle = byId('theme-toggle');
themeToggle.setAttribute('aria-checked', String(document.documentElement.dataset.theme === 'dark'));
themeToggle.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-checked', String(dark));
});

function openLinkedBoard() {
  const board = boardsById.get(location.hash.replace(/^#board-/, ''));
  if (!board || !location.hash.startsWith('#board-')) return;
  if (state.categoryId !== board.category) chooseCategory(board.category);
  byId('board-' + board.id).scrollIntoView({ behavior: 'instant', block: 'start' });
}

window.addEventListener('hashchange', () => {
  if (location.hash.startsWith('#board-') && !byId(location.hash.slice(1))) openLinkedBoard();
});

new IntersectionObserver(([entry]) => {
  state.compareVisible = entry.isIntersecting;
  renderTray();
}, { threshold: 0.12 }).observe(byId('compare'));

byId('spot-category').innerHTML = categories.map((c) => '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.label) + '</option>').join('');
byId('spot-category').addEventListener('change', renderSpotlight);
renderCategoryTabs();
renderHero();
renderCategoryPanel();
sizeRankingNav();
openLinkedBoard();
renderButterfly();
renderPickers();
renderTimeline();
renderMethods();
renderTray();
syncGlobalNav();
updateScrollFades();
