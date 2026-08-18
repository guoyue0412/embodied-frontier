---
title: "BridgeData V2"
slug: "bridge-data-v2"
updated: "2026-08-18"
organization: "UC Berkeley"
license: "Research dataset terms"
protocol: "trajectory-count-v1"
summary: "覆盖多任务、多环境桌面操作的开放机器人学习数据集。"
modalities: ["RGB", "proprioception", "actions", "language annotations"]
facts:
  trajectories: { value: 60096, unit: "trajectories", status: "verified", source: "https://rail-berkeley.github.io/bridgedata/" }
  embodiments: { value: 1, unit: "embodiments", status: "verified", source: "https://arxiv.org/abs/2308.12952" }
relations:
  - { target: "paper:bridge-data-v2", type: "described-by" }
  - { target: "dataset:open-x-embodiment", type: "included-in" }
---

## 使用提示

轨迹数不等于有效训练样本数；复现实验还需记录切分、语言标注版本和观测窗口。
