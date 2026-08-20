# WAM showcase acceptance record

Date: 2026-08-20

## Scope and authorization

The five source videos were supplied by the repository owner for publication in the WAM showcase. Only source basenames are recorded here; local absolute paths are intentionally excluded. A frame contact-sheet review found robot workspaces and source-provided task labels, with no visible faces, employer/client identity, private application UI, or credentials.

## Source provenance

| Source basename | SHA-256 |
| --- | --- |
| `mv_agibotbeta__agibot_mobile_dual_arm__idx005_gt_2x2.mp4` | `307dc35fae26b38148ba007f8b88eab5107148f44e2f115a94c31d7cca7bf6e7` |
| `mv_agibotbeta__agibot_mobile_dual_arm__idx005_pred_2x2.mp4` | `97de84faea180532b43cb58eace73d5e1493010c74a9c2a3d1b26df8b20a54c4` |
| `mv_robotwinHD__aloha-agilex__idx206_gt_2x2.mp4` | `38c36363168904df3c6d41550fcaa830be4144ea1cf870a9e50ef9e9983d62cd` |
| `mv_robotwinHD__aloha-agilex__idx206_pred_2x2.mp4` | `5c7ac3bd44378837aed7855c4b0ab9d171d292333c5b1c60a75c2a94f6ea809f` |
| `openarm.mp4` | `f3a79a4595922445ac62bbaf5ebe7d78decc4eed2cca04e8f2bddd45674d3c0e` |

## Published media

| Public asset | Properties | SHA-256 |
| --- | --- | --- |
| `agibotbeta-idx005-gt.mp4` | H.264, 1280×960, 16 FPS, 10.0625 s, no audio | `36bd28f7c884d7b30166782a42bc94641164b7a424e1d020f6ae3ce5d1b0548e` |
| `agibotbeta-idx005-pred.mp4` | H.264, 1280×960, 16 FPS, 10.0625 s, no audio | `4b264f0b267d845c57b6fe32ed8c7e292cbd9d314f6959e5c6cccd77d3d8c85a` |
| `robotwinhd-idx206-gt.mp4` | H.264, 1280×960, 16 FPS, 10.0625 s, no audio | `f3b8dc8c3b2605b136db862f58bf91e5c1096f9bd7c0fdab8d583d8859a0587a` |
| `robotwinhd-idx206-pred.mp4` | H.264, 1280×960, 16 FPS, 10.0625 s, no audio | `873bb723910f4646d95f7cd8ef133f76816ad4b87e69f6b908cb304b61954f6c` |
| `openarm.mp4` | H.264, 540×960, 30 FPS, 7.4333 s, 3× speed, audio removed | `fc0dc20714cd0ed340fe0181e5bec3c9eb1752bfb8f13ed4970e5f70268a577e` |

The published media directory is 6.4 MiB. Posters are static JPEG files. All videos use native controls, `playsinline`, metadata-only preload, and same-origin paths. The page labels visible media facts but does not infer success rate, model quality, or cross-task generalization.

## Verification

- Production build: 16 static pages.
- Automated suite: 124/124 tests passed.
- Browser QA: desktop 1440×900, mobile touch 360×800, reduced motion, and no-JavaScript profiles; no failures.
- Repeatability: nine screenshots were byte-identical across two browser-QA runs.
- Delivery: the production test server returned byte-range responses for MP4 metadata requests.
