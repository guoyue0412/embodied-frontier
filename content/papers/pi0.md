---
title: "π0"
slug: "pi0"
date: "2024-10-31"
updated: "2026-08-17"
track: "VLA"
venue: "Technical Report"
status: "self-reported"
tags: [flow-matching, action-chunking, generalist-policy]
summary: "使用 flow matching 生成连续动作块，代表连续动作 VLA 的重要路线。"
sources:
  - label: "Paper"
    url: "https://arxiv.org/abs/2410.24164"
  - label: "Project"
    url: "https://www.physicalintelligence.company/blog/pi0"
relations:
  - { target: "model:pi0", type: "describes" }
---

## 核心问题

语言模型擅长离散序列，而机器人控制需要连续、高频并且可能多峰的动作。π0 将通用视觉语言表征与连续动作生成结合，用 flow matching 建模动作块。

## 阅读坐标

- 观察高层语义表征与动作专家之间的接口。
- 明确训练数据中跨机器人数据的比例与归一化方式。
- 将作者报告的结果与独立复现分开记录。

## 证据边界

当前条目记录论文与官方项目页所报告的能力，因此整体状态保留为作者自评。
