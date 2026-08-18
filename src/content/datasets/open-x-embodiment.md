---
title: "Open X-Embodiment"
slug: "open-x-embodiment"
updated: "2026-08-18"
organization: "Open X-Embodiment Collaboration"
license: "Per-source dataset terms"
protocol: "trajectory-count-v1"
summary: "汇聚多机构、多机器人形态数据的跨 embodiment 数据集合。"
modalities: ["RGB", "proprioception", "actions", "language"]
facts:
  trajectories: { value: 1000000, unit: "trajectories", status: "self-reported", source: "https://robotics-transformer-x.github.io/" }
  embodiments: { value: 22, unit: "embodiments", status: "self-reported", source: "https://arxiv.org/abs/2310.08864" }
relations:
  - { target: "model:openvla", type: "trains" }
  - { target: "model:rt2", type: "ecosystem-context" }
---

## 使用提示

各子数据集的许可、动作空间和采样频率不同，不能把聚合轨迹数直接当作同质数据规模。
