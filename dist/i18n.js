const messages = {
  pageTitle: ['设计与创作模型榜', 'Design & Creative Model Rankings'],
  pageDescription: ['设计、前端、3D、文本、图像与视频的官方模型榜单快照', 'Snapshots of official model leaderboards for design, frontend, 3D, text, images, and video'],
  skip: ['跳到榜单', 'Skip to rankings'],
  homeLabel: ['设计与创作模型榜，回到顶部', 'Design & Creative Model Rankings, back to top'],
  brand: ['创作模型榜', 'Creative Model Rankings'],
  navLabel: ['页面导航', 'Page navigation'],
  rankings: ['榜单', 'Rankings'],
  compare: ['对照', 'Compare'],
  updates: ['更新记录', 'Updates'],
  methods: ['方法', 'Methods'],
  sourcesSuffix: ['与来源', ' & Sources'],
  darkMode: ['深色模式', 'Dark mode'],
  themeHint: ['切换浅色与深色模式', 'Switch between light and dark mode'],
  eyebrow: ['公开榜单快照，定期核验更新', 'Public leaderboard snapshots, verified regularly'],
  heroTitleFirst: ['设计与创作', 'Design & Creative'],
  heroTitleSecond: ['模型榜', 'Model Rankings'],
  heroLede: ['查阅前端、视觉设计、3D、文本、图像与视频的公开模型榜单。各榜保留来源、核验日期和评测口径。', 'Browse public model leaderboards for frontend, visual design, 3D, text, images, and video. Each board includes its source, verification date, and evaluation method.'],
  showRankings: ['查看榜单', 'Browse rankings'],
  compareTwo: ['对照两个模型', 'Compare two models'],
  leaders: ['代表榜前三', 'Top 3 by category'],
  pickMethod: ['如何选榜', 'How we select leaderboards'],
  selectSpot: ['选择代表榜方向', 'Select a category for the top three'],
  rankingIntro: ['选择一级榜单。同类子榜在下方依次展开，可从任意行加入对照。', 'Choose a category to see its leaderboards. Add models to the comparison from any ranking row.'],
  categories: ['一级榜单', 'Leaderboard categories'],
  subboards: ['子榜单', 'Leaderboards'],
  switchSubboard: ['切换子榜单', 'Choose a leaderboard'],
  compareTitle: ['模型对照', 'Model comparison'],
  compareIntro: ['左右两侧是同一榜单中的官方名次与得分。条长表示该模型在本榜可见分数范围中的位置，榜首为满格。', 'Both sides show official ranks and scores from the same leaderboard. Bar length shows the model’s position in the visible score range, with a full bar for the leader.'],
  modelA: ['模型 A', 'Model A'],
  modelB: ['模型 B', 'Model B'],
  swap: ['交换模型 A 和 B', 'Swap models A and B'],
  clear: ['清空', 'Clear'],
  updatesIntro: ['每次核验保存为一份带时间戳的完整快照。相邻快照之间的新增、移出、名次和得分变化会自动计算。', 'Each verification creates a dated snapshot. The site compares consecutive snapshots to track additions, removals, and changes in rank or score.'],
  methodsTitle: ['方法与来源', 'Methods & sources'],
  methodsIntro: ['各榜评测任务、投票人群和计分方式不同。只比较同一榜内的名次和分差。', 'Tasks, voters, and scoring methods vary by leaderboard. Compare ranks and score gaps within the same board.'],
  readingTitle: ['怎么读排名行', 'How to read the rankings'],
  readingBody: ['圆点是官方得分，色条从本榜截断横轴起点延伸到得分，虚线对齐榜首。半透明宽带是官方公布的 95% 置信区间，没有公布的区间不补画。', 'The dot marks the official score. The bar runs from the start of the truncated axis to the score. The dashed line marks the leaderboard’s top score. Shaded bands show official 95% confidence intervals when available.'],
  gapsTitle: ['名次与分差', 'Ranks and score gaps'],
  gapsBody: ['分差是与本榜榜首的算术差，不代表领先概率。置信区间重叠或只差几分时，顺序未必稳固。官方未展开的中间名次保留空档，不重新压缩排序。', 'The score gap measures how many points separate an entry from the leader. Overlapping confidence intervals or small gaps suggest the order may be uncertain. Omitted ranks retain their original gaps in the table.'],
  colorsTitle: ['颜色与标识', 'Colors and logos'],
  colorsBody: ['行色与品牌标识用于辨认提供商，不表示好坏。本页为独立整理，品牌权利归各自权利人，页面运行时不连接外站。', 'Row colors and logos identify providers. This independent site runs without external connections. Brand rights belong to their respective owners.'],
  officialSources: ['官方来源', 'Official sources'],
  creditFirst: ['品牌素材来自 ', 'Brand assets come from the '],
  creditLast: [' 的 static-svg，已转为本地 PNG。没有可靠标识的提供商显示文字名称。西文标题字体为 Bricolage Grotesque（SIL Open Font License）。', ' static-svg collection and are stored as local PNGs. Providers without a verified logo are shown by name. Latin headings use Bricolage Grotesque (SIL Open Font License).'],
  backToTop: ['回到顶部', 'Back to top'],
  fieldTitle: ['名称', 'Title'],
  fieldLabel: ['官方名称', 'Official title'],
  fieldCategory: ['分类', 'Category'],
  fieldOfficialDate: ['官方日期', 'Official date'],
  fieldSourceVersion: ['官方版本', 'Official version'],
  fieldCoverage: ['覆盖范围', 'Coverage'],
  fieldMethod: ['口径说明', 'Evaluation method'],
  timeZone: ['日本时间', 'JST'],
  officialDate: ['官方 {date}', 'Official {date}'],
  version: ['版本 {version}', 'Version {version}'],
  checkedDate: ['核验 {date}', 'Checked {date}'],
  officialBoards: ['官方榜单', 'Leaderboards'],
  models: ['模型', 'Models'],
  creativeAreas: ['创作方向', 'Categories'],
  latestCheck: ['最近核验', 'Last checked'],
  verified: ['已核验 {date}', 'Verified {date}'],
  currentSnapshot: ['当前快照 {id} · {summary}', 'Current snapshot {id} · {summary}'],
  sameTopScore: ['前两项公布得分相同。', 'The top two have the same published score.'],
  topScoreGap: ['前两项公布得分相差 {gap} 分。', 'The top two published scores differ by {gap} points.'],
  intervalsOverlap: ['两者的置信区间有重叠。', 'Their confidence intervals overlap.'],
  intervalsDistinct: ['两者的置信区间未重叠。', 'Their confidence intervals do not overlap.'],
  carriedReading: ['本期沿用上期读数。', 'This edition uses the previous snapshot’s results.'],
  ties: ['另有并列，详见完整榜。', 'See the full leaderboard for additional tied entries.'],
  fullBoard: ['查看完整榜单', 'View full leaderboard'],
  boardNavigation: ['{label}榜单导航', '{label} leaderboard navigation'],
  legend: ['图例', 'Legend'],
  officialScore: ['官方得分', 'Official score'],
  confidenceInterval: ['95% 置信区间', '95% confidence interval'],
  leader: ['榜首', 'Leader'],
  truncatedAxis: ['横轴按各榜可见分数截断', 'Axis is truncated to each board’s visible score range'],
  rankGap: ['官方第 {ranks} 名未在本页展开', 'Official rank(s) {ranks} omitted here'],
  carriedBoard: ['本期未能重新核对，沿用 {id} 的数据：{reason}', 'Using data from {id} because this leaderboard could not be rechecked: {reason}'],
  noInterval: ['未公布置信区间', 'Confidence intervals unavailable'],
  officialBoardLink: ['官方原榜', 'Official leaderboard'],
  rank: ['名次', 'Rank'],
  model: ['模型', 'Model'],
  score: ['得分', 'Score'],
  boardRankings: ['{title}官方排名', '{title} official rankings'],
  additionalSource: ['数据来源补充：{detail}', 'Additional data source: {detail}'],
  newModel: ['新模型', 'New model'],
  newEntry: ['新进', 'New entry'],
  previousResult: ['上期第 {rank} 名，{score} 分', 'Previously rank {rank}, {score} points'],
  points: ['{score} 分', '{score} pts'],
  rankRange: ['名次区间 {range}', 'Rank range {range}'],
  viewRowData: ['查看评测数据', 'View evaluation data'],
  compareModel: ['对照 {name}', 'Compare {name}'],
  trackLabel: ['得分 {score}，截断横轴 {min} 至 {max}', '{metric} {score}, truncated axis {min} to {max}'],
  trackInterval: ['，95% 置信区间 {interval}', ', 95% confidence interval {interval}'],
  chooseModel: ['选择模型 {slot}', 'Choose model {slot}'],
  addModelHelp: ['从上方下拉框或任意排名行加入', 'Use the dropdown above or add a model from a ranking row'],
  modelBoardCount: ['出现在 {count} 个榜单', 'Appears on {count} leaderboards'],
  modelOneBoard: ['出现在 {count} 个榜单', 'Appears on {count} leaderboard'],
  modelMissing: ['本页未收录', 'Not shown here'],
  oneSide: ['单侧收录', 'One model shown'],
  tiedScore: ['同分', 'Tied score'],
  compareEmpty: ['选择两个模型开始对照', 'Choose two models to compare'],
  compareEmptyHelp: ['在榜单行点击“对照”，或用上方下拉框选择。', 'Select Compare in a ranking row or use the dropdowns above.'],
  sharedWins: ['同时出现的 {count} 个榜单中得分更高的次数', 'Higher scores across {count} shared leaderboards'],
  sharedWin: ['同时出现的 {count} 个榜单中得分更高的次数', 'Higher scores on {count} shared leaderboard'],
  noSharedBoards: ['两者没有同时出现的榜单', 'No shared leaderboards'],
  neitherIncluded: ['所选模型在当前快照中没有收录记录。', 'The current snapshot has no entries for the selected models.'],
  butterflyFoot: ['条长只在同一榜单内可比。数字为官方名次、得分和努力档位，+N 为同榜得分领先幅度。', 'Compare bar lengths within the same leaderboard. Each row shows the official rank, score, and reasoning effort. +N shows the lead in points.'],
  unlistedBoards: ['另有 {count} 个榜单的可见范围内未收录所选模型，未收录不等于未参评。', '{count} other leaderboards do not show the selected models in the visible results. They may still have been evaluated.'],
  unlistedBoard: ['另有 {count} 个榜单的可见范围内未收录所选模型，未收录不等于未参评。', '{count} other leaderboard does not show the selected models in the visible results. They may still have been evaluated.'],
  viewComparison: ['查看对照', 'View comparison'],
  changeEnter: ['{name} 进入第 {rank} 名，{score} 分', '{name} entered at rank {rank} with {score} points'],
  changeLeave: ['{name} 移出本页收录范围，上期第 {rank} 名', '{name} left the displayed results, previously rank {rank}'],
  changeMove: ['{name} 第 {beforeRank} → {afterRank} 名，{beforeScore} → {afterScore} 分', '{name}: rank {beforeRank} → {afterRank}, score {beforeScore} → {afterScore}'],
  changeNewBoard: ['新增榜单 {board} {count} 条', 'Added {board} ({count} entries)'],
  changeRemovedBoard: ['移除榜单 {board}', 'Removed {board}'],
  changeMethod: ['口径说明已更新', 'Evaluation method updated'],
  noValue: ['未标注', 'Unspecified'],
  changeField: ['{field}：{before} → {after}', '{field}: {before} → {after}'],
  baseline: ['基线快照', 'Baseline snapshot'],
  countBoards: ['{count} 个榜单', '{count} leaderboards'],
  countRows: ['{count} 条记录', '{count} entries'],
  countModels: ['{count} 个模型', '{count} models'],
  firstModels: ['首次出现 {count} 个模型', 'New models: {count}'],
  addedRows: ['进入 {count}', 'Entries added: {count}'],
  removedRows: ['移出 {count}', 'Entries removed: {count}'],
  movedRows: ['名次或得分变化 {count}', 'Rank or score changes: {count}'],
  addedBoards: ['新增榜单 {count}', 'Leaderboards added: {count}'],
  removedBoards: ['移除榜单 {count}', 'Leaderboards removed: {count}'],
  updatedBoards: ['榜单信息更新 {count}', 'Leaderboards updated: {count}'],
  carriedBoards: ['沿用上期 {count} 个榜单', 'Leaderboards carried forward: {count}'],
  showChanges: ['查看 {count} 项变化', 'View changes ({count})'],
  noChanges: ['与上期相比无变化', 'No changes since the previous snapshot'],
  overview: ['首页代表榜', 'Homepage leaderboards'],
  selectionRules: [' · 选榜规则 v{version}', ' · Selection rules v{version}'],
  overviewFallback: ['每个方向展示一张官方榜单的前三名。', 'Each category shows the top three from one official leaderboard.'],
  verificationNotes: ['本期核验备注', 'Verification notes']
};

let language = 'zh-Hans';
const languageKey = 'creative-model-rankings.language';

try {
  if (localStorage.getItem(languageKey) === 'en') language = 'en';
} catch {
  // The switch also works when storage is blocked, including in some local-file browsers.
}

function setLanguage(value) {
  language = value;
  try {
    localStorage.setItem(languageKey, language);
  } catch {
    // Keep the choice for the current page.
  }
}

function t(key, values = {}) {
  return messages[key][language === 'en' ? 1 : 0].replace(/\{(\w+)\}/g, (_, name) => values[name]);
}

function translateData(value) {
  if (language !== 'en' || typeof value !== 'string') return value;
  if (Object.hasOwn(window.RANKINGS_EN, value)) return window.RANKINGS_EN[value];

  return value
    .replace(/^(\d[\d,]*) 票$/, '$1 votes')
    .replace(/^(\d[\d,]*) 次比较$/, '$1 comparisons')
    .replace(/(\d[\d,]*) 次评审/g, '$1 judgments')
    .replace(/(\d[\d,]*) 场(?=（)/g, '$1 battles')
    .replace(/(\d[\d,]*) 场/g, '$1 matches')
    .replace(/胜率区间/g, 'CI for win rate')
    .replace(/胜率 /g, 'Win rate ')
    .replace(/^胜\/和\/负 /, 'W / T / L ')
    .replace(/，(?=[^\p{Script=Han}]+$)/gu, ', ')
    .replace(/（(\d+W \/ \d+L)）/g, ' ($1)')
    .replace(/ 品牌标识$/, ' logo');
}
