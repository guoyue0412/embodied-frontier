---
title: "DROID"
slug: "droid"
updated: "2026-08-18"
organization: "DROID Collaboration"
license: "Research dataset terms"
protocol: "trajectory-count-v1"
summary: "在多地点采集的大规模真实机器人操作数据集，强调场景与操作者多样性。"
modalities: ["stereo RGB", "wrist RGB", "proprioception", "actions", "language"]
facts:
  trajectories: { value: 76000, unit: "trajectories", status: "self-reported", source: "https://droid-dataset.github.io/" }
  environments: { value: 564, unit: "environments", status: "self-reported", source: "https://arxiv.org/abs/2403.12945" }
  embodiments: { value: null, unit: "embodiments", status: "unverified", source: "https://droid-dataset.github.io/", missingReason: "现有数据集记录未披露可核验的本体数量" }
relations:
  - { target: "dataset:open-x-embodiment", type: "complements" }
---

## 使用提示

跨场景覆盖是其核心价值；对比数据量时仍需核对轨迹定义和清洗协议。
