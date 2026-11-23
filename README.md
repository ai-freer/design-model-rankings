# 设计与创作模型榜

离线静态网页。双击 `index.html` 即可在浏览器打开，不需要 npm、服务器或网络。只有点击官方来源链接时才会访问外网。

每次打开或刷新页面时，外观取当前系统的深浅色。顶栏右侧的日/月开关可随时切换，本次选择持续到下次刷新。

## 目录

```text
index.html              页面结构
styles.css              页面样式，含深浅色和手机端
app.js                  渲染与交互
assets/                 本地品牌 PNG
data/snapshots/*.json   每次核验的完整快照，唯一数据源
data/providers.json     提供商品牌图标与颜色
data/history.json       由脚本生成的历史索引与相邻快照变化
data/site-data.js       由脚本生成，供页面直接读取
scripts/rankings.js     校验、生成和查询脚本，只依赖 Node.js
AGENTS.md               定期更新数据的 Agent 操作说明
```

## 数据怎么更新

每次核验新增一份快照，不改旧快照。快照文件名是核验时间的 UTC 时间戳，例如 `2026-12-07T01-00Z.json`。

```sh
node scripts/rankings.js new 2026-12-07T10:00:00+09:00   # 复制上一份快照为草稿
# 按官方原榜修改草稿，并填写 checkedBy 与 summary
node scripts/rankings.js build                            # 校验并生成 history.json 与 site-data.js
node scripts/rankings.js check                            # 确认生成文件与快照一致
```

`build` 会比较相邻快照，记录新增榜单、模型进入或移出收录范围、名次和得分变化，以及官方日期、覆盖范围、口径说明的变化。页面的“更新记录”和排名行上的升降标记都来自这些结果。

查询某个模型的历史：

```sh
node scripts/rankings.js model gpt-6.2-astra
```

## 快照字段

- 快照：`schemaVersion`、`checkedAt`（带时区）、`checkedBy`、`summary`、`notes`、`categories`、`boards`。
- 一级榜单 `categories`：`id`、`label`、`description`。页面顶部的榜单切换按这里的顺序显示。每类的 `representativeBoard` 与 `selectionReason` 指定首页代表榜及选择理由。
- 榜单 `boards`：`id`、`category`、`title`、`label`、`source`、`coverage`、`method`、`rows`。可选 `officialDate` 记录官方标注日期，官方未标日期时省略；可选 `sourceVersion` 记录官方版本号。本次核验时间统一使用快照的 `checkedAt`。前端榜用 `module`、`role`、可选 `parentBoard` 记录模块与从属关系。可选 `notes` 和 `carriedForward`。
- 排名行 `rows`：`rank`、`name`、`provider`、`modelId`、`score`。可选 `ci`、`rankRange`、`extra`。官方并列名次原样保留。

`modelId` 是跨榜单和跨快照识别同一模型的键。同一模型的不同努力档位，如果官方分行展示，就使用不同的 `modelId`。

## 来源说明

首个快照 `2026-11-23T16-10Z` 是在原离线版基础上核验和扩充的基线。各榜记录官方来源、数据日期、收录范围和评测方法。

品牌素材来自 https://github.com/lobehub/lobe-icons/tree/master/packages/static-svg/icons ，已转为本地 PNG。品牌权利归各自权利人。本页是独立整理，不是任何厂商或评测平台的官方页面。

首页每次呈现一个方向的官方前三。本站解读只使用同榜前两项公布分差与区间重叠情况。快照的 `overview` 保存规则版本、口径和修订原因。更新规则见 AGENTS.md。

第三方资源许可见 [Bricolage Grotesque（SIL OFL 1.1）](LICENSES/Bricolage-Grotesque-OFL.txt) 和 [Lobe Icons（MIT）](LICENSES/Lobe-Icons-MIT.txt)。
