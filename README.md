# 具身前沿 · Embodied Frontier

一个独立、证据优先的具身智能研究站。站点以仓库内 Markdown 为唯一事实源，当前第一阶段提供研究主页、专题导航、论文笔记、项目档案与学习路线。

## Clone 与本地运行

要求 Node.js `>=22.13.0`。

```bash
git clone <github-repository-url>
cd embodied-frontier
npm install
npm run dev
```

访问终端输出的本地地址（通常是 `http://localhost:4321`）。生产检查：

```bash
npm run verify
```

`npm run verify` 会运行内容校验、生产构建、测试、lint、静态站检查、bundle budget 和 browser QA。只要验证失败，就不要提交 PR。

## 内容维护

- 论文笔记：`src/content/papers/*.md`
- 模型条目：`src/content/models/*.md`
- 数据集条目：`src/content/datasets/*.md`
- 研究项目：`src/content/projects/*.md`
- 学习路线：`src/content/roadmap/*.md`

开发和构建前会自动运行内容编译器。缺失字段、重复 slug、非法日期、非法证据状态或非 HTTP(S) 来源都会使构建失败。生成的 `generated/content.json` 不是事实源，不应手工编辑。

证据状态只有三种：

- `verified`：关键结论可由原始论文、代码或正式项目页面支持。
- `self-reported`：结论来自作者或项目方，尚未独立复核。
- `unverified`：待核验线索，不作为已证实结论传播。

## GitHub 分支与 Pull Request

`main` 是唯一生产分支。请从 `main` 创建功能或内容分支，通过 Pull Request 提交变更；不要直接向 `main` 推送。每个 PR 都必须使用 `.github/pull_request_template.md`，填写内容来源、证据状态、第三方许可证、桌面/移动截图、reduced-motion 结果、`npm run verify` 结果和部署影响。

合并前需要 `verify` required status check 通过，并由人工检查事实来源、证据边界、许可证、视觉回退和部署影响。自动化检查不能替代人工审核；自动生成的研究内容也必须先经过人工审核才能合并。

## GitHub Pages 设置与发布

仓库管理员首次启用 Pages 时，在 GitHub 的 **Settings → Pages** 中将 **Source** 设为 **GitHub Actions**，并确认环境名为 `github-pages`。`.github/workflows/deploy-pages.yml` 只响应 `main` 的 push（或手动 workflow dispatch），先运行完整的 `npm run verify`，再上传 `dist/` 并使用官方 Pages artifact/deploy actions 发布。

发布前请确认仓库的 branch protection 要求 Pull Request、`verify` 检查通过、对话已解决，并禁止 force push 或删除 `main`。个人仓库无法配置第二位审核者时，仍保留手动合并门禁并在 PR 中记录治理限制。

本地构建不等于部署证据。生产发布事实必须以 GitHub Actions 的成功记录、Pages environment 的部署 URL 和线上 smoke test 为准；本地 `dist/` 或下载的 artifact 只能证明本地/CI 构建产物已生成。

## 交付边界

- Phase 1：发布型研究站，已实现。
- Phase 2：全文检索、筛选、模型/数据集对比与知识图谱，已实现。
- Phase 3：定时发现、AI 提取、证据标注与自动创建 PR；PR 必须由人工审核后才能合并发布。

架构说明与实施计划位于 `docs/superpowers/`。本项目只借鉴公开站点的信息架构思路，不复制其源码、视觉资产或内容。
