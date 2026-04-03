# DashPersona — Creator Intelligence Engine

**Version:** v0.7.0 (2026-03-30)
**GitHub:** https://github.com/Fearvox/dash-persona
**Live Demo:** https://dash-persona.vercel.app
**License:** Business Source License 1.1 (BSL 1.1) — converts to Apache 2.0 on 2030-03-24

---

## 一、项目简介

**一句话描述：** 数据无关的创作者情报引擎，通过确定性、无 AI 的统计算法分析抖音、TikTok、小红书三大平台的创作者数据。

**解决的问题：** 内容创作者管理多平台但缺乏统一视角，各平台数据孤立、指标不可比，大多数"分析工具"要么是昂贵的 SaaS，要么是黑盒 AI 无法解释其推荐逻辑。

**核心价值：** 任何创作者都可以本地采集真实数据、在仪表盘查看分析（含历史趋势 + 跨创作者对比）、导出专业 PDF 报告——全程本地化、无云依赖、无 AI 调用。

---

## 二、团队 & 时间线

| 日期 | 里程碑 | 关键交付物 |
|------|--------|-----------|
| 2026-03-24 | Visual Overhaul Sprint | Cinematic landing page + Pipeline 可视化 |
| 2026-03-26 | v0.4.0 部署 | Data Passport Chrome 扩展（MV3）|
| 2026-03-30 | v0.7.0 发布 | Textcraft ASCII 引擎 + Electron Desktop Collector |
| 2026-03-31 | Phase 1 完成 | Foundation & Storage（IndexedDB + 7 adapters）|
| 2026-04-01 | Phase 2 hotfix | resolveProfiles 统一 + XHS parser 修复 |
| 2026-04-02 | Phase 3 完成 | Real Data Integration（ResolvedProfiles + 3 UI 组件 + 5 loaders）|

**GSD v1.0 进度：** 5 phases 中已完成 3 个（Phase 4 & 5 待执行），31 个需求中 25 个已完成。

---

## 三、核心功能

### 3.1 分析引擎（11 个）

| 引擎 | 功能 |
|------|------|
| **Persona Score** | 综合 0-100 分，6 维度分解，含 OLS 趋势分析与统计显著性检验 |
| **Growth Tracker** | 增长追踪，24h/7d/30d/90d 时间范围，IndexedDB 快照持久化 |
| **Niche Detection** | 从 10 个 benchmark 分类自动检测 niche，Hazen 百分位排名 |
| **Strategy Engine** | 自适应阈值可操作建议，随数据量自动缩放 |
| **Content Planner** | AI-free 发帖日历，基于最佳时间段优化 |
| **Persona Timeline** | 决策树追踪策略实验和转向 |
| **Next Content Engine** | 7 条确定性规则 + 等级归一化评分 + 互动 velocity 信号 |
| **Post Quality Filter** | 自动降权低质量和机器人行为帖子 |
| **Cross-Platform Comparator** | 抖音/TikTok/小红书统一雷达对比，自适应差距检测 |
| **Signal Collector** | 18 个标准化信号，5 类别（互动、节奏、增长、内容、受众）|
| **Content Analyzer** | 内容结构分析，视频帧提取 |

### 3.2 Signal Framework（18 信号）

| 类别 | 信号 |
|------|------|
| 互动 | 互动率、点赞率、评论率、分享率 |
| 节奏 | 发布频率、发布一致性、活跃时段覆盖 |
| 增长 | 粉丝增速、粉丝增速 velocity、历史增长曲线 |
| 内容 | 内容质量分数、病毒指数、一致性分数 |
| 受众 | 受众重叠度、跨平台粉丝比 |

**平台权重：**
- 抖音：完播率 ×8
- 小红书：收藏率 ×6
- TikTok：病毒比率 ×7

### 3.3 数据采集方式

| 方式 | 说明 | 状态 |
|------|------|------|
| **DASH Collector** | Electron 桌面应用 + Playwright + Express :3458，系统托盘运行，持久 Cookie | Stable |
| **CDPAdapter** | 通过 Chrome DevTools Protocol 采集（需已有登录态）| Stable |
| **FileImportAdapter** | 拖拽 XLSX/CSV/JSON，自动识别 11 种格式（4 抖音 + 7 TikTok）| Stable |
| **ExtensionAdapter** | Chrome 扩展（MV3）单次点击采集抖音数据 | Beta |
| **HTMLParseAdapter** | 解析平台导出的 HTML 页面 | Fallback |
| **BrowserAdapter** | 无头浏览器自动化 | Fallback |
| **DemoAdapter** | 内置示例数据，即刻体验 | Stable |

### 3.4 用户界面（7 个页面）

| 页面 | 路由 | 功能 |
|------|------|------|
| **Landing** | `/` | 电影级开场动画 + Pipeline 可视化展示 |
| **Dashboard** | `/dashboard` | 增长 sparklines、跨平台粉丝 delta、niche benchmark、策略建议 |
| **Persona Detail** | `/persona/:platform` | Persona Score 6 维度分解，点击可见完整公式 |
| **Compare** | `/compare` | 多创作者雷达图对比，关键洞察自动生成 |
| **Calendar** | `/calendar` | 内容日历，发布最优时间段推荐 |
| **Timeline** | `/timeline` | Persona 决策树，策略实验追踪 |
| **Portrait** | `/portrait` | ASCII 艺术画像，CJK 感知对齐，PNG 导出 |

---

## 四、技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.1 | 全栈 React 框架（App Router）|
| React | 19.2.4 | UI 渲染引擎 |
| Tailwind CSS | 4 | 工具类 CSS（dark mode only）|
| Recharts | 3.8.0 | 图表库 |
| @xyflow/react | 12.10.1 | 流程图/节点图可视化 |
| elkjs | 0.11.1 | ELK 层级布局算法 |
| html2canvas-pro | 2.0.2 | 截图/Canvas 渲染 |
| xlsx | 0.18.5 | Excel 文件解析与生成 |

### 桌面采集
| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 33.4.11 | 桌面框架 |
| electron-builder | 25.1.0 | 应用打包（macOS .dmg）|
| Playwright | 1.52.0 | 浏览器自动化（Chromium）|
| Express | 4.21.0 | HTTP API 服务器（:3458）|

### Chrome 扩展
| 技术 | 版本 | 用途 |
|------|------|------|
| Vite | 6.0.0 | 构建工具 |
| @crxjs/vite-plugin | 2.0.0-beta.28 | CRX 扩展打包 |
| papaparse | 5.4.1 | CSV 解析 |

### 测试 & 质量
| 技术 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.x | 严格类型检查（strict mode）|
| Vitest | 4.1.1 | 单元测试 |
| Playwright | 1.58.2 | E2E 测试（15 个测试用例覆盖 5 个核心流程）|
| ESLint | 9.x | 代码规范 |

---

## 五、架构设计

### 5.1 数据流

```
数据输入
  ├── CDP proxy（抖音/TikTok/小红书）
  ├── JSON/CSV/TSV 文件（11 种 schema 自动识别）
  ├── XLSX 文件（4 抖音 + 7 TikTok Studio 格式）
  ├── Chrome 扩展
  └── 手动导入

       ↓ Quality Filter（降权机器人/低质量帖子）

  Profile Store（IndexedDB 持久化 + sessionStorage 缓存）

       ↓

  11 个分析引擎（并行执行）
  ├── stats/ 统计库（Hazen 百分位、OLS 回归、自适应阈值、归一化）
  └── Signal Collector（18 signals，平台权重）

       ↓

  输出层
  ├── Dashboard（增长概览 + benchmark + 策略建议）
  ├── Persona Detail（6 维度分解 + 公式可见）
  ├── Compare（雷达图 + 跨平台差距洞察）
  ├── Calendar（内容日历）
  ├── Timeline（决策树）
  ├── Portrait（ASCII 艺术画像）
  └── Export（PNG / PDF / CSV）
```

### 5.2 统计基础（stats/ 库）

| 模块 | 算法 | 用途 |
|------|------|------|
| `percentile.ts` | Hazen 绘图位置百分位 | 避免尾部崩溃 |
| `regression.ts` | OLS 线性回归 + t-test p-values | 趋势可靠性检验（p < 0.05 才显示）|
| `normalize.ts` | Min-max + z-score 归一化 | 跨指标可比 |
| `threshold.ts` | 自适应样本量阈值 | 样本少时自动放宽阈值 |

### 5.3 核心算法亮点

- **Niche 检测：** 反向索引关键词匹配 31 个分类，缓存结果
- **互动评分：** 加权公式 + Post Quality Filter（短文本/零互动/机器人行为降权）
- **Persona 一致性：** 自适应滑动窗口余弦相似度（窗口随数据量自动缩放：30 帖 → 窗口 5，200 帖 → 窗口 20）
- **趋势分析：** OLS 回归取代 naive 差分，`trendReliable` 标志由 p < 0.05 把关
- **Engine 记忆化：** FNV-1a 内容哈希 + LRU 驱逐（maxSize=64）
- **一致性保证：** 所有引擎确定性运行，同输入 → 同输出，无随机性

### 5.4 目录结构

```
src/
├── lib/
│   ├── engine/          # 11 个分析引擎 + stats/ 库 + signal-collector
│   │   ├── stats/       # 统计原语（percentile, regression, normalize, threshold）
│   │   └── __tests__/   # 引擎单元测试
│   ├── adapters/        # 7 个数据适配器
│   ├── store/          # IndexedDB profile 持久化 + sessionStorage 同步
│   ├── collectors/      # CDP 客户端、趋势采集器、视频分析器
│   ├── schema/         # CreatorDataSchema 验证
│   ├── pipeline/       # Pipeline 可视化配置 + 设备分级检测
│   ├── textcraft/      # ASCII 艺术渲染引擎（fonts, effects, composers, renderers）
│   └── history/        # IndexedDB 历史快照
├── app/
│   ├── api/            # CDP 采集 + 趋势端点
│   ├── dashboard/      # 仪表盘页面
│   ├── persona/        # Persona 详情页
│   ├── compare/        # 跨创作者对比页
│   ├── calendar/       # 内容日历
│   ├── timeline/       # Persona 时间线
│   ├── portrait/       # ASCII 艺术画像页
│   └── install/        # 面向零基础用户的 CLI 安装指南
├── components/
│   ├── landing/        # 电影级 Landing 组件
│   ├── ui/             # 共享 UI（confirm-dialog, toast, skeleton）
│   └── dashboard/      # Dashboard 专用组件
collector/               # Electron Desktop Collector
extension/              # Chrome Web Extension（MV3）
docs/
├── plans/              # GSD 执行计划
└── screenshots/       # 产品截图
```

---

## 六、设计系统

### 色彩
| Token | 色值 | 用途 |
|-------|------|------|
| `--bg-primary` | `#0a0f0d` | 背景色 |
| `--bg-card` | `#151d19` | 卡片背景 |
| `--text-primary` | `#e8fff6` | 主文字 |
| `--text-secondary` | `#b8c4be` | 次文字 |
| `--text-subtle` | `#8a9590` | 弱文字 |
| 绿强调 | `#7ed29a` | 成功/正面指标 |
| 红强调 | `#c87e7e` | 负面指标 |
| 黄强调 | `#d2c87e` | 警告/中性指标 |
| 蓝强调 | `#7eb8d2` | 信息指标 |
| 高亮 | `#f0f545` | 关键数据高亮 |

### 字体
| 用途 | 字体 | 特性 |
|------|------|------|
| 界面文字 | Geist Sans | 可变字体 |
| 数据/指标 | Geist Mono | tabular-nums（数字等宽对齐）|

### 动效
- 最长持续时间：750ms
- Easing：`cubic-bezier(0.22, 1, 0.36, 1)`
- 仅使用 transform + opacity（禁止颜色/阴影动画）
- `prefers-reduced-motion`：完全禁用动画

### 设计原则
1. 每个像素都要证明自己存在的价值
2. 数据密度优先于留白
3. 透明度即信任
4. 层级通过字体大小建立，非装饰
5. 减法是默认操作

### 反模式（禁止）
- 3 栏卡片网格
- 左侧彩色边条
- 纯黑背景
- UI 中使用 emoji
- 内联 `style={{}}` 样式
- 紫色/青色渐变
- AI 感配色

---

## 七、产品截图说明

| 页面 | 截图文件 | 展示内容 |
|------|----------|----------|
| Dashboard | `docs/screenshots/dashboard.png` | 增长概览、benchmark 对比、策略建议 |
| Persona Detail | `docs/screenshots/persona.png` | 6 维度分解 + persona tags + 公式可见 |
| Compare | `docs/screenshots/compare.png` | 跨平台指标对比 + 关键洞察高亮 |

**Demo 视频：** https://www.youtube.com/watch?v=XwvHWx6m6dw

---

## 八、项目亮点数字

| 指标 | 数值 |
|------|------|
| 分析引擎 | 11 个 |
|  Intelligence Signals | 18 个 |
| 数据适配器 | 7 个 |
| 单元测试 | 308+ 个 |
| E2E 测试用例 | 15 个 |
| 支持平台 | 3 个（抖音/TikTok/小红书）|
| XLSX schema 支持 | 11 种 |
| i18n 语料 | 700+ keys |
| 版本 | v0.7.0 |
| 部署平台 | Vercel |

---

## 九、快速开始

```bash
git clone https://github.com/Fearvox/dash-persona.git
cd dash-persona
npm install
npm run dev
# 打开 http://localhost:3000
# 点击 "Try Demo" 体验示例数据
```

**真实数据采集：** 下载 DASH Collector 桌面应用（macOS/Windows），系统托盘运行，登录一次 Creator Center 后自动持续采集。

---

## 十、Roadmap

- [x] 10 niches benchmark + 合成队列对比
- [x] Data Passport Chrome 扩展（MV3）
- [x] IndexedDB 客户端历史持久化
- [x] 平台特定质量信号（完播率/跳出率/平均观看时长）
- [x] 多文件导入 + 4 抖音 XLSX schema 自动识别
- [x] 雷达图多维跨平台对比
- [x] PNG/PDF/CSV 报告导出
- [x] Engine 记忆化（FNV-1a + LRU）
- [x] TikTok Studio XLSX 导入（7 种额外 schema + 日期归一化）
- [x] i18n 中英双语
- [x] Textcraft ASCII 艺术引擎
- [x] Hazen 百分位 + OLS 回归 + 自适应阈值
- [ ] 18 信号雷达可视化
- [ ] 受众人口统计洞察（fanPortrait 集成）
- [ ] 两阶段 ranking pipeline（候选生成 + 评分）

---

## 十一、构建记录

| Sprint | 日期 | 核心交付 |
|--------|------|----------|
| Visual Overhaul | 2026-03-24~30 | Cinematic landing、Pipeline 可视化、54+ 文件 Tailwind 迁移 |
| Collector 发布 | 2026-03-26 | Electron + Playwright + Express、Data Passport 扩展 |
| v0.7.0 | 2026-03-30 | Textcraft 引擎、Electron Collector、Post Quality Scoring |
| Phase 1~3 | 2026-03-31~04-02 | Foundation → Collector → Real Data Integration 完整闭环 |

---

*最后更新：2026-04-02 | 项目持续开发中*
