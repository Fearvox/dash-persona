# TODOS

## In Progress
- [ ] Data Passport 浏览器扩展 — Vite+CRXJS scaffold, 抖音内容脚本, Background Worker 状态机, ExtensionAdapter
- [ ] Inline style migration — ~200 remaining `style={{}}` (mostly `color: var(--text-*)`) → Tailwind utility classes
- [ ] Pipeline horizontal scroll enhancement — CSS transform layer on top of vertical-first layout
- [ ] Landing → Dashboard shimmer transition (2s "Analyzing..." before staggered fade-in)

## Backlog
- [ ] Red Note (小红书) 扩展内容脚本 — Data Passport Phase 2
- [ ] /data-algo-social 真实数据算法优化 — 等 skill 就绪后接入
- [ ] Playwright E2E test infrastructure — scroll sync, hydration, responsive layout need browser-level checks
- [ ] pipeline-config.ts dev-only validation — warn if module IDs drift from engine exports
- [ ] Create DashPersona DESIGN.md (full version, not just .impeccable.md)
- [ ] Persona Detail radial progress ring for overall score
- [ ] Mobile responsive pipeline (vertical scroll on <768px)
- [ ] Full a11y audit (WCAG AA) after implementation stabilizes
- [ ] Platform tabs aria-pattern fix (remove role="tab" or implement arrow-key nav)

## Completed (2026-03-24)
- [x] Calendar event card overlap
- [x] Dashboard Persona Score heading position
- [x] Timeline Save/Reset buttons with localStorage
- [x] Cinematic landing page (boot + pipeline + output wall)
- [x] Dashboard 2-zone layout
- [x] overallScore DRY extraction + NaN guard
- [x] PostDrawer full rewrite (modal, no inline styles)
- [x] AI slop cleanup (left-borders, equal grids)
- [x] Z-index system + ConfirmDialog focus trap
- [x] Button tactile feedback + Toast + ConfirmDialog system
- [x] 8 项引擎算法优化 (sparse sliding window, binary search percentile, redundancy elimination等)
- [x] Phase 3: IndexedDB 历史持久化 + useProfileHistory hook + Collect Now 按钮
- [x] Phase 3: 10 niche 基准对比引擎 + niche 自动检测 + BenchmarkCard 组件
- [x] Timeline 平台切换 bug 修复 (key={platform})
- [x] Timeline 平台切换引导提示条
- [x] Data Passport 设计文档 (office-hours + DOM 研究 + eng review + design review)
- [x] 抖音创作者中心 DOM 选择器研究 (5 页面完整映射)
