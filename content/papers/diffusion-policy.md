---
title: "Diffusion Policy"
slug: "diffusion-policy"
date: "2023-03-07"
updated: "2026-08-16"
track: "Control"
venue: "RSS 2023"
status: "verified"
tags: [diffusion, visuomotor-policy, action-sequence]
summary: "把机器人动作策略建模为条件扩散过程，是连续多峰动作生成的基础工作。"
sources:
  - label: "Paper"
    url: "https://arxiv.org/abs/2303.04137"
  - label: "Project"
    url: "https://diffusion-policy.cs.columbia.edu/"
relations: []
---

## 核心贡献

Diffusion Policy 使用条件去噪过程生成一段动作序列，避免把多峰动作分布压缩为单一回归结果。动作块与滚动执行也让策略兼顾时间一致性和闭环反馈。

## 阅读坐标

- 比较动作空间扩散与图像空间扩散的条件和目标。
- 关注 action horizon、observation horizon 与执行 horizon 的区别。
- 复现实验时固定数据归一化、采样步数与控制频率。
