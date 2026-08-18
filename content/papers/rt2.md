---
title: "RT-2"
slug: "rt2"
date: "2023-07-28"
updated: "2026-08-15"
track: "VLA"
venue: "CoRL 2023"
status: "self-reported"
tags: [web-scale-pretraining, action-tokenization, transfer]
summary: "把机器人动作表示为文本 token，并利用视觉语言预训练知识进行机器人控制。"
sources:
  - label: "Paper"
    url: "https://arxiv.org/abs/2307.15818"
  - label: "Project"
    url: "https://robotics-transformer2.github.io/"
---

## 核心问题

RT-2 研究如何把互联网视觉语言知识迁移到机器人动作预测。其关键设计是让动作进入与语言 token 兼容的输出空间，从而沿用视觉语言模型的训练范式。

## 阅读坐标

- 区分语义泛化、视觉泛化和控制精度。
- 检查动作 token 化对误差与控制频率的影响。
- 结果主要来自作者体系内评测，记录时保留自评边界。
