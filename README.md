# 具身前沿 · Embodied Frontier

一个独立、证据优先的具身智能研究站。站点以仓库内 Markdown 为唯一事实源，当前第一阶段提供研究主页、专题导航、论文笔记、项目档案与学习路线。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

访问 `http://localhost:3000`。生产检查：

```bash
npm test
npm run lint
```

## 内容维护

- 论文笔记：`content/papers/*.md`
- 学习路线：`content/roadmap/*.md`
- 研究项目：`content/projects/*.md`

开发和构建前会自动运行内容编译器。缺失字段、重复 slug、非法日期、非法证据状态或非 HTTP(S) 来源都会使构建失败。生成的 `generated/content.json` 不是事实源，不应手工编辑。

证据状态只有三种：

- `verified`：关键结论可由原始论文、代码或正式项目页面支持。
- `self-reported`：结论来自作者或项目方，尚未独立复核。
- `unverified`：待核验线索，不作为已证实结论传播。

## 交付边界

- Phase 1：发布型研究站，已实现。
- Phase 2：全文检索、筛选、模型/数据集对比与知识图谱，已实现。
- Phase 3：定时发现、AI 提取、证据标注与自动创建 PR；PR 必须由人工审核后才能合并发布。

架构说明与实施计划位于 `docs/superpowers/`。本项目只借鉴公开站点的信息架构思路，不复制其源码、视觉资产或内容。
