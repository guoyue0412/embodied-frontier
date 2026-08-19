---
name: "郭跃"
eyebrow: "PUBLIC RESEARCH PROFILE"
title: "具身智能研究方向"
role: "World Action Model / robot learning"
summary: "围绕视频生成、世界动作模型与机器人学习，整理可公开的研究关注和工程能力。"
education:
  - "哈尔滨工业大学（深圳）（HIT Shenzhen）· 机器人与先进制造方向"
  - "吉林大学 · 汽车工程背景"
evidence: "self-reported"
sourceLabel: "个人简历与自我介绍材料"
focus:
  - label: "World Action Model"
    detail: "研究视频表征、未来 latent 与动作策略之间的连接。"
    tags: ["WAM", "Video2World", "future latent"]
  - label: "VLA 与跨本体学习"
    detail: "关注 Flow Matching 策略、DiT4DiT 适配和多模态机器人数据。"
    tags: ["VLA", "Flow Matching", "DiT4DiT"]
  - label: "可验证的机器人系统"
    detail: "把训练、仿真评测、端云推理与真机接口放在同一条证据链里。"
    tags: ["LIBERO", "CALVIN", "ROS2"]
honors:
  - "国家奖学金"
  - "吉林大学优秀毕业生"
  - "中国大学生工程实践与创新能力大赛金奖"
  - "中国机器人大赛国家一等奖"
capabilities:
  - id: "world-action-modeling"
    label: "世界模型与策略建模"
    summary: "围绕 World Action Model / Video2World / future latent，关注视频条件、动作解码与策略建模的接口。"
    tools: ["WAM", "Video2World", "Diffusion / Flow Matching", "DiT4DiT"]
  - id: "robot-data-training"
    label: "机器人数据与训练系统"
    summary: "处理多源机器人数据的统一表达、动作空间适配和可复现实验训练。"
    tools: ["PyTorch", "DeepSpeed", "bf16", "WebDataset", "LeRobot / OXE"]
  - id: "evaluation-deployment"
    label: "评测、部署与系统接口"
    summary: "把策略放进公开 benchmark、仿真控制和机器人软件接口中检查行为链路。"
    tools: ["LIBERO / CALVIN", "ROS2", "TensorRT / ONNX", "Sim-to-Real"]
  - id: "differentiable-control"
    label: "可微控制与实验自动化"
    summary: "关注 JAX BPTT、可微仿真、控制器训练和实验配置反馈的自动化组织。"
    tools: ["JAX", "BPTT", "differentiable simulation", "AutoResearch"]
practiceLanes:
  - id: "wam-architecture-alignment"
    label: "WAM architecture / data alignment"
    detail: "以高层视角整理视频表征、动作策略接口、head-camera frame 对齐与跨本体数据表达。"
  - id: "vla-end-to-end"
    label: "VLA end-to-end workflow"
    detail: "覆盖数据整理、训练适配、仿真评测、策略服务和机器人软件接口的完整工作流。"
  - id: "bptt-sim-to-real"
    label: "Differentiable BPTT / Sim-to-Real"
    detail: "关注可微动力学、长时域梯度与仿真到真实系统之间的验证闭环。"
  - id: "autoresearch-automation"
    label: "AutoResearch experiment automation"
    detail: "把实验配置、训练反馈、候选调整与知识沉淀组织成可复查的自动化循环。"
---

## 公开边界

这里展示的是来自个人简历与自我介绍材料的方向性证据，统一标记为 **self-reported**。它用于说明关注的问题和能力接口，不替代论文、代码、运行日志或协议完整的独立复核。

涉及成功率、训练时长、加速比、排名或具体交付结果的数字，暂不在公开 profile 中展开；等来源、评测协议和可复现材料齐备后，再进入对应的研究条目。
