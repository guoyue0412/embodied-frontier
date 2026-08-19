---
title: "π0"
slug: "pi0"
updated: "2026-08-18"
family: "VLA"
organization: "Physical Intelligence"
license: "Research release"
protocol: "flow-action-chunk-v1"
summary: "使用 flow matching 生成连续动作块，面向跨机器人形态的通用控制。"
inputs: ["multi-view RGB", "language instruction", "proprioception"]
outputs: ["continuous action chunk"]
facts:
  parameters: { value: null, unit: "billion-parameters", status: "unverified", source: "https://www.physicalintelligence.company/blog/pi0", missingReason: "公开材料未披露可核验的参数规模" }
  action_horizon: { value: null, unit: "steps", status: "unverified", source: "https://arxiv.org/abs/2410.24164", missingReason: "公开材料未披露可核验的动作跨度" }
relations:
  - { target: "paper:pi0", type: "described-by" }
  - { target: "dataset:open-x-embodiment", type: "related-data" }
---

## 对比边界

公开材料强调跨 embodiment 与动作块生成；未在本站核验的规模字段保留为空。
