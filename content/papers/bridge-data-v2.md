---
title: "BridgeData V2"
slug: "bridge-data-v2"
date: "2023-08-24"
updated: "2026-08-14"
track: "Data & Eval"
venue: "CoRL 2023"
status: "verified"
tags: [dataset, imitation-learning, open-data]
summary: "面向机器人学习的开放数据集，强调多任务、多环境和可复用的数据接口。"
sources:
  - label: "Paper"
    url: "https://arxiv.org/abs/2308.12952"
  - label: "Dataset"
    url: "https://rail-berkeley.github.io/bridgedata/"
---

## 数据价值

BridgeData V2 为模仿学习和通用策略研究提供了跨场景操作数据。它适合作为“数据规模之外还需要什么”的入口：任务覆盖、视角、机器人本体和动作表示都会改变可迁移性。

## 使用前检查

- 确认下载版本和训练代码期望的数据 schema。
- 记录训练/验证划分，避免同场景泄漏。
- 抽样检查视频、动作和语言标注是否同步。
