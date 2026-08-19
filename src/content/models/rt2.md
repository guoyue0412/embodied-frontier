---
title: "RT-2"
slug: "rt2"
updated: "2026-08-18"
family: "VLA"
organization: "Google DeepMind"
license: "Not openly released"
protocol: "single-step-action-v1"
summary: "将机器人动作编码为文本 token，并利用视觉语言预训练知识进行控制。"
inputs: ["RGB image", "language instruction"]
outputs: ["discrete action token"]
facts:
  parameters: { value: null, unit: "billion-parameters", status: "unverified", source: "https://robotics-transformer2.github.io/", missingReason: "公开材料未披露可核验的参数规模" }
  action_horizon: { value: 1, unit: "steps", status: "verified", source: "https://arxiv.org/abs/2307.15818" }
relations:
  - { target: "paper:rt2", type: "described-by" }
  - { target: "dataset:open-x-embodiment", type: "ecosystem-context" }
---

## 对比边界

RT-2 的模型权重未开放；本站只呈现论文和项目页面能够支持的结构事实。
