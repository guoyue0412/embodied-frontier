---
title: "OpenVLA"
slug: "openvla"
date: "2024-06-13"
updated: "2026-08-18"
track: "VLA"
venue: "CoRL 2024"
status: "verified"
tags: [open-source, action-tokenization, generalist-policy]
summary: "以公开权重和训练代码降低通用机器人策略研究门槛的 VLA 基线。"
sources:
  - label: "Paper"
    url: "https://arxiv.org/abs/2406.09246"
  - label: "Project"
    url: "https://openvla.github.io/"
---

## 为什么值得读

OpenVLA 把视觉编码、语言模型和动作 token 预测组织成一个可公开训练与微调的通用策略。它的重要性不只在于模型规模，更在于提供了可继续实验的工程基线。

## 阅读坐标

- 先确认动作离散化与语言 token 空间如何连接。
- 区分预训练数据带来的泛化与下游微调带来的任务适配。
- 阅读指标时保留机器人本体、任务集合和评测协议。

## 仍需验证

公开权重不等于低成本部署；显存、推理频率和真实控制链路需要在目标硬件上单独验证。
