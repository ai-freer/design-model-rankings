# 项目维护

项目的公开站点为 <https://design-model-rankings.fancyfreer.chatgpt.site>。

## 定期更新榜单数据

本项目的数据源是 `data/snapshots/` 下的完整快照。页面读取 `data/site-data.js`，该文件和 `data/history.json` 都由 `node scripts/rankings.js build` 生成，不要手工编辑。

### 每次核验

1. 运行 `node scripts/rankings.js check`，确认当前数据可用。
2. 用实际核验时间创建草稿：`node scripts/rankings.js new 2026-12-07T10:00:00+09:00`。
3. 逐个打开最新快照中每个榜单的 `source.url`，按官方当前页面更新 `officialDate`、`sourceVersion`、`coverage`、`method` 和 `rows`。`officialDate` 只写官方标注的日期，格式为 `YYYY-MM`、`YYYY-MM-DD` 或 `YYYY-MM-DD HH:MM JST`；官方未标日期时省略。`sourceVersion` 只写官方版本号，例如 `v1.0`。本次核验时间由快照的 `checkedAt` 表示，不写进这两个字段。名次、名称、提供商、得分、置信区间、名次区间都照官方页面填写，不估算，不补造未展示的名次。
4. 同一模型和同一官方档位沿用已有 `modelId`。先用 `rg` 搜索旧快照，或运行 `node scripts/rankings.js model <modelId>`。真正的新模型才新建小写 kebab-case `modelId`。
5. 某个来源本次无法核对时，保留上期行，并在该榜加入 `"carriedForward": { "from": "<上期快照 id>", "reason": "<原因>" }`。来源恢复后删除该字段。
6. 发现值得收录的新榜单时，加入 `boards`，必要时新增 `categories`。前端榜单填写 `module` 和 `role`，官方任务子榜用 `parentBoard` 指向其上级。截图转前端属于独立评测。
7. 填写 `checkedBy`、`summary`，并按本次结果更新 `notes`。`summary` 用一句话说明本期主要变化，没有变化就写明“与上期相比无变化”。
8. 运行 `node scripts/rankings.js build`，处理所有错误，复核提示，再运行 `check`。打开 `index.html` 查看榜单、对照和更新记录。

### 约束

- 已提交的旧快照代表当时的核验结果，不改写。若旧数据被证实录错，在新快照的 `notes` 中写明更正内容。
- 品牌图标只使用本地文件。新增图标时放入 `assets/` 并登记到 `data/providers.json`，页面运行时不加载远程资源。
- 回答“最近有什么变化”或“某模型怎么变化”时，读取 `data/history.json` 或运行 `node scripts/rankings.js model <modelId>`，并说明对应快照时间。

### 首页代表榜的维护

每期检查各方向的任务、评审者、覆盖范围和数据可用性。代表榜的名次从当期 rows 读取，选择依据写在分类的 selectionReason。沿用旧数据时标注 carriedForward。若任务口径漂移或代表榜下线，复查同方向的候选榜，更新 representativeBoard 和理由，并在 overview.revisionNote 写明替换原因。调整维度、选榜规则或读数方法时递增 overview.version，将新规则写入 policy，保留旧快照。

若将来试做本站综合排名，先为单一使用任务定义候选模型与可比档位，记录任务样本、来源相关性、每个维度的权重、缺测与并列处理。用独立任务的实际交付结果验证排序，并检查权重变化会否改变前三。发布时保留输入快照、完整计算方法与版本，供复算。
