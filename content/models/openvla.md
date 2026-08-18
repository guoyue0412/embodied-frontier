---
title: "OpenVLA"
slug: "openvla"
updated: "2026-08-18"
family: "VLA"
organization: "Stanford · UC Berkeley · TRI"
license: "MIT (code)"
protocol: "single-step-action-v1"
summary: "以 Llama 2 为语言骨干、融合视觉编码器并输出离散动作 token 的开放 VLA 基线。"
inputs: ["RGB image", "language instruction"]
outputs: ["discrete action token"]
facts:
  parameters: { value: 7, unit: "billion-parameters", status: "self-reported", source: "https://openvla.github.io/" }
  action_horizon: { value: 1, unit: "steps", status: "verified", source: "https://arxiv.org/abs/2406.09246" }
relations:
  - { target: "paper:openvla", type: "described-by" }
  - { target: "dataset:open-x-embodiment", type: "trained-on" }
---

## 对比边界

参数规模来自项目方披露；动作接口与连续动作生成模型不同，不应仅凭单步 horizon 判断能力高低。
