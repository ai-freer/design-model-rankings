const DATA = window.RANKINGS_DATA;
const snapshot = DATA.current;
const providers = DATA.providers;
const snapshotHistory = DATA.history;
const latestEntry = snapshotHistory[snapshotHistory.length - 1];
const byId = (id) => document.getElementById(id);

const FIELD_LABELS = {
  title: 'fieldTitle',
  label: 'fieldLabel',
  category: 'fieldCategory',
  officialDate: 'fieldOfficialDate',
  sourceVersion: 'fieldSourceVersion',
  coverage: 'fieldCoverage',
  method: 'fieldMethod'
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

function dataHtml(value) {
  return escapeHtml(translateData(value));
}

function officialEnglishBoard(boardId) {
  return language === 'en' ? window.RANKINGS_OFFICIAL_EN?.[boardId] : undefined;
}

function boardTitle(board) {
  return officialEnglishBoard(board.id)?.title ?? board.title;
}

function sentenceList(sentences) {
  return sentences.filter(Boolean).join(language === 'en' ? ' ' : '');
}

function formatNumber(value) {
  return value.toLocaleString('en-US');
}

function formatCheckedAt(iso, includeTime = true) {
  const parts = new Intl.DateTimeFormat(language, {
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
  return includeTime ? date + ' ' + part('hour') + ':' + part('minute') + ' ' + t('timeZone') : date;
}

function brandMark(provider, size) {
  const brand = providers[provider];
  if (brand) {
    return '<span class="brandmark brandmark-' + size + '"><img src="' + escapeHtml(brand.asset) + '" alt="' + dataHtml(brand.alt) + '"></span>';
  }
  const label = translateData(provider);
  const initials = label.split(/\s+/).map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  return '<span class="brandmark brandmark-' + size + ' brandmark-text" role="img" aria-label="' + escapeHtml(label) + '" title="' + escapeHtml(label) + '">' + escapeHtml(initials) + '</span>';
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
    board.officialDate && t('officialDate', { date: board.officialDate }),
    board.sourceVersion && t('version', { version: board.sourceVersion }),
    !board.officialDate && t('checkedDate', { date: formatCheckedAt(snapshot.checkedAt, false) })
  ].filter(Boolean);
}

function renderHero() {
  const stats = [
    [t('officialBoards'), formatNumber(snapshot.boards.length)],
    [t('models'), formatNumber(models.size)],
    [t('creativeAreas'), formatNumber(categories.length)],
    [t('latestCheck'), formatCheckedAt(snapshot.checkedAt, false).slice(5)]
  ];
  byId('hero-stats').innerHTML = stats.map(([label, value]) => '<div><dt>' + label + '</dt><dd>' + value + '</dd></div>').join('');
  renderSpotlight();
  byId('snapshot-pill').innerHTML = '<span aria-hidden="true"></span>' + t('verified', { date: formatCheckedAt(snapshot.checkedAt, false) });
  byId('footer-snapshot').textContent = t('currentSnapshot', { id: snapshot.id, summary: translateData(snapshot.summary) });
}

function renderSpotlight() {
  const category = categories.find((item) => item.id === byId('spot-category').value) || categories[0];
  const board = boardsById.get(category.representativeBoard) || category.boards[0];
  const [first, second] = board.rows;
  const leaders = board.rows.filter((row) => row.rank <= 3);
  const reading = [];
  if (second) {
    const gap = first.score - second.score;
    reading.push(gap === 0 ? t('sameTopScore') : t('topScoreGap', { gap: formatNumber(Math.abs(gap)) }));
    const a = parseCi(first.ci);
    const b = parseCi(second.ci);
    if (a && b) reading.push(t(Math.max(a.low, b.low) <= Math.min(a.high, b.high) ? 'intervalsOverlap' : 'intervalsDistinct'));
  }
  byId('spot-content').innerHTML = '<small class="spot-source">' + dataHtml(board.source.name) + '</small>'
    + '<h3>' + escapeHtml(boardTitle(board)) + '</h3><p class="spot-reason">' + (category.selectionReason ? dataHtml(category.selectionReason) : escapeHtml(boardTitle(board))) + '</p>'
    + '<ol class="spot-rows">' + leaders.slice(0, 3).map((row) =>
      '<li><span class="spot-rank">' + String(row.rank).padStart(2, '0') + '</span>' + brandMark(row.provider, 'sm')
      + '<strong>' + dataHtml(row.name) + '</strong><b>' + formatNumber(row.score) + '</b></li>').join('') + '</ol>'
    + '<p class="spot-reading">' + sentenceList([board.carriedForward && t('carriedReading'), ...reading, leaders.length > 3 && t('ties')]) + '</p>'
    + '<a class="button button-primary spot-link" href="#board-' + board.id + '" data-board-link="' + board.id + '">' + t('fullBoard') + '</a>';
}

function renderCategoryTabs() {
  byId('category-tabs').innerHTML = categories.map((category) => {
    const active = category.id === state.categoryId;
    return '<button type="button" role="tab" id="tab-' + category.id + '" data-category="' + category.id + '" aria-controls="category-panel" aria-selected="' + active + '" tabindex="' + (active ? 0 : -1) + '">'
      + '<span>' + dataHtml(category.label) + '</span><small>' + category.boards.length + '</small></button>';
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
    + (label ? '<strong>' + dataHtml(label) + '</strong>' : '')
    + '<nav class="board-index" aria-label="' + escapeHtml(t('boardNavigation', { label: translateData(label || category.label) })) + '">'
    + boards.map((board) => '<a href="#board-' + board.id + '">' + escapeHtml(boardTitle(board)) + '</a>').join('') + '</nav></div>').join('');
  byId('subnav').innerHTML = category.boards.length > 1 ? index : '';
  byId('subnav').scrollLeft = 0;
  byId('subnav-select').innerHTML = [...groups].map(([label, boards]) => {
    const options = boards.map((board) => '<option value="board-' + board.id + '">' + escapeHtml(boardTitle(board)) + '</option>').join('');
    return label ? '<optgroup label="' + dataHtml(label) + '">' + options + '</optgroup>' : options;
  }).join('');
  panel.setAttribute('aria-labelledby', 'tab-' + category.id);
  const legend = '<div class="panel-note"><p>' + dataHtml(category.description) + '</p>'
    + '<ul class="legend" aria-label="' + t('legend') + '"><li><i class="legend-dot"></i>' + t('officialScore') + '</li>'
    + '<li><i class="legend-ci"></i>' + t('confidenceInterval') + '</li>'
    + '<li><i class="legend-leader"></i>' + t('leader') + '</li><li>' + t('truncatedAxis') + '</li></ul></div>';
  panel.innerHTML = legend + [...groups].map(([label, boards]) => (label ? '<h3 class="module-heading">' + dataHtml(label) + '</h3>' : '')
    + '<div class="board-stack">' + boards.map((board) => renderBoard(board, label ? 4 : 3)).join('') + '</div>').join('');
  syncBoardNav();
  updateScrollFades();
}

function renderBoard(board, headingLevel) {
  const official = officialEnglishBoard(board.id);
  const metric = official?.metric ?? t('score');
  const axis = scoreDomain(board);
  const leader = board.rows[0].score;
  const hasCi = board.rows.some((row) => row.ci);
  const ticks = axis.ticks.map((tick) => '<span style="--x:' + position(tick, axis) + '%">' + formatNumber(tick) + '</span>').join('');
  const rows = board.rows.map((row, index) => {
    const previous = board.rows[index - 1];
    const missing = previous && row.rank - previous.rank > 1
      ? '<li class="rank-gap">' + t('rankGap', { ranks: (previous.rank + 1) + (row.rank - previous.rank > 2 ? '–' + (row.rank - 1) : '') }) + '</li>'
      : '';
    return missing + renderRow(board, row, axis, leader, metric);
  }).join('');
  const carried = board.carriedForward
    ? '<p class="board-warning">' + escapeHtml(t('carriedBoard', { id: board.carriedForward.from, reason: translateData(board.carriedForward.reason) })) + '</p>'
    : '';
  const notes = (board.notes || []).map((note) => '<p>' + dataHtml(note) + '</p>').join('');
  const parent = boardsById.get(board.parentBoard);
  const scope = [parent && boardTitle(parent), translateData(board.role)].filter(Boolean).join(' · ');
  const meta = [!official && board.label, ...sourceDates(board), board.coverage, !hasCi && t('noInterval')].filter(Boolean);
  const heading = 'h' + headingLevel;
  return '<article class="board" id="board-' + board.id + '" aria-labelledby="board-title-' + board.id + '" style="--ticks:' + gridLines(axis) + '">'
    + '<header class="board-head"><div class="board-title">'
    + '<p class="board-source">' + escapeHtml([translateData(board.source.name), scope].filter(Boolean).join(' / ')) + '</p>'
    + '<' + heading + ' id="board-title-' + board.id + '">' + escapeHtml(boardTitle(board)) + '</' + heading + '>'
    + '<p class="board-meta">' + meta.map((item) => '<span>' + dataHtml(item) + '</span>').join('') + '</p></div>'
    + '<a class="source-link" href="' + escapeHtml(board.source.url) + '" target="_blank" rel="noreferrer">' + t('officialBoardLink') + '</a></header>'
    + carried
    + '<div class="row-grid board-axis" aria-hidden="true"><span>' + t('rank') + '</span><span></span><span>' + t('model') + '</span><div class="axis-ticks"><div>' + ticks + '</div></div><span class="axis-score">' + escapeHtml(metric) + '</span><span></span></div>'
    + '<ol class="rows" aria-label="' + escapeHtml(t('boardRankings', { title: boardTitle(board) })) + '">' + rows + '</ol>'
    + (notes ? '<div class="board-notes">' + notes + '</div>' : '')
    + '<details class="board-method"><summary>' + t('fieldMethod') + '</summary><p>' + escapeHtml(official?.method ?? board.method) + '</p>'
    + (board.source.detail ? '<p>' + escapeHtml(t('additionalSource', { detail: translateData(board.source.detail) })) + '</p>' : '') + '</details>'
    + '</article>';
}

function movementBadge(board, row) {
  if (latestEntry.baseline) return '';
  if (newModelIds.has(row.modelId)) return '<span class="badge badge-new">' + t('newModel') + '</span>';
  const change = changeByRow.get(board.id + '|' + row.modelId);
  if (!change) return '';
  if (change.type === 'model-added') return '<span class="badge badge-new">' + t('newEntry') + '</span>';
  const rankDelta = change.rank.from - change.rank.to;
  const title = t('previousResult', { rank: change.rank.from, score: formatNumber(change.score.from) });
  if (rankDelta > 0) return '<span class="badge badge-up" title="' + title + '">↑' + rankDelta + '</span>';
  if (rankDelta < 0) return '<span class="badge badge-down" title="' + title + '">↓' + Math.abs(rankDelta) + '</span>';
  const scoreDelta = change.score.to - change.score.from;
  return '<span class="badge" title="' + title + '">' + t('points', { score: (scoreDelta > 0 ? '+' : '−') + formatNumber(Math.abs(scoreDelta)) }) + '</span>';
}

function renderRow(board, row, axis, leader, metric) {
  const name = splitName(row.name);
  const slot = rowSlot(row.modelId);
  const gap = leader - row.score;
  const details = [row.ci && '95% CI ' + row.ci, row.rankRange && t('rankRange', { range: translateData(row.rankRange) }), translateData(row.extra)].filter(Boolean);
  const colors = providers[row.provider] || { light: '#7b808a', dark: '#a6abb5' };
  const classes = ['row', 'row-grid'];
  if (row.rank <= 3) classes.push('row-top');
  if (slot) classes.push('row-picked-' + slot.toLowerCase());
  if (row.rank === 1) classes.push('row-first');

  return '<li class="' + classes.join(' ') + '" style="--provider-light:' + colors.light + ';--provider-dark:' + colors.dark + '">'
    + '<span class="row-rank">' + String(row.rank).padStart(2, '0') + '</span>'
    + brandMark(row.provider, 'sm')
    + '<div class="row-model"><div class="row-name"><span class="model-base">' + dataHtml(name.base) + '</span>'
    + (name.effort ? '<span class="effort">' + dataHtml(name.effort) + '</span>' : '') + movementBadge(board, row) + '</div>'
    + (details.length ? '<details class="row-data"><summary><span>' + dataHtml(row.provider) + '</span>'
      + '<span class="info-icon" aria-hidden="true">i</span><span class="visually-hidden">' + t('viewRowData') + '</span></summary><p>'
      + escapeHtml(details.join(' · ')) + '</p></details>' : '<div class="row-meta">' + dataHtml(row.provider) + '</div>')
    + '</div>'
    + renderTrack(row, axis, leader, metric)
    + '<div class="row-score"><strong>' + formatNumber(row.score) + '</strong><span>' + (gap === 0 ? t('leader') : '−' + formatNumber(gap)) + '</span></div>'
    + '<button class="pick-button" type="button" data-compare="' + escapeHtml(row.modelId) + '" aria-pressed="' + Boolean(slot) + '" aria-label="' + escapeHtml(t('compareModel', { name: translateData(row.name) })) + '">' + (slot || t('compare')) + '</button>'
    + '</li>';
}

function renderTrack(row, axis, leader, metric) {
  const ci = row.ci ? parseCi(row.ci) : undefined;
  const label = t('trackLabel', { metric, score: row.score, min: axis.min, max: axis.max }) + (row.ci ? t('trackInterval', { interval: row.ci }) : '');
  const band = ci ? '<span class="track-ci" style="--from:' + position(ci.low, axis) + '%;--to:' + position(ci.high, axis) + '%"></span>' : '';
  return '<div class="track" role="img" aria-label="' + escapeHtml(label) + '"><div class="track-area" style="--x:' + position(row.score, axis) + '%;--leader:' + position(leader, axis) + '%">'
    + '<span class="track-fill"></span>' + band + '<span class="track-dot"></span></div></div>';
}

function syncPickedRows() {
  for (const button of document.querySelectorAll('[data-compare]')) {
    const slot = rowSlot(button.dataset.compare);
    const row = button.closest('.row');
    button.textContent = slot || t('compare');
    button.setAttribute('aria-pressed', String(Boolean(slot)));
    row.classList.toggle('row-picked-a', slot === 'A');
    row.classList.toggle('row-picked-b', slot === 'B');
  }
}

function modelOptions(placeholder, excludedId) {
  const groups = new Map();
  const locale = language === 'en' ? 'en' : undefined;
  const sorted = [...models.values()].sort((first, second) => translateData(first.provider).localeCompare(translateData(second.provider), locale)
    || translateData(first.name).localeCompare(translateData(second.name), locale));
  for (const model of sorted) {
    if (!groups.has(model.provider)) groups.set(model.provider, []);
    groups.get(model.provider).push(model);
  }
  return '<option value="none">' + placeholder + '</option>' + [...groups].map(([provider, list]) => '<optgroup label="' + dataHtml(provider) + '">'
    + list.map((model) => '<option value="' + escapeHtml(model.modelId) + '"' + (model.modelId === excludedId ? ' disabled' : '') + '>' + dataHtml(model.name) + '</option>').join('')
    + '</optgroup>').join('');
}

function renderPickers() {
  byId('pick-a').innerHTML = modelOptions(t('chooseModel', { slot: 'A' }), state.pickB);
  byId('pick-b').innerHTML = modelOptions(t('chooseModel', { slot: 'B' }), state.pickA);
  byId('pick-a').value = state.pickA;
  byId('pick-b').value = state.pickB;
  byId('clear-picks').disabled = state.pickA === 'none' && state.pickB === 'none';
  byId('swap-picks').disabled = state.pickA === 'none' && state.pickB === 'none';
}

function butterflyModel(modelId, slot) {
  const model = models.get(modelId);
  if (!model) return '<div class="bf-model bf-model-' + slot.toLowerCase() + ' bf-model-empty"><span class="slot-tag">' + slot + '</span><strong>' + t('chooseModel', { slot }) + '</strong><span>' + t('addModelHelp') + '</span></div>';
  return '<div class="bf-model bf-model-' + slot.toLowerCase() + '"><span class="slot-tag">' + slot + '</span>' + brandMark(model.provider, 'md')
    + '<div><strong>' + dataHtml(splitName(model.name).base) + '</strong><span>' + dataHtml(model.provider) + '</span><span class="bf-count">' + t(model.boards === 1 ? 'modelOneBoard' : 'modelBoardCount', { count: model.boards }) + '</span></div></div>';
}

function butterflySide(item, row, side, lead) {
  if (!row) return '<div class="bf-side bf-side-' + side + ' bf-missing"><span>' + t('modelMissing') + '</span></div>';
  const leader = item.board.rows[0].score;
  const ratio = Math.max(0.06, (row.score - item.axis.min) / (leader - item.axis.min));
  const effort = splitName(row.name).effort;
  return '<div class="bf-side bf-side-' + side + '" title="' + dataHtml(row.name) + '">'
    + '<div class="bf-value"><strong>#' + row.rank + (lead ? '<b class="bf-lead">+' + formatNumber(lead) + '</b>' : '') + '</strong>'
    + '<span>' + formatNumber(row.score) + (effort ? ' · ' + dataHtml(effort) : '') + '</span></div>'
    + '<span class="bf-bar" style="--r:' + ratio.toFixed(3) + '"></span></div>';
}

function butterflyCenter(item) {
  let note = '';
  if (!item.a || !item.b) note = '<span class="verdict">' + t('oneSide') + '</span>';
  else if (item.a.score === item.b.score) note = '<span class="verdict">' + t('tiedScore') + '</span>';
  return '<div class="bf-center"><a href="#board-' + item.board.id + '" data-board-link="' + item.board.id + '" title="' + dataHtml(item.board.source.name) + '">'
    + escapeHtml(boardTitle(item.board)) + '</a>' + note + '</div>';
}

function butterflyRow(item) {
  const difference = item.a && item.b ? item.a.score - item.b.score : 0;
  return '<div class="bf-row">' + butterflySide(item, item.a, 'a', Math.max(difference, 0)) + butterflyCenter(item)
    + butterflySide(item, item.b, 'b', Math.max(-difference, 0)) + '</div>';
}

function renderButterfly() {
  const container = byId('butterfly');
  if (state.pickA === 'none' && state.pickB === 'none') {
    container.innerHTML = '<div class="empty-state"><strong>' + t('compareEmpty') + '</strong><p>' + t('compareEmptyHelp') + '</p></div>';
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
    return '<div class="bf-group"><p class="bf-group-label">' + dataHtml(category.label) + '</p>'
      + groupItems.map(butterflyRow).join('')
      + '</div>';
  }).join('');
  const hiddenBoards = snapshot.boards.length - items.length;

  container.innerHTML = '<div class="butterfly">'
    + '<div class="bf-head">' + butterflyModel(state.pickA, 'A')
    + '<div class="bf-score"><strong><span class="score-a">' + aHigher + '</span><i>:</i><span class="score-b">' + bHigher + '</span></strong><span>' + (shared.length ? t(shared.length === 1 ? 'sharedWin' : 'sharedWins', { count: shared.length }) : t('noSharedBoards')) + '</span></div>'
    + butterflyModel(state.pickB, 'B') + '</div>'
    + (groups || '<div class="empty-state"><p>' + t('neitherIncluded') + '</p></div>')
    + '<p class="bf-foot">' + sentenceList([t('butterflyFoot'), hiddenBoards && t(hiddenBoards === 1 ? 'unlistedBoard' : 'unlistedBoards', { count: hiddenBoards })]) + '</p></div>';
}

function renderTray() {
  const tray = byId('compare-tray');
  const picks = [['A', state.pickA], ['B', state.pickB]].filter(([, modelId]) => models.has(modelId));
  tray.hidden = !state.userPicked || state.compareVisible || !picks.length;
  tray.innerHTML = picks.map(([slot, modelId]) => '<span class="tray-pick tray-pick-' + slot.toLowerCase() + '"><b>' + slot + '</b>' + dataHtml(splitName(models.get(modelId).name).base) + '</span>').join('')
    + '<span class="tray-action">' + t('viewComparison') + '</span>';
}

function describeChange(change) {
  const board = '<b>' + escapeHtml(officialEnglishBoard(change.boardId)?.title ?? change.boardTitle) + '</b>';
  const name = dataHtml(change.name || '');
  switch (change.type) {
    case 'model-added':
      return board + ' ' + t('changeEnter', { name, rank: change.rank, score: formatNumber(change.score) });
    case 'model-removed':
      return board + ' ' + t('changeLeave', { name, rank: change.rank });
    case 'model-moved':
      return board + ' ' + t('changeMove', {
        name, beforeRank: change.rank.from, afterRank: change.rank.to,
        beforeScore: formatNumber(change.score.from), afterScore: formatNumber(change.score.to)
      });
    case 'board-added':
      return t('changeNewBoard', { board, count: change.rows });
    case 'board-removed':
      return t('changeRemovedBoard', { board });
    default:
      if (change.field === 'method') return board + ' ' + t('changeMethod');
      return board + ' ' + escapeHtml(t('changeField', {
        field: t(FIELD_LABELS[change.field]),
        before: translateData(change.from ?? t('noValue')),
        after: translateData(change.to ?? t('noValue'))
      }));
  }
}

function renderTimeline() {
  byId('update-timeline').innerHTML = snapshotHistory.slice().reverse().map((entry, index) => {
    const counts = entry.counts;
    const chips = entry.baseline
      ? [t('baseline'), t('countBoards', { count: entry.boardCount }), t('countRows', { count: entry.rowCount }), t('countModels', { count: entry.modelCount })]
      : [
        entry.newModels.length && t('firstModels', { count: entry.newModels.length }),
        counts['model-added'] && t('addedRows', { count: counts['model-added'] }),
        counts['model-removed'] && t('removedRows', { count: counts['model-removed'] }),
        counts['model-moved'] && t('movedRows', { count: counts['model-moved'] }),
        counts['board-added'] && t('addedBoards', { count: counts['board-added'] }),
        counts['board-removed'] && t('removedBoards', { count: counts['board-removed'] }),
        counts['board-updated'] && t('updatedBoards', { count: counts['board-updated'] }),
        entry.carriedForwardBoards.length && t('carriedBoards', { count: entry.carriedForwardBoards.length })
      ].filter(Boolean);
    const changeList = entry.changes.length
      ? '<details><summary>' + t('showChanges', { count: entry.changes.length }) + '</summary><ul class="change-list">' + entry.changes.map((change) => '<li>' + describeChange(change) + '</li>').join('') + '</ul></details>'
      : '';
    return '<li class="timeline-item' + (index === 0 ? ' is-latest' : '') + '"><time datetime="' + escapeHtml(entry.checkedAt) + '">' + formatCheckedAt(entry.checkedAt) + '</time>'
      + '<div class="timeline-body"><p class="timeline-summary">' + dataHtml(entry.summary) + '</p>'
      + '<p class="timeline-by">' + dataHtml(entry.checkedBy) + ' · ' + escapeHtml(entry.id) + '</p>'
      + '<div class="chips">' + (chips.length ? chips : [t('noChanges')]).map((chip) => '<span>' + escapeHtml(chip) + '</span>').join('') + '</div>'
      + changeList + '</div></li>';
  }).join('');
}

function renderMethods() {
  const method = snapshot.overview;
  byId('overview-method').innerHTML = '<h3>' + t('overview') + (method ? t('selectionRules', { version: method.version }) : '') + '</h3><p>'
    + dataHtml(method ? method.policy : t('overviewFallback')) + '</p>';
  byId('snapshot-notes').innerHTML = snapshot.notes.length
    ? '<h3 class="subhead">' + t('verificationNotes') + '</h3>' + snapshot.notes.map((note) => '<p>' + dataHtml(note) + '</p>').join('')
    : '';
  byId('source-list').innerHTML = categories.map((category) => category.boards.map((board) => '<a class="source-card" href="' + escapeHtml(board.source.url) + '" target="_blank" rel="noreferrer">'
    + '<span class="source-category">' + dataHtml(category.label) + '</span><strong>' + escapeHtml(officialEnglishBoard(board.id)?.title ?? board.label) + '</strong>'
    + '<small>' + dataHtml(board.source.name) + '</small><small>' + escapeHtml(sourceDates(board).join(' · ')) + '</small></a>').join('')).join('');
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

const languageToggle = byId('language-toggle');
const spotCategory = byId('spot-category');

function renderPageLanguage() {
  document.documentElement.lang = language;
  document.title = t('pageTitle');
  document.querySelector('meta[name="description"]').content = t('pageDescription');
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-label]')) {
    element.setAttribute('aria-label', t(element.dataset.i18nLabel));
  }
  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    element.title = t(element.dataset.i18nTitle);
  }

  const destination = language === 'en'
    ? { language: 'zh-Hans', text: '中文', label: '切换到中文' }
    : { language: 'en', text: 'EN', label: 'Switch to English' };
  const toggleText = languageToggle.firstElementChild;
  toggleText.lang = destination.language;
  toggleText.textContent = destination.text;
  languageToggle.setAttribute('aria-label', destination.label);
  languageToggle.title = destination.label;
  languageToggle.hidden = false;

  const spotId = spotCategory.value;
  spotCategory.innerHTML = categories.map((category) =>
    '<option value="' + escapeHtml(category.id) + '">' + dataHtml(category.label) + '</option>').join('');
  if (spotId) spotCategory.value = spotId;

  const details = [...document.querySelectorAll('#category-panel details, #update-timeline details')];
  const openDetails = details.map((detail) => detail.open);
  renderCategoryTabs();
  renderHero();
  renderCategoryPanel();
  renderPickers();
  renderButterfly();
  renderTimeline();
  renderMethods();
  renderTray();
  document.querySelectorAll('#category-panel details, #update-timeline details').forEach((detail, index) => {
    if (openDetails[index]) detail.open = true;
  });
  sizeRankingNav();
  syncGlobalNav();
  updateScrollFades();
}

spotCategory.addEventListener('change', renderSpotlight);
languageToggle.addEventListener('click', () => {
  setLanguage(language === 'en' ? 'zh-Hans' : 'en');
  renderPageLanguage();
});
renderPageLanguage();
openLinkedBoard();
