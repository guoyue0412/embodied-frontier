---
title: "WAM 生成与实机展示"
slug: "wam-generation-showcase"
updated: "2026-08-19"
summary: "将用户提供的两组多视角 GT / Pred 生成片段与一段 OpenArm 双臂实机视频整理为可核验的 WAM 媒体展示。"
role: "WAM 媒体证据整理"
contributions:
  - "按任务与机器人平台组织用户提供的 GT / Pred 视频，保留原始多视角构图与时序。"
  - "将 OpenArm 实机片段转为浏览器兼容、无音轨的 3× speed 公开版本，并生成独立封面。"
  - "明确区分可见媒体事实与模型效果解释，不从单个片段外推成功率或泛化能力。"
stack:
  - "WAM"
  - "Video Generation"
  - "AgiBotBeta"
  - "RoboTwinHD"
  - "OpenArm"
mediaGroups:
  - title: "OpenArm 双臂实机演示"
    description: "真实机器人侧的可见动作片段；仅用于展示操作过程，不把单段视频解释为系统稳定性或成功率证据。"
    kind: "single"
    items:
      - label: "Robot Demo"
        note: "7.4 s · 3× speed · muted"
        video:
          mp4: "/videos/wam/openarm.mp4"
          poster: "/videos/wam/openarm.jpg"
  - title: "AgiBotBeta · mobile dual arm · idx005"
    description: "同一任务的四视角 Ground Truth 与 Prediction 并排展示，用于观察时序与多视角生成差异。"
    kind: "comparison"
    items:
      - label: "Ground Truth"
        note: "10.06 s · 4 views"
        video:
          mp4: "/videos/wam/agibotbeta-idx005-gt.mp4"
          poster: "/videos/wam/agibotbeta-idx005-gt.jpg"
      - label: "Prediction"
        note: "10.06 s · 4 views"
        video:
          mp4: "/videos/wam/agibotbeta-idx005-pred.mp4"
          poster: "/videos/wam/agibotbeta-idx005-pred.jpg"
  - title: "RoboTwinHD · Aloha-AgileX · idx206"
    description: "同一任务的四视角 Ground Truth 与 Prediction 并排展示；画面观察不替代统一协议下的定量评测。"
    kind: "comparison"
    items:
      - label: "Ground Truth"
        note: "10.06 s · 4 views"
        video:
          mp4: "/videos/wam/robotwinhd-idx206-gt.mp4"
          poster: "/videos/wam/robotwinhd-idx206-gt.jpg"
      - label: "Prediction"
        note: "10.06 s · 4 views"
        video:
          mp4: "/videos/wam/robotwinhd-idx206-pred.mp4"
          poster: "/videos/wam/robotwinhd-idx206-pred.jpg"
evidence:
  - "五段媒体均由用户在本次任务中明确提供并要求加入 WAM 展示。"
  - "两组 GT / Pred 文件均为 1280×960、16 FPS、约 10.06 秒，且不含音轨。"
  - "OpenArm 公开版本由 720×1280、30 FPS、约 22.17 秒的源视频转为 3× speed、约 7.4 秒的 H.264 视频，音轨已移除。"
  - "这些片段只证明对应媒体可见，不构成定量评测结论、成功率或跨任务泛化证明。"
sources: []
anonymized: true
disclosure: "本页面为个人参与项目的匿名化演示或独立重建，不包含实习公司的名称、内部代码、私有数据和未公开产品信息，也不代表原公司的官方实现。"
mediaRights: authorized
public: true
---

本页只呈现用户授权公开的媒体与可直接核验的技术属性。GT / Pred 标签沿用源视频中的含义；页面不补充模型名称、训练配置或未经提供的实验指标。
