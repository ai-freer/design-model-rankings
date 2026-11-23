#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const dataDir = path.join(projectDir, 'data');
const snapshotDir = path.join(dataDir, 'snapshots');
const providersFile = path.join(dataDir, 'providers.json');
const historyFile = path.join(dataDir, 'history.json');
const siteDataFile = path.join(dataDir, 'site-data.js');
const trackedBoardFields = ['title', 'label', 'category', 'officialDate', 'sourceVersion', 'coverage', 'method'];
const officialDatePattern = /^\d{4}-\d{2}(-\d{2}( \d{2}:\d{2} JST)?)?$/;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(path.relative(projectDir, file) + ': ' + error.message);
  }
}

function snapshotIdFor(checkedAt) {
  return new Date(checkedAt).toISOString().slice(0, 16).replace(':', '-') + 'Z';
}

function loadSnapshots() {
  return fs.readdirSync(snapshotDir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ id: name.slice(0, -5), ...readJson(path.join(snapshotDir, name)) }));
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseCi(text) {
  const match = String(text).match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)/);
  return match ? { low: Number(match[1]), high: Number(match[2]) } : undefined;
}

function validateSnapshot(snapshot, earlierIds, providers) {
  const errors = [];
  const warnings = [];
  const where = snapshot.id;
  const fail = (message) => errors.push(where + ': ' + message);

  if (snapshot.schemaVersion !== 1) fail('schemaVersion 必须为 1');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z)$/.test(snapshot.checkedAt || '')) {
    fail('checkedAt 必须是带时区的 ISO 时间，例如 2026-12-07T10:00:00+09:00');
  } else if (snapshotIdFor(snapshot.checkedAt) !== snapshot.id) {
    fail('文件名应为 ' + snapshotIdFor(snapshot.checkedAt) + '.json');
  }
  for (const field of ['checkedBy', 'summary']) {
    if (!isText(snapshot[field])) fail(field + ' 不能为空');
  }
  if (!Array.isArray(snapshot.notes)) fail('notes 必须是数组');

  const categories = Array.isArray(snapshot.categories) ? snapshot.categories : [];
  const categoryIds = new Set();
  for (const category of categories) {
    if (!isText(category.id) || !isText(category.label) || !isText(category.description)) {
      fail('每个 category 都需要 id、label、description');
    }
    if (categoryIds.has(category.id)) fail('category 重复：' + category.id);
    categoryIds.add(category.id);
  }
  if (!categories.length) fail('至少需要一个 category');

  const boards = Array.isArray(snapshot.boards) ? snapshot.boards : [];
  const boardIds = new Set();
  const providersWithoutAsset = new Set();
  for (const board of boards) {
    const boardWhere = 'board ' + board.id + ' ';
    if (!isText(board.id) || boardIds.has(board.id)) fail(boardWhere + 'id 缺失或重复');
    boardIds.add(board.id);
    if (!categoryIds.has(board.category)) fail(boardWhere + '的 category 不存在');
    for (const field of ['title', 'label', 'coverage', 'method']) {
      if (!isText(board[field])) fail(boardWhere + field + ' 不能为空');
    }
    if (board.officialDate !== undefined && !officialDatePattern.test(board.officialDate)) {
      fail(boardWhere + 'officialDate 只能写 YYYY-MM、YYYY-MM-DD 或 YYYY-MM-DD HH:MM JST；官方未标日期时省略');
    }
    if (board.sourceVersion !== undefined && !isText(board.sourceVersion)) {
      fail(boardWhere + 'sourceVersion 省略或填写官方版本号');
    }
    if (!board.source || !isText(board.source.name) || !/^https:\/\//.test(board.source.url || '')) {
      fail(boardWhere + 'source 需要 name 和 https url');
    }
    if (board.display !== undefined && board.display !== 'compact') fail(boardWhere + 'display 只能省略或为 compact');
    if (board.notes !== undefined && (!Array.isArray(board.notes) || !board.notes.every(isText))) {
      fail(boardWhere + 'notes 必须是非空字符串数组');
    }
    if (board.carriedForward !== undefined) {
      const carried = board.carriedForward;
      if (!carried || !earlierIds.includes(carried.from) || !isText(carried.reason)) {
        fail(boardWhere + 'carriedForward 需要更早快照的 from 和 reason');
      }
    }

    const rows = Array.isArray(board.rows) ? board.rows : [];
    if (!rows.length) fail(boardWhere + '没有 rows');
    const modelIds = new Set();
    rows.forEach((row, index) => {
      const rowWhere = boardWhere + '第 ' + (index + 1) + ' 行 ';
      const previous = rows[index - 1];
      if (!Number.isInteger(row.rank) || row.rank < 1) fail(rowWhere + 'rank 必须是正整数');
      if (previous && row.rank < previous.rank) fail(rowWhere + 'rank 必须按名次排序');
      if (!isText(row.name) || !isText(row.provider)) fail(rowWhere + '需要 name 和 provider');
      if (!/^[a-z0-9][a-z0-9.-]*$/.test(row.modelId || '')) fail(rowWhere + 'modelId 只能用小写字母、数字、点和连字符');
      if (modelIds.has(row.modelId)) fail(rowWhere + 'modelId 在同一榜内重复：' + row.modelId);
      modelIds.add(row.modelId);
      if (!Number.isFinite(row.score)) fail(rowWhere + 'score 必须是数字');
      if (row.ci !== undefined && !parseCi(row.ci)) fail(rowWhere + 'ci 需要包含 低值–高值');
      for (const field of ['rankRange', 'extra']) {
        if (row[field] !== undefined && !isText(row[field])) fail(rowWhere + field + ' 不能为空字符串');
      }
      if (previous && row.score > previous.score) warnings.push(where + ': ' + rowWhere + '得分高于上一名，请确认官方排序');
      if (isText(row.provider) && !providers[row.provider]) providersWithoutAsset.add(row.provider);
    });
  }
  if (providersWithoutAsset.size) {
    warnings.push(where + ': 这些提供商没有品牌资产，页面显示文字标识：' + [...providersWithoutAsset].join('、'));
  }
  if (snapshot.overview) {
    if (!Number.isInteger(snapshot.overview.version) || snapshot.overview.version < 1 || !isText(snapshot.overview.policy) || !isText(snapshot.overview.revisionNote)) {
      fail('overview 需要正整数版本、选榜规则和修订原因');
    }
    for (const category of categories) {
      const board = boards.find((b) => b.id === category.representativeBoard);
      if (!board || board.category !== category.id || !isText(category.selectionReason)) {
        fail(category.id + ' 需要同分类代表榜及选择理由');
      }
    }
    for (const board of boards.filter((b) => b.category === 'frontend')) {
      if (!isText(board.module) || !isText(board.role)) fail(board.id + ' 需要模块及榜单角色');
      if (board.parentBoard || board.role === '任务子榜') {
        const parent = boards.find((b) => b.id === board.parentBoard);
        if (!parent || parent.id === board.id || parent.category !== board.category || parent.module !== board.module || parent.role !== '官方综合榜') {
          fail(board.id + ' 的上级榜单无效');
        }
      }
    }
  }
  for (const categoryId of categoryIds) {
    if (!boards.some((board) => board.category === categoryId)) fail('category ' + categoryId + ' 没有榜单');
  }
  return { errors, warnings };
}

function compareSnapshots(previous, current) {
  const changes = [];
  const previousBoards = new Map(previous.boards.map((board) => [board.id, board]));
  const currentBoardIds = new Set(current.boards.map((board) => board.id));

  for (const board of current.boards) {
    const oldBoard = previousBoards.get(board.id);
    if (!oldBoard) {
      changes.push({ type: 'board-added', boardId: board.id, boardTitle: board.title, rows: board.rows.length });
      continue;
    }
    for (const field of trackedBoardFields) {
      if (oldBoard[field] !== board[field]) {
        changes.push({ type: 'board-updated', boardId: board.id, boardTitle: board.title, field, from: oldBoard[field], to: board[field] });
      }
    }
    const oldRows = new Map(oldBoard.rows.map((row) => [row.modelId, row]));
    const currentModelIds = new Set(board.rows.map((row) => row.modelId));
    for (const row of board.rows) {
      const oldRow = oldRows.get(row.modelId);
      const entry = { boardId: board.id, boardTitle: board.title, modelId: row.modelId, name: row.name, provider: row.provider };
      if (!oldRow) {
        changes.push({ type: 'model-added', ...entry, rank: row.rank, score: row.score });
      } else if (oldRow.rank !== row.rank || oldRow.score !== row.score) {
        changes.push({
          type: 'model-moved',
          ...entry,
          rank: { from: oldRow.rank, to: row.rank },
          score: { from: oldRow.score, to: row.score }
        });
      }
    }
    for (const oldRow of oldBoard.rows) {
      if (!currentModelIds.has(oldRow.modelId)) {
        changes.push({
          type: 'model-removed',
          boardId: board.id,
          boardTitle: board.title,
          modelId: oldRow.modelId,
          name: oldRow.name,
          provider: oldRow.provider,
          rank: oldRow.rank,
          score: oldRow.score
        });
      }
    }
  }
  for (const oldBoard of previous.boards) {
    if (!currentBoardIds.has(oldBoard.id)) {
      changes.push({ type: 'board-removed', boardId: oldBoard.id, boardTitle: oldBoard.title, rows: oldBoard.rows.length });
    }
  }
  return changes;
}

function countChanges(changes) {
  const counts = { 'board-added': 0, 'board-removed': 0, 'board-updated': 0, 'model-added': 0, 'model-removed': 0, 'model-moved': 0 };
  for (const change of changes) counts[change.type] += 1;
  return counts;
}

function buildOutputs() {
  const providers = readJson(providersFile);
  const snapshots = loadSnapshots();
  if (!snapshots.length) throw new Error('data/snapshots 下没有快照');

  const errors = [];
  const warnings = [];
  snapshots.forEach((snapshot, index) => {
    const result = validateSnapshot(snapshot, snapshots.slice(0, index).map((item) => item.id), providers);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });
  if (errors.length) return { errors, warnings };

  const seenModelIds = new Set();
  const history = snapshots.map((snapshot, index) => {
    const rows = snapshot.boards.flatMap((board) => board.rows);
    const firstSeenModels = [];
    for (const row of rows) {
      if (!seenModelIds.has(row.modelId)) {
        seenModelIds.add(row.modelId);
        firstSeenModels.push({ modelId: row.modelId, name: row.name, provider: row.provider });
      }
    }
    const changes = index === 0 ? [] : compareSnapshots(snapshots[index - 1], snapshot);
    return {
      id: snapshot.id,
      checkedAt: snapshot.checkedAt,
      checkedBy: snapshot.checkedBy,
      summary: snapshot.summary,
      baseline: index === 0,
      previousId: index === 0 ? null : snapshots[index - 1].id,
      boardCount: snapshot.boards.length,
      rowCount: rows.length,
      modelCount: new Set(rows.map((row) => row.modelId)).size,
      carriedForwardBoards: snapshot.boards.filter((board) => board.carriedForward).map((board) => board.id),
      newModels: index === 0 ? [] : firstSeenModels,
      counts: countChanges(changes),
      changes
    };
  });

  const historyJson = JSON.stringify({ schemaVersion: 1, latestId: snapshots[snapshots.length - 1].id, snapshots: history }, null, 2) + '\n';
  const siteData = { current: snapshots[snapshots.length - 1], providers, history };
  const siteDataJs = '// 由 node scripts/rankings.js build 生成，请修改 data/snapshots 后重新生成。\n'
    + 'window.RANKINGS_DATA = ' + JSON.stringify(siteData, null, 2) + ';\n';
  return { errors, warnings, historyJson, siteDataJs, snapshots };
}

function printIssues(result) {
  for (const warning of result.warnings) console.warn('提示  ' + warning);
  for (const error of result.errors) console.error('错误  ' + error);
}

function readIfExists(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function createSnapshot(checkedAt) {
  if (!checkedAt || Number.isNaN(Date.parse(checkedAt)) || !/([+-]\d{2}:\d{2}|Z)$/.test(checkedAt)) {
    throw new Error('用法：node scripts/rankings.js new 2026-12-07T10:00:00+09:00');
  }
  const snapshots = loadSnapshots();
  const latest = snapshots[snapshots.length - 1];
  const id = snapshotIdFor(checkedAt);
  const file = path.join(snapshotDir, id + '.json');
  if (fs.existsSync(file)) throw new Error(path.relative(projectDir, file) + ' 已存在');
  if (latest && id <= latest.id) throw new Error('新快照时间必须晚于 ' + latest.id);
  const { id: latestId, ...content } = latest;
  const draft = { ...content, checkedAt, checkedBy: '', summary: '' };
  fs.writeFileSync(file, JSON.stringify(draft, null, 2) + '\n');
  console.log('已从 ' + latestId + ' 复制草稿：' + path.relative(projectDir, file));
  console.log('核对并修改后填写 checkedBy 与 summary，再运行 node scripts/rankings.js build');
}

function printModelHistory(modelId) {
  if (!modelId) throw new Error('用法：node scripts/rankings.js model gpt-6.2-astra');
  const lines = [];
  for (const snapshot of loadSnapshots()) {
    for (const board of snapshot.boards) {
      const row = board.rows.find((item) => item.modelId === modelId);
      if (row) lines.push([snapshot.id, board.id, '#' + row.rank, row.score, row.name].join('\t'));
    }
  }
  console.log(lines.length ? ['snapshot\tboard\trank\tscore\tname', ...lines].join('\n') : '没有找到 ' + modelId);
}

function main() {
  const [command, argument] = process.argv.slice(2);
  if (command === 'new') return createSnapshot(argument);
  if (command === 'model') return printModelHistory(argument);
  if (command !== 'build' && command !== 'check') {
    console.log('用法：node scripts/rankings.js <build|check|new 时间|model modelId>');
    process.exitCode = 1;
    return;
  }

  const result = buildOutputs();
  printIssues(result);
  if (result.errors.length) {
    process.exitCode = 1;
    return;
  }
  const latest = result.snapshots[result.snapshots.length - 1];
  if (command === 'build') {
    fs.writeFileSync(historyFile, result.historyJson);
    fs.writeFileSync(siteDataFile, result.siteDataJs);
    console.log('已生成 data/history.json 与 data/site-data.js，最新快照 ' + latest.id);
    return;
  }
  if (readIfExists(historyFile) !== result.historyJson || readIfExists(siteDataFile) !== result.siteDataJs) {
    console.error('生成文件已过期，请运行 node scripts/rankings.js build');
    process.exitCode = 1;
    return;
  }
  console.log('校验通过：' + result.snapshots.length + ' 个快照，最新 ' + latest.id);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
