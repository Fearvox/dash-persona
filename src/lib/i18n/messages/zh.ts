const zh: Record<string, string> = {
  // ===========================================================================
  // 通用 UI
  // ===========================================================================
  'ui.common.home': '首页',
  'ui.common.dashboard': '仪表盘',
  'ui.common.settings': '设置',
  'ui.common.back': '返回',
  'ui.common.backToDashboard': '仪表盘',
  'ui.common.backToHome': 'DashPersona',
  'ui.common.loading': '加载中...',
  'ui.common.loadingImported': '正在加载导入数据...',
  'ui.common.daySunday': '周日',
  'ui.common.dayMonday': '周一',
  'ui.common.dayTuesday': '周二',
  'ui.common.dayWednesday': '周三',
  'ui.common.dayThursday': '周四',
  'ui.common.dayFriday': '周五',
  'ui.common.daySaturday': '周六',
  'ui.common.viewDetails': '查看详情',
  'ui.common.viewDemoInstead': '查看演示数据',
  'ui.common.demo': '演示',
  'ui.common.import': '导入',
  'ui.common.importMore': '导入更多',
  'ui.common.continue': '继续',
  'ui.common.cancel': '取消',
  'ui.common.best': '最佳',
  'ui.common.na': '暂无',
  'ui.common.tip': '提示',
  'ui.common.posts': '作品',
  'ui.common.followers': '粉丝',
  'ui.common.version': 'v0.7.0',
  'ui.common.poweredBy': '技术支持',
  'ui.common.customDigitalSystems': '定制数字系统',
  'ui.common.launchDashboard': '启动仪表盘',
  'ui.common.goToOnboarding': '前往引导',
  'ui.common.insufficientData': '数据不足',
  'ui.common.importMoreData': '导入更多数据',

  // ===========================================================================
  // 平台标签
  // ===========================================================================
  'platform.douyin': '抖音',
  'platform.tiktok': 'TikTok',
  'platform.xhs': '小红书',

  // ===========================================================================
  // 首页 — 启动序列
  // ===========================================================================
  'ui.landing.tagline': '数据驱动的创作者智能引擎',
  'ui.landing.subTagline': '零 AI，纯算法。',
  'ui.landing.tryDemo': '体验演示',
  'ui.landing.getStarted': '开始使用',
  'ui.landing.installFull': '安装完整版',
  'ui.landing.scrollToExplore': '下滑探索',

  // ===========================================================================
  // 首页 — 输出墙
  // ===========================================================================
  'ui.landing.outputViews': '输出视图',
  'ui.landing.outputDescription': '所有洞察均来自确定性算法 — 无 AI，无黑箱。',
  'ui.landing.viewDashboard': '仪表盘',
  'ui.landing.viewDashboardDesc': '增长概览、指标和策略建议',
  'ui.landing.viewPersona': '人设详情',
  'ui.landing.viewPersonaDesc': '维度分解、标签和评分',
  'ui.landing.viewCalendar': '内容日历',
  'ui.landing.viewCalendarDesc': '无 AI 的发布排期',
  'ui.landing.viewTimeline': '人设时间线',
  'ui.landing.viewTimelineDesc': '实验决策树',
  'ui.landing.viewCompare': '跨平台对比',
  'ui.landing.viewCompareDesc': '多平台并排分析',

  // ===========================================================================
  // 仪表盘
  // ===========================================================================
  'ui.dashboard.title': '仪表盘',
  'ui.dashboard.demoDashboard': '演示仪表盘',
  'ui.dashboard.growthOverview': '增长概览',
  'ui.dashboard.crossPlatformComparison': '跨平台对比',
  'ui.dashboard.strategySuggestions': '策略建议',
  'ui.dashboard.quickLinks': '快捷入口',
  'ui.dashboard.personaScore': '人设评分',
  'ui.dashboard.contentCalendar': '内容日历',
  'ui.dashboard.contentCalendarDesc': '根据互动规律安排发布',
  'ui.dashboard.personaTimeline': '人设时间线',
  'ui.dashboard.personaTimelineDesc': '追踪策略实验和决策',
  'ui.dashboard.comparePlatforms': '平台对比',
  'ui.dashboard.comparePlatformsDesc': '多平台数据并排展示',
  'ui.dashboard.invalidProfileUrl': '无效的主页链接',
  'ui.dashboard.noProfileUrl': '未提供主页链接',
  'ui.dashboard.invalidUrlMessage': '提供的链接无效。请通过引导流程粘贴有效的 TikTok 主页链接。',
  'ui.dashboard.noUrlMessage': '若要使用实时数据采集，请通过引导流程粘贴你的 TikTok 主页链接。',
  'ui.dashboard.waitingExtension': '等待浏览器扩展数据...',
  'ui.dashboard.extensionError': '扩展错误',
  'ui.dashboard.extensionData': '扩展数据',
  'ui.dashboard.noExtensionData': '尚未收到扩展数据。请在 creator.douyin.com 上打开 Data Passport 扩展并点击「采集」。当前使用演示数据。',
  'ui.dashboard.loadingImported': '正在加载导入数据...',
  'ui.dashboard.runningEngines': '正在运行分析引擎...',
  'ui.dashboard.enrichmentTip': '想要更精准的分析？从创作者中心导出数据（账号指标、作品列表），点击<strong>导入更多</strong>添加。数据越多，人设洞察越准。',
  'ui.dashboard.enrichmentTipPre': '想要更精准的分析？从创作者中心导出数据（账号指标、作品列表），点击',
  'ui.dashboard.enrichmentTipPost': '添加。数据越多，人设洞察越准。',
  'ui.dashboard.forYou': '为你推荐',
  'ui.dashboard.nicheDetection': '赛道识别',
  'ui.dashboard.overallScore': '综合评分',
  'ui.dashboard.bestPlatform': '最佳：{platform}',

  // ===========================================================================
  // 人设详情
  // ===========================================================================
  'ui.persona.title': '人设详情',
  'ui.persona.overallPersonaScore': '人设综合评分',
  'ui.persona.momentum': '增长势头',
  'ui.persona.postsAnalysed': '已分析 {count} 条作品',
  'ui.persona.dimensionBreakdown': '维度分解',
  'ui.persona.contentMix': '内容构成',
  'ui.persona.engagementProfile': '互动画像',
  'ui.persona.postingRhythm': '发布节奏',
  'ui.persona.personaConsistency': '人设一致性',
  'ui.persona.growthHealth': '增长健康度',
  'ui.persona.strategy': '策略',
  'ui.persona.personaTags': '人设标签',
  'ui.persona.contentTypeDistribution': '内容类型分布',
  'ui.persona.diversityIndex': '多样性指数：{count} 个类别',
  'ui.persona.avgRate': '平均互动率',
  'ui.persona.bestCategory': '最佳类别',
  'ui.persona.trend': '趋势',
  'ui.persona.viralPotential': '爆款潜力',
  'ui.persona.postsPerWeek': '每周发布',
  'ui.persona.consistency': '一致性',
  'ui.persona.bestSlots': '最佳时段',
  'ui.persona.stableIdentity': '稳定的主题定位',
  'ui.persona.diverseTopics': '多元的主题覆盖',
  'ui.persona.dominant': '主导',
  'ui.persona.followerGrowth': '粉丝增长',
  'ui.persona.viewGrowth': '播放增长',
  'ui.persona.noSuggestions': '暂无紧急建议，继续保持！',

  // ===========================================================================
  // 时间线
  // ===========================================================================
  'ui.timeline.title': '人设时间线',
  'ui.timeline.subtitle': '内容策略实验决策树',
  'ui.timeline.totalNodes': '总节点',
  'ui.timeline.mainline': '主线',
  'ui.timeline.branches': '分支',
  'ui.timeline.boundaries': '边界',
  'ui.timeline.growthHistory': '增长历史',
  'ui.timeline.statusAdopted': '已采纳',
  'ui.timeline.statusRunning': '运行中',
  'ui.timeline.statusDiscarded': '已放弃',
  'ui.timeline.statusPlanned': '计划中',
  'ui.timeline.scoringBreakdown': '评分详情',
  'ui.timeline.scoreEngagement': '互动',
  'ui.timeline.scoreRetention': '留存',
  'ui.timeline.scoreGrowth': '增长',
  'ui.timeline.scoreComposite': '综合',
  'ui.timeline.scoreCompositeLabel': '综合',
  'ui.timeline.variants': '变体',
  'ui.timeline.decision': '决策',
  'ui.timeline.series': '系列',
  'ui.timeline.mergedBackTo': '合并回',
  'ui.timeline.rejected': '拒绝',
  'ui.timeline.conflict': '冲突',
  'ui.timeline.metricConflict': '指标冲突',
  'ui.timeline.metricConflictDetected': '检测到指标冲突',
  'ui.timeline.conflictAdoptedDesc': '此节点已采纳，但检测到与相邻分支的指标冲突。建议审查数据。',
  'ui.timeline.conflictDiscardedDesc': '此节点已放弃，且指标与采纳节点存在冲突。可能需要进一步调查。',
  'ui.timeline.discard': '放弃',
  'ui.timeline.changesSaved': '修改已保存',
  'ui.timeline.saveFailed': '保存失败',
  'ui.timeline.treeReset': '时间线已重置',
  'ui.timeline.platformHint': '这是人设时间线——一个追踪内容策略实验的决策树。点击节点可查看详情、添加变体或放弃分支。',
  'ui.timeline.gotIt': '知道了',
  'ui.timeline.save': '保存',
  'ui.timeline.reset': '重置',
  'ui.timeline.newExperimentBtn': '+ 新实验',
  'ui.timeline.newExperiment': '新实验',
  'ui.timeline.createFromIdea': '从想法创建',
  'ui.timeline.experimentDetail': '实验详情',
  'ui.timeline.close': '关闭',
  'ui.timeline.experimentIdeas': '实验想法',
  'ui.timeline.ideasCount': '{count} 个想法',
  'ui.timeline.resetDialogTitle': '重置时间线',
  'ui.timeline.resetDialogDesc': '确定要将时间线重置为默认状态吗？所有本地修改将丢失。',
  'ui.timeline.keepEditing': '继续编辑',

  // ===========================================================================
  // 日历
  // ===========================================================================
  'ui.calendar.title': '内容日历',
  'ui.calendar.subtitle': '已分析 {dataPoints} 条作品 \u00B7 生成 {slots} 个时段',
  'ui.calendar.needMoreData': '需要更多数据',
  'ui.calendar.needMoreDataDesc': '内容日历需要至少 10 条作品才能生成有意义的排期建议。当前有 <strong>{count}</strong> 条作品。',
  'ui.calendar.needMoreDataPre': '内容日历需要至少 10 条作品才能生成有意义的排期建议。当前有',
  'ui.calendar.needMoreDataPost': '条{plural}。',
  'ui.calendar.posts': '作品',
  'ui.calendar.importMoreDesc': '导入更多数据以解锁日历功能',
  'ui.calendar.keepPublishing': '继续发布作品，积累更多数据后再来查看。',
  'ui.calendar.accept': '采纳',
  'ui.calendar.accepted': '已采纳',
  'ui.calendar.dismiss': '忽略',
  'ui.calendar.dismissed': '已忽略',
  'ui.calendar.month1': '1月',
  'ui.calendar.month2': '2月',
  'ui.calendar.month3': '3月',
  'ui.calendar.month4': '4月',
  'ui.calendar.month5': '5月',
  'ui.calendar.month6': '6月',
  'ui.calendar.month7': '7月',
  'ui.calendar.month8': '8月',
  'ui.calendar.month9': '9月',
  'ui.calendar.month10': '10月',
  'ui.calendar.month11': '11月',
  'ui.calendar.month12': '12月',
  'ui.calendar.dayMon': '一',
  'ui.calendar.dayTue': '二',
  'ui.calendar.dayWed': '三',
  'ui.calendar.dayThu': '四',
  'ui.calendar.dayFri': '五',
  'ui.calendar.daySat': '六',
  'ui.calendar.daySun': '日',

  // ===========================================================================
  // 对比
  // ===========================================================================
  'ui.compare.title': '跨平台对比',
  'ui.compare.persona': '人设：{type}',
  'ui.compare.keyMetrics': '核心指标',
  'ui.compare.radarOverview': '雷达图总览',
  'ui.compare.radarFollowers': '粉丝',
  'ui.compare.radarEngagement': '互动率',
  'ui.compare.radarPosts': '作品数',
  'ui.compare.radarViews': '播放量',
  'ui.compare.radarTotalEng': '总互动',
  'ui.compare.insightHighlights': '洞察亮点',
  'ui.compare.contentTypeOverlap': '内容类型重叠',
  'ui.compare.category': '类别',
  'ui.compare.personaScoreComparison': '人设评分对比',
  'ui.compare.followers': '粉丝数',
  'ui.compare.engagementRate': '互动率',
  'ui.compare.likesTotal': '总点赞',
  'ui.compare.savesTotal': '总收藏',
  'ui.compare.multiDimensional': '多维对比',
  'ui.compare.needTwoPlatforms': '需要至少 2 个平台才能对比',
  'ui.compare.needTwoPlatformsDesc': '导入多个平台的数据（抖音、TikTok、小红书）即可查看跨平台对比、雷达图和可操作洞察。',
  'ui.compare.importMoreData': '导入更多数据',
  'ui.compare.insights': '洞察',

  // ===========================================================================
  // 设置
  // ===========================================================================
  'ui.settings.title': '设置',
  'ui.settings.learningData': '学习数据',
  'ui.settings.loadingPreferences': '正在加载偏好...',
  'ui.settings.totalInteractions': '已追踪的交互次数',
  'ui.settings.yourPreferences': '你的偏好',
  'ui.settings.topSections': '常用模块',
  'ui.settings.focusPlatform': '关注平台',
  'ui.settings.preferredTimeRange': '偏好时间范围',
  'ui.settings.noneYet': '暂无',
  'ui.settings.clearLearningData': '清除学习数据',
  'ui.settings.clearedSuccessfully': '已成功清除',
  'ui.settings.about': '关于',
  'ui.settings.versionLabel': '版本',
  'ui.settings.license': '许可证',
  'ui.settings.source': '源码',

  // ===========================================================================
  // 安装指南
  // ===========================================================================
  'ui.install.backToHome': '← 返回首页',
  'ui.install.pageTitle': '开始使用 DashPersona',
  'ui.install.pageDesc': '使用 DASH Collector 桌面应用一键采集创作者中心真实数据，解锁完整的人设分析功能。',
  'ui.install.unlocksHeading': '完整版解锁内容',
  'ui.install.unlock1Title': '真实数据',
  'ui.install.unlock1Desc': '直接从抖音、TikTok 和小红书创作者中心采集真实数据。',
  'ui.install.unlock2Title': '增长追踪',
  'ui.install.unlock2Desc': '追踪随时间变化的粉丝和互动趋势。',
  'ui.install.unlock3Title': '完整分析',
  'ui.install.unlock3Desc': '解锁基准对比、内容日历和完整的人设评分。',
  'ui.install.recommendedHeading': '推荐方式 — DASH Collector',
  'ui.install.recommendedDesc': '桌面应用，一键安装，无需配置终端环境。',
  'ui.install.requirementsHeading': '环境要求',
  'ui.install.req1': 'macOS、Windows 或 Linux',
  'ui.install.req2': 'DASH Collector 桌面应用',
  'ui.install.req3': '创作者中心账号（抖音 / TikTok / 小红书）',
  'ui.install.stepsHeading': '安装步骤',
  'ui.install.step1Title': '下载并安装 DASH Collector',
  'ui.install.step1Desc': '从下方链接下载适合你操作系统的版本，双击安装即可。',
  'ui.install.step1DownloadMac': '下载 macOS 版',
  'ui.install.step1DownloadWin': '下载 Windows 版',
  'ui.install.step1DownloadLinux': '下载 Linux 版',
  'ui.install.step2Title': '启动并登录',
  'ui.install.step2Desc': '安装完成后启动 DASH Collector，点击系统托盘图标，选择「打开登录窗口」。在弹出的浏览器窗口中登录你的创作者中心（如抖音创作者中心、TikTok Studio 等）。',
  'ui.install.step3Title': '回到 DASH 网页采集数据',
  'ui.install.step3Desc': '登录完成后，回到 DashPersona 网页的引导页面，选择「自动采集」模式，点击采集按钮即可。',
  'ui.install.step3Cta': '前往引导页面',
  'ui.install.cliHeading': '备选方式 — CLI 手动安装',
  'ui.install.cliDesc': '如果你熟悉命令行工具，也可以通过 CLI 方式完成安装和采集。',
  'ui.install.cliToggle': '展开 CLI 安装步骤',
  'ui.install.cliStep1Title': '安装 Node.js',
  'ui.install.cliStep1Desc': '前往 nodejs.org 下载并安装最新 LTS 版本。',
  'ui.install.cliStep2Title': '安装 Claude Code CLI',
  'ui.install.cliStep2Desc': '在终端运行以下命令全局安装 Claude Code：',
  'ui.install.cliStep3Title': '安装网页访问技能',
  'ui.install.cliStep3Desc': '安装允许 Claude 采集创作者数据的技能：',
  'ui.install.cliStep4Title': '开启 Chrome 远程调试',
  'ui.install.cliStep4Desc': '在 Chrome 中打开 chrome://inspect/#remote-debugging，勾选「允许远程调试」。',
  'ui.install.faqHeading': '常见问题',
  'ui.install.faq1Q': 'DASH Collector 是什么？',
  'ui.install.faq1A': 'DASH Collector 是一个桌面应用，内置浏览器窗口帮你登录创作者中心并采集数据，无需配置终端或安装额外依赖。',
  'ui.install.faq2Q': '数据会上传到任何服务器吗？',
  'ui.install.faq2A': '不会。所有数据处理都在你的本地设备上进行。DashPersona 是一个纯本地的分析工具，不会向外部服务器发送任何数据。',
  'ui.install.faq3Q': '支持 Windows 吗？',
  'ui.install.faq3A': '是的，DASH Collector 支持 macOS、Windows 和 Linux。',
  'ui.install.faq4Q': '遇到问题该怎么办？',
  'ui.install.faq4A': '请查看 GitHub 仓库的 Issues 页面，或在那里提交新问题。我们会尽快回复。',

  // ===========================================================================
  // 引导
  // ===========================================================================
  'ui.onboarding.step': '第 {step} 步，共 2 步',
  'ui.onboarding.connectAccounts': '关联你的账号',
  'ui.onboarding.connectDesc': '导入数据文件或粘贴 TikTok 主页链接以开始。',
  'ui.onboarding.importFiles': '导入文件',
  'ui.onboarding.pasteUrl': '粘贴链接',
  'ui.onboarding.autoCollect': '自动采集',
  'ui.onboarding.exportGuideTitle': '如何从创作者中心导出数据',
  'ui.onboarding.douyinExport': '抖音',
  'ui.onboarding.douyinStep1': '1. 数据中心 \u2192 账号概览 \u2192 选择「近30天」\u2192 点击各指标标签 \u2192 导出数据',
  'ui.onboarding.douyinStep2': '2. 数据中心 \u2192 内容分析 \u2192 作品列表 \u2192 点击日历图标 \u2192 选择「全部」(最大范围) \u2192 导出数据',
  'ui.onboarding.tiktokExport': 'TikTok',
  'ui.onboarding.tiktokStep1': '1. 概览标签 \u2192 下载数据（365天播放、点赞、评论）',
  'ui.onboarding.tiktokStep2': '2. 内容标签 \u2192 下载数据（单视频指标）',
  'ui.onboarding.tiktokStep3': '3. 粉丝标签 \u2192 下载数据（粉丝历史、人口统计、地区）',
  'ui.onboarding.tiktokStep4': '4. 观众标签 \u2192 下载数据（观众趋势）',
  'ui.onboarding.redNoteExport': '小红书',
  'ui.onboarding.redNoteStep': '打开 creator.xiaohongshu.com \u2192 数据看板 \u2192 导出数据',
  'ui.onboarding.exportMoreData': '尽可能多地导出数据 \u2014 数据越多，分析越精准。选择可用的最大日期范围以获得最佳效果。',
  'ui.onboarding.mergePreview': '合并预览',
  'ui.onboarding.postsCount': '{count} 条作品',
  'ui.onboarding.dailySnapshots': '{count} 天快照',
  'ui.onboarding.readyToAnalyze': '准备分析',
  'ui.onboarding.tiktokSupported': 'TikTok 支持通过链接粘贴。抖音请安装 Data Passport 浏览器扩展，一键采集数据。小红书支持即将上线。',
  'ui.onboarding.profileUrl': '主页链接 {index}',
  'ui.onboarding.douyinRedNoteNotSupported': '检测到抖音和小红书链接，但暂不支持实时采集。请使用 TikTok 链接或尝试演示数据。',
  'ui.onboarding.addPlatform': '+ 添加另一个平台',
  'ui.onboarding.skipDemo': '跳过 \u2014 使用演示数据',
  'ui.onboarding.useExtension': '使用扩展（抖音）',
  'ui.onboarding.benchmarkTitle': '基准对比',
  'ui.onboarding.benchmarkDesc': '将你的账号与竞品或标杆创作者对比，发现差距与机会。',
  'ui.onboarding.benchmarkNotAvailable': '基准对比功能尚未上线。该功能需要同时采集你的账号和对标账号的实时数据，目前仅支持 TikTok 快照。完整基准对比已在路线图中。',

  // ===========================================================================
  // 升级横幅
  // ===========================================================================
  'ui.banner.unlockFull': '解锁完整分析',
  'ui.banner.installCli': '安装 CLI 工具，从创作者中心采集实时数据。',
  'ui.banner.viewingDemo': '你正在查看演示数据',
  'ui.banner.demoDesc': '网页版使用模拟数据预览。安装 CLI 工具可从创作者中心（抖音、TikTok、小红书）采集真实数据，获得精准的人设分析。',
  'ui.banner.viewInstallGuide': '查看安装指南 \u2192',

  // ===========================================================================
  // 组件 — 为你推荐卡片
  // ===========================================================================
  'ui.components.loadingInsights': '正在加载个性化洞察...',
  'ui.components.topPost': '{platform} 热门作品',
  'ui.components.topPostDetail': '你在{platform}上播放量最高的作品有 {views} 次播放。点击探索规律。',
  'ui.components.personaDeepDive': '人设深度分析',
  'ui.components.personaDeepDiveDetail': '你经常查看人设评分。前往人设页面查看详细分解和标签分析。',
  'ui.components.dayGrowthTrend': '{days} 天增长趋势',
  'ui.components.dayGrowthTrendDetail': '你偏好 {days} 天视图。该时段的增长趋势可在增长模块查看。',
  'ui.components.contentFilterApplied': '已应用内容筛选',
  'ui.components.contentFilterDetail': '你已隐藏 {count} 个内容类型。日历视图已相应调整。',
  'ui.components.powerUser': '深度用户',
  'ui.components.powerUserDetail': '你浏览了多个仪表盘模块。可查看跨平台对比获取全局视角。',
  'ui.components.exploreData': '探索你的数据',
  'ui.components.exploreDataDetail': '在仪表盘中点击浏览以个性化此模块。你的交互行为会塑造这里展示的洞察。',
  'ui.components.crossPlatformView': '跨平台视角',
  'ui.components.crossPlatformViewDetail': '对比你在抖音、TikTok 和小红书上的表现，找到你最强的平台。',
  'ui.components.contentCalendarInsight': '内容日历',
  'ui.components.contentCalendarInsightDetail': '查看内容日历，获取基于互动规律的无 AI 发布建议。',

  // ===========================================================================
  // 组件 — 赛道识别卡片
  // ===========================================================================
  'ui.components.confidence': '置信度',
  'ui.components.relatedCategories': '相关类别',

  // ===========================================================================
  // 组件 — 仪表盘交互
  // ===========================================================================
  'ui.components.browseAllPosts': '浏览全部作品（{count}）',
  'ui.components.collectNow': '立即采集',
  'ui.components.collecting': '采集中...',
  'ui.components.relatedPosts': '相关作品（{count}）',
  'ui.components.postsTitle': '作品',
  'ui.components.postsCount': '作品（{count}）',
  'ui.components.viewPosts': '查看作品（{count}）',

  // ===========================================================================
  // 组件 — 增长迷你图
  // ===========================================================================
  'ui.components.followersTooltip': '粉丝：{count}',

  // ===========================================================================
  // 组件 — 策略建议
  // ===========================================================================
  'ui.components.noStrategySuggestions': '暂无策略建议。添加更多数据以解锁个性化推荐。',

  // ===========================================================================
  // 组件 — 作品抽屉
  // ===========================================================================
  'ui.components.closePanel': '关闭面板',
  'ui.components.noPosts': '暂无作品。',
  'ui.components.showingPosts': '显示 {visible} / {total} \u2014 下滑加载更多',
  'ui.components.sortViews': '播放',
  'ui.components.sortLikes': '点赞',
  'ui.components.sortDate': '日期',
  'ui.components.metricViews': '播放',
  'ui.components.metricLikes': '点赞',
  'ui.components.metricComments': '评论',
  'ui.components.metricShares': '转发',
  'ui.components.metricSaves': '收藏',

  // ===========================================================================
  // 组件 — 增长趋势图
  // ===========================================================================
  'ui.components.followers': '粉丝',
  'ui.components.totalLikes': '总点赞',
  'ui.components.videos': '视频',
  'ui.components.startTracking': '开始追踪以查看趋势',
  'ui.components.startTrackingDesc': '多次采集数据后，增长历史快照将在此展示。',
  'ui.components.needTwoDataPoints': '需要至少 2 个数据点才能绘制趋势线',

  // ===========================================================================
  // 组件 — 文件拖放区
  // ===========================================================================
  'ui.components.dropFilesHere': '将文件拖放到此处',
  'ui.components.dragOrBrowse': '拖放文件到此处或点击浏览',
  'ui.components.fileFormats': 'JSON、CSV、XLSX \u2014 支持多文件，每个最大 10 MB',

  // ===========================================================================
  // 组件 — 导出按钮
  // ===========================================================================
  'ui.components.export': '导出',
  'ui.components.exporting': '导出中',
  'ui.components.exportPng': '导出为 PNG',
  'ui.components.exportPdf': '导出为 PDF',
  'ui.components.exportCsv': '导出为 CSV',

  // ===========================================================================
  // 组件 — 基准对比卡片
  // ===========================================================================
  'ui.components.vsBenchmark': '对比 {niche} 平均值',

  // ===========================================================================
  // 组件 — 浏览器采集状态
  // ===========================================================================
  'ui.components.userIdRequired': '需要用户 ID',
  'ui.components.profileUrlRequired': '需要主页链接',
  'ui.components.comingSoon': '即将上线',
  'ui.components.enterIdentifier': '输入标识符',
  'ui.components.collect': '采集',
  'ui.components.connectingBrowser': '正在连接浏览器...',
  'ui.components.collectingData': '正在采集创作者数据...',
  'ui.components.collectionComplete': '采集完成',
  'ui.components.collectionFailed': '采集失败',
  'ui.components.browserCollectInfo': '通过你的真实浏览器和已有登录会话采集数据。采集前请确保已登录目标平台。',

  // ===========================================================================
  // 组件 — 实时仪表盘包装器
  // ===========================================================================
  'ui.components.liveData': '实时数据',
  'ui.components.demoModeFallback': '演示模式（实时获取失败）',
  'ui.components.showingDemo': '显示演示数据',
  'ui.components.snapshotNote': '当前仅显示快照数据。启用持续数据采集后将提供增长历史和趋势追踪。',

  // ===========================================================================
  // 组件 — 实验表单
  // ===========================================================================
  'ui.components.experimentForm': '实验表单',
  'ui.components.experimentDetails': '实验详情',
  'ui.components.expTitle': '标题',
  'ui.components.expTitlePlaceholder': '例如：教程内容深耕',
  'ui.components.expHypothesis': '假设',
  'ui.components.expHypothesisPlaceholder': '如果我们将教程内容从 10% 提升到 25%...',
  'ui.components.expSeries': '系列',
  'ui.components.expSeriesPlaceholder': '例如：content-mix, hook-style',
  'ui.components.expParentNode': '父节点',
  'ui.components.expNoneRoot': '无（根节点）',
  'ui.components.expStatus': '状态',
  'ui.components.expPlanned': '计划中',
  'ui.components.expRunning': '运行中',
  'ui.components.createExperiment': '创建实验',
  'ui.components.updateExperiment': '更新实验',

  // ===========================================================================
  // 引导 — 文件导入模式 Schema 类型标签
  // ===========================================================================
  'ui.onboarding.schemaPostList': '作品列表',
  'ui.onboarding.schemaPostAnalysis': '投稿分析',
  'ui.onboarding.schemaAggregate': '投稿汇总',
  'ui.onboarding.schemaTimeseries': '时间序列',
  'ui.onboarding.schemaGeneric': '通用数据',
  'ui.onboarding.profileUrls': '主页链接',
  'ui.onboarding.removeUrl': '删除链接 {index}',

  // ===========================================================================
  // 组件 — CDP 设置指南
  // ===========================================================================
  'ui.components.cdpReadsCreatorCenter': '从创作者中心读取 \u2014 无需链接',
  'ui.components.cdpReadsTikTokStudio': '从 TikTok Studio 读取 \u2014 无需链接',
  'ui.components.cdpProxyNotRunning': 'DASH Collector 未连接',
  'ui.components.cdpNotLoggedIn': '未登录到平台',
  'ui.components.cdpTimeout': '采集超时',
  'ui.components.cdpParseError': '无法读取页面数据',
  // Step indicator
  'ui.components.cdpCollectorRecommend': '推荐：使用 DASH Collector 桌面应用',
  'ui.components.cdpCollectorRecommendDesc': '下载 DASH Collector，一键完成登录和数据采集，无需手动配置终端环境。',
  'ui.components.cdpCollectorRecommendLink': '前往下载 DASH Collector',
  'ui.components.cdpManualSetupTitle': '或者，手动配置：',
  'ui.components.cdpStepSetup': '设置',
  'ui.components.cdpStepLogin': '登录',
  'ui.components.cdpStepCollect': '采集',
  'ui.components.cdpStepDone': '完成',
  // Setup instructions
  'ui.components.cdpStep1Header': '第 1 步 \u2014 开启 Chrome 远程调试',
  'ui.components.cdpStep1_1': '在 Chrome 浏览器中打开',
  'ui.components.cdpStep1_1_suffix': '。',
  'ui.components.cdpStep1_2_pre': '勾选',
  'ui.components.cdpStep1_2_strong': '\u201c允许为此浏览器实例启用远程调试\u201d',
  'ui.components.cdpStep1_2_suffix': '。',
  'ui.components.cdpStep2Header': '第 2 步 — 启动 CDP 代理（手动方式）',
  'ui.components.cdpStep2Desc': '如果未使用 DASH Collector，在终端中运行以下命令：',
  'ui.components.cdpRecheckBtn': '重新检测连接',
  'ui.components.cdpChecking': '检测中...',
  // Troubleshoot
  'ui.components.cdpTroubleshoot': '故障排查',
  'ui.components.cdpHowToFix': '如何修复',
  // Troubleshoot step 1 items
  'ui.components.cdpTs1_1': '"找不到页面？" \u2014 请确保使用的是 Google Chrome（不是 Safari 或 Firefox）',
  'ui.components.cdpTs1_2': '"没有看到复选框？" \u2014 向下滚动，可能在折叠区域以下',
  'ui.components.cdpTs1_3': '"仍然无效？" \u2014 完全重启 Chrome 后再试',
  // Troubleshoot step 2 items
  'ui.components.cdpTs2_1': '"找不到 node"？\u2014 从 nodejs.org 安装 Node.js（22+ 版本）',
  'ui.components.cdpTs2_2': '"端口已占用？" \u2014 可能有其他代理在运行，这是正常的',
  'ui.components.cdpTs2_3': '"Chrome 认证弹窗？" \u2014 在 Chrome 中点击"允许"',
  // Error recovery
  'ui.components.cdpErrProxyTitle': 'DASH Collector 未连接',
  'ui.components.cdpErrProxy1': '打开终端',
  'ui.components.cdpErrProxy3': '等待出现 "proxy: ready" 消息',
  'ui.components.cdpErrProxy4': '回到此处并重试',
  'ui.components.cdpErrLoginTitle': '未登录到平台',
  'ui.components.cdpErrLogin1': '在 Chrome 浏览器中打开平台网站',
  'ui.components.cdpErrLogin2': '用账号密码登录',
  'ui.components.cdpErrLogin3': '回到此处并再次点击采集',
  'ui.components.cdpErrTimeoutTitle': '采集超时',
  'ui.components.cdpErrTimeout1': '页面加载可能较慢',
  'ui.components.cdpErrTimeout2': '请确保网络连接稳定',
  'ui.components.cdpErrTimeout3': '重试 \u2014 通常第二次会成功',
  'ui.components.cdpErrParseTitle': '无法读取页面数据',
  'ui.components.cdpErrParse1': '平台页面结构可能已更新',
  'ui.components.cdpErrParse2': '请先在 Chrome 中刷新平台页面',
  'ui.components.cdpErrParse3': '如果问题持续，请稍后再试',
  // Login check panel
  'ui.components.cdpVerifyLogins': '验证平台登录状态',
  'ui.components.cdpLoginDesc': '数据采集依赖你已有的浏览器会话。请确保已登录每个需要采集的平台。',
  'ui.components.cdpCheckLoginBtn': '检测登录',
  'ui.components.cdpLoginReady': '已就绪',
  'ui.components.cdpLoginAs': '已登录为 {username}',
  'ui.components.cdpOpenInChrome': '在 Chrome 中打开',
  'ui.components.cdpOpenAndLogin': '并登录',
  'ui.components.cdpSkipLoginNote': '如果你想手动验证可以跳过。采集时若遇到登录错误，随时可以重试。',
  // Copy button
  'ui.components.cdpCopy': '复制',
  'ui.components.cdpCopied': '已复制',
  'ui.components.cdpCopyAriaDefault': '复制命令',
  'ui.components.cdpCopyAriaCopied': '已复制',
  // Collect panel
  'ui.components.cdpNotVerified': '未验证',
  'ui.components.cdpCollecting': '采集中...',
  'ui.components.cdpFailed': '失败',
  'ui.components.cdpRecollect': '重新采集',
  'ui.components.cdpCollect': '采集',
  'ui.components.cdpCollectAll': '采集所有已验证平台',
  'ui.components.cdpCollectPanelNote': '可逐个采集各平台，也可一键全部采集。至少完成一个平台的采集后即可启动仪表盘。',
  'ui.components.cdpPostsCount': '{count} 条作品',
  // Phase status bars
  'ui.components.cdpCheckingProxy': '正在检测 DASH Collector 连接...',
  'ui.components.cdpProxyNotRunningStatus': 'DASH Collector 未连接',
  'ui.components.cdpProxyNotRunningSub': '请启动 DASH Collector 桌面应用，或按以下步骤手动配置。',
  'ui.components.cdpProxyConnected': 'DASH Collector 已连接',
  'ui.components.cdpVerifyLoginsSub': '采集前请先验证平台登录状态。',
  'ui.components.cdpReadyToCollect': 'DASH Collector 已连接',
  'ui.components.cdpReadyToCollectSub': '选择平台并开始采集数据。',
  // Platform status dot labels
  'ui.components.cdpStatusIdle': '空闲',
  'ui.components.cdpStatusCollecting': '采集中',
  'ui.components.cdpStatusDone': '已完成',
  'ui.components.cdpStatusError': '错误',
  // Login dot labels
  'ui.components.cdpLoginDotLoggedIn': '已登录',
  'ui.components.cdpLoginDotNotLoggedIn': '未登录',
  'ui.components.cdpLoginDotUnknown': '状态未知',
  // Done panel
  'ui.components.cdpCollectionComplete': '采集完成',
  'ui.components.cdpCollectionSummary': '共 {posts} 条作品，来自 {platforms} 个平台',
  'ui.components.cdpRetryFailed': '重试失败项',
  'ui.components.cdpNeedOneCollection': '至少需要一个平台成功采集后才能启动仪表盘。',

  // ===========================================================================
  // 组件 — 扩展数据加载 / 粉丝画像
  // ===========================================================================
  'ui.components.fanPortrait': '粉丝画像',
  'ui.components.gender': '性别',
  'ui.components.male': '男性',
  'ui.components.female': '女性',
  'ui.components.ageGroups': '年龄分布',
  'ui.components.interests': '兴趣偏好',
  'ui.components.topRegions': '地区分布',

  // ===========================================================================
  // 增长势头标签
  // ===========================================================================
  'momentum.accelerating': '加速中',
  'momentum.steady': '稳定',
  'momentum.decelerating': '减速中',
  'momentum.insufficient_data': '数据不足',

  // ===========================================================================
  // 引擎 — 内容类别（persona.ts 中的 31 个类别）
  // ===========================================================================
  'engine.category.tutorial': '教程',
  'engine.category.daily': '日常',
  'engine.category.review': '种草',
  'engine.category.entertainment': '娱乐',
  'engine.category.story': '剧情',
  'engine.category.emotion': '情感',
  'engine.category.food': '美食',
  'engine.category.fitness': '健身',
  'engine.category.travel': '旅行',
  'engine.category.fashion': '穿搭',
  'engine.category.beauty': '美妆',
  'engine.category.tech': '科技',
  'engine.category.knowledge': '知识',
  'engine.category.music': '音乐',
  'engine.category.dance': '舞蹈',
  'engine.category.pet': '宠物',
  'engine.category.photography': '摄影',
  'engine.category.parenting': '育儿',
  'engine.category.diy': '手工',
  'engine.category.finance': '理财',
  'engine.category.gaming': '游戏',
  'engine.category.car': '汽车',
  'engine.category.home': '家居',
  'engine.category.book': '读书',
  'engine.category.health': '健康',
  'engine.category.art': '绘画',
  'engine.category.outdoor': '户外',
  'engine.category.couple': '情侣',
  'engine.category.workplace': '职场',
  'engine.category.language': '外语',
  'engine.category.comedy_skit': '脱口秀',
  'engine.category.uncategorised': '未分类',

  // ===========================================================================
  // 引擎 — 赛道标签（benchmark-data.ts 中的 10 个赛道）
  // ===========================================================================
  'engine.niche.tutorial': '教程与教育',
  'engine.niche.entertainment': '娱乐',
  'engine.niche.food': '美食与烹饪',
  'engine.niche.fitness': '健身与健康',
  'engine.niche.beauty': '美妆与护肤',
  'engine.niche.tech': '科技与数码',
  'engine.niche.travel': '旅行与户外',
  'engine.niche.fashion': '时尚与穿搭',
  'engine.niche.lifestyle': '生活方式',
  'engine.niche.gaming': '游戏',

  // ===========================================================================
  // 引擎 — 人设标签（persona.ts 650-770 行）
  // ===========================================================================
  'engine.tags.specialist': '{category}专家',
  'engine.tags.highEngagement': '高互动',
  'engine.tags.engagementRising': '互动上升',
  'engine.tags.engagementDeclining': '互动下降',
  'engine.tags.consistentIdentity': '稳定人设',
  'engine.tags.contentExplorer': '内容探索者',
  'engine.tags.prolificPublisher': '高产创作者',
  'engine.tags.clockworkRhythm': '精准节奏',
  'engine.tags.growthRocket': '增长飞速',
  'engine.tags.plateauAlert': '增长停滞',
  'engine.tags.viralPotential': '爆款潜力',

  // ===========================================================================
  // 引擎 — 策略建议（strategy.ts）
  // ===========================================================================
  'engine.strategy.contentMixTitle': '向{category}内容倾斜',
  'engine.strategy.contentMixDesc': '你的{category}作品互动率是发布最多的类别（{mostPosted}）的 {ratio} 倍。考虑增加{category}内容占比，减少效果较差的类别。',
  'engine.strategy.rhythmTitle': '建立稳定的发布节奏',
  'engine.strategy.rhythmDesc': '你的发布一致性评分为 {score}/100，说明发布间隔不规律。大多数平台的算法偏好可预测的创作者。历史数据表明{bestDay} {bestHour} UTC 左右可能是你的最佳发布时段。试着固定发布节奏（例如每 {interval} 天）。',
  'engine.strategy.crossPlatformTitle': '将 {platform} 策略应用到其他平台',
  'engine.strategy.crossPlatformDesc': '{insight}。分析你的内容在 {platform} 上引起共鸣的原因 \u2014 格式、时长、钩子、时间 \u2014 然后在较弱的平台上测试这些模式。',
  'engine.strategy.engagementDeclineTitle': '扭转互动下降趋势',
  'engine.strategy.engagementDeclineDesc': '你的互动率呈下降趋势（新旧作品对比偏移 {trend}pp）。这可能表明观众对当前形式产生了疲劳。考虑尝试新的内容形式、更强的开头钩子或直接号召行动。',
  'engine.strategy.growthPlateauTitle': '突破增长瓶颈',
  'engine.strategy.growthPlateauDesc': '你的粉丝增长正在减速（追踪期内 {rate}%）。考虑与相邻赛道的创作者合作、利用热门格式，或推出鼓励收藏和分享的系列内容以提升算法分发。',

  // ===========================================================================
  // 引擎 — 解释因素（explain.ts）
  // ===========================================================================
  'engine.explain.overallRate': '总体互动率',
  'engine.explain.medianRate': '中位数互动率',
  'engine.explain.trend': '趋势',
  'engine.explain.postsPerWeek': '每周发布量',
  'engine.explain.consistency': '一致性',
  'engine.explain.meanInterval': '平均间隔',
  'engine.explain.cosineSimilarity': '余弦相似度',
  'engine.explain.dominant': '主导：{category}',
  'engine.explain.followerGrowthRate': '粉丝增长率',
  'engine.explain.momentum': '增长势头',
  'engine.explain.dataPoints': '数据点',
  'engine.explain.bestCategory': '最佳类别：{category}',
  'engine.explain.postCount': '作品数量',
  'engine.explain.overallEngagement': '总体互动',
  'engine.explain.followers': '粉丝',
  'engine.explain.likes': '点赞',
  'engine.explain.views': '播放',
  'engine.explain.engagement': '互动',
  'engine.explain.retention': '留存',
  'engine.explain.growth': '增长',

  // ===========================================================================
  // 引擎 — 创意生成器（idea-generator.ts）
  // ===========================================================================
  'engine.ideas.contentGapTitle': '增加{category}内容',
  'engine.ideas.contentGapHypothesis': '如果将{category}内容从 {currentPct}% 提升到 {suggestedPct}%，根据当前各类别表现，互动率预计提升约 {engMult} 倍。',
  'engine.ideas.contentGapRationale': '{category}的互动率为 {rate}%（高于平均 {engMult} 倍），但仅占作品的 {currentPct}%。',
  'engine.ideas.crossPlatformTitle': '在{platform}上测试{category}',
  'engine.ideas.crossPlatformHypothesis': '{category}内容在{bestPlatform}上的互动率是{worstPlatform}的 {ratio} 倍。针对{worstPlatform}的受众调整格式可以缩小差距。',
  'engine.ideas.rhythmTitle': '优化发布时间',
  'engine.ideas.rhythmHypothesis': '你的最佳互动窗口是周{bestDay} {bestHour}:00 UTC 左右，但只有 {usagePct}% 的作品在该时段发布。在此时段安排更多作品可提升曝光。',
  'engine.ideas.personaDriftTitle': '重新聚焦内容定位',
  'engine.ideas.personaDriftHypothesis': '人设一致性为 {score}/100。重新聚焦{category}（当前占 {pct}%）并减少主题分散，可增强观众留存。',
  'engine.ideas.viralTitle': '复制{category}爆款',
  'engine.ideas.viralHypothesis': '一条{category}作品达到了平均播放的 {multiple} 倍。复制其特征（格式、时长、钩子风格）推出 3-5 条类似作品，可能获得相似的流量爆发。',

  // ===========================================================================
  // 引擎 — 对比器洞察（comparator.ts）
  // ===========================================================================
  'engine.compare.engagementGap': '你的内容在{topPlatform}上的互动率是{bottomPlatform}的 {ratio} 倍',
  'engine.compare.audienceSize': '你在{topPlatform}上的受众是{bottomPlatform}的 {ratio} 倍',
  'engine.compare.bestContent': '你的{category}内容在{bestPlatform}上的互动率是{worstPlatform}的 {ratio} 倍',
  'engine.compare.contentDistribution': '{category}内容占你{platformA}的 {pct}%，但在{platformB}几乎没有',

  // ===========================================================================
  // 引擎 — 人设树标签（persona-tree.ts）
  // ===========================================================================
  'engine.tree.baselineStrategy': '基线策略',
  'engine.tree.baselineHypothesis': '当前内容构成是受众增长的最优起点。',
  'engine.tree.variantA': '变体 A',
  'engine.tree.variantB': '变体 B',
  'engine.tree.focusExperiment': '{category}专注实验',
  'engine.tree.focusHypothesis': '加大{category}内容投入将提升互动和留存。',
  'engine.tree.pivotTest': '{category}转向测试',
  'engine.tree.pivotHypothesis': '转向{category}内容可能打开新的受众群体。',
  'engine.tree.adoptedBaseline': '已采纳为基线',
  'engine.tree.adoptedBaselineReason': '为后续所有内容实验建立对照组。',
  'engine.tree.adopted': '已采纳',
  'engine.tree.adoptedReason': '{category}内容展现出最强的受众共鸣。',
  'engine.tree.discarded': '已放弃',
  'engine.tree.discardedReason': '{category}内容表现不及核心内容组合，指标低于阈值。',
  'engine.tree.discardedDetail': '互动和留存评分均偏低。',
  'engine.tree.highFrequencyDesc': '高频{category}作品',
  'engine.tree.mixedDesc': '{category}与其他主题混合',
  'engine.tree.pureDesc': '纯{category}内容方向',
  'engine.tree.originalMixDesc': '所有类别的原始内容组合',

  // ===========================================================================
  // 引擎 — 内容排期（content-planner.ts）
  // ===========================================================================
  'engine.planner.dayNames.0': '周日',
  'engine.planner.dayNames.1': '周一',
  'engine.planner.dayNames.2': '周二',
  'engine.planner.dayNames.3': '周三',
  'engine.planner.dayNames.4': '周四',
  'engine.planner.dayNames.5': '周五',
  'engine.planner.dayNames.6': '周六',
  'engine.planner.timeSlot.morning': '上午',
  'engine.planner.timeSlot.afternoon': '下午',
  'engine.planner.timeSlot.evening': '晚间',
  'engine.planner.reasoning': '{type}内容在{platform}上的互动率为 {engRate}（平均 {avgRate}）。{day}{timeSlot}是你的高峰时段。',
  'engine.planner.reasoningGap': '近 30 天你仅发布了 {count} 条{type}作品 \u2014 仍有增长空间。',

  // ===========================================================================
  // 引擎 — 基准对比（benchmark.ts）
  // ===========================================================================
  'engine.benchmark.followers': '粉丝',
  'engine.benchmark.engagementRate': '互动率',
  'engine.benchmark.postCount': '作品数',
  'engine.benchmark.noBenchmarks': '暂无可用的基准数据进行对比。',
  'engine.benchmark.outperforming': '所有指标均超过基准（{metrics}）。',
  'engine.benchmark.belowAll': '所有指标均低于基准平均值（{metrics}）。建议优先改善差距最大的领域。',
  'engine.benchmark.mixed': '{above}高于基准；{below}低于基准。',
  'engine.benchmark.atAverage': '所有对比指标均处于基准平均水平。',

  // ===========================================================================
  // 引擎 — 内容分析器钩子类型（content-analyzer.ts）
  // ===========================================================================
  'engine.analyzer.questionHook': '提问式钩子',
  'engine.analyzer.numberHook': '数字式钩子',
  'engine.analyzer.contrastHook': '对比式钩子',
  'engine.analyzer.emotionalHook': '情感式钩子',
  'engine.analyzer.challengeHook': '挑战式钩子',
  'engine.analyzer.storyHook': '故事式钩子',
  'engine.analyzer.nicheHeavy': '偏向垂直领域标签',
  'engine.analyzer.broadHeavy': '偏向泛流量标签',
  'engine.analyzer.balanced': '垂直与泛流量标签混合',
  'engine.analyzer.trendingHeavy': '集中在少数热门标签',

  // ===========================================================================
  // 引擎 — 下一条内容（next-content.ts）
  // ===========================================================================
  'engine.nextContent.dayNames.0': '周日',
  'engine.nextContent.dayNames.1': '周一',
  'engine.nextContent.dayNames.2': '周二',
  'engine.nextContent.dayNames.3': '周三',
  'engine.nextContent.dayNames.4': '周四',
  'engine.nextContent.dayNames.5': '周五',
  'engine.nextContent.dayNames.6': '周六',
  'engine.nextContent.timingPersonal': '基于你的历史发布数据：你的最佳互动窗口是{day} {hour}:00 UTC。',
  'engine.nextContent.timingPlatform': '基于{platform}平台整体高峰时段（{hours} UTC）。暂无个人节奏数据。',

  // ===========================================================================
  // 雷达图维度标签
  // ===========================================================================
  'engine.radar.followers': '粉丝',
  'engine.radar.engagement': '互动',
  'engine.radar.posts': '作品',
  'engine.radar.views': '播放',
  'engine.radar.totalEngagement': '总互动',

  // ===========================================================================
  // 优先级标签
  // ===========================================================================
  'priority.high': '高',
  'priority.medium': '中',
  'priority.low': '低',

  // ===========================================================================
  // 组件 — 平台对比卡片
  // ===========================================================================
  'ui.components.topContent': '热门内容',
  'ui.components.rangeAll': '全部',

  // ===========================================================================
  // 组件 — 实时采集器
  // ===========================================================================
  'ui.components.fetchingLive': '正在从 TikTok 获取实时数据…可能需要几秒钟。',
  'ui.components.liveCollectionFailed': '实时采集失败',
  'ui.components.fallingBackDemo': '正在回退到演示数据…',
  'ui.components.liveDataCollected': '已为 @{userId} 采集实时数据',
  'ui.components.errorTimedOut': 'TikTok 响应超时，可能是限流导致。',
  'ui.components.errorNotAllowed': '不支持该链接，请使用 TikTok 主页链接。',
  'ui.components.errorCouldNotFind': '无法提取主页数据，该页面可能为私密或受地区限制。',
  'ui.components.errorInvalidResponse': '服务器返回了无效响应，请重试。',
  'ui.components.errorNoProfile': '未返回主页数据',
  'ui.components.errorNetwork': '网络错误',

  // ===========================================================================
  // Pipeline 可视化
  // ===========================================================================
  'ui.pipeline.title': '算法流水线',
  'ui.pipeline.subtitle': 'DashPersona 处理架构 — 确定性算法，零 AI',
  'ui.landing.howItWorks': '工作原理',
  'ui.landing.pipelineDesc': '你的数据流经确定性分析流水线 — 无 AI，无黑箱。每一项洞察都可追溯至具体算法。',

  // Pipeline 节点 — 数据源
  'pipeline.in-douyin.label': '抖音主页链接',
  'pipeline.in-douyin.desc': '中国短视频平台',
  'pipeline.in-tiktok.label': 'TikTok 主页链接',
  'pipeline.in-tiktok.desc': '全球短视频平台',
  'pipeline.in-xhs.label': '小红书主页链接',
  'pipeline.in-xhs.desc': '生活方式分享平台',
  'pipeline.in-manual.label': '手动导入',
  'pipeline.in-manual.desc': '上传你的数据文件',

  // Pipeline 节点 — 数据验证
  'pipeline.schema.label': '数据验证',
  'pipeline.schema.desc': '验证并标准化所有输入数据',

  // Pipeline 节点 — 适配器
  'pipeline.adapter-demo.label': '演示数据',
  'pipeline.adapter-demo.desc': '内置示例数据集',
  'pipeline.adapter-html.label': '主页抓取',
  'pipeline.adapter-html.desc': '从公开页面提取数据',
  'pipeline.adapter-manual.label': '文件导入',
  'pipeline.adapter-manual.desc': '解析上传的 JSON/CSV 文件',

  // Pipeline 节点 — 分析引擎
  'pipeline.eng-growth.label': '增长分析',
  'pipeline.eng-growth.desc': '增量计算、趋势图、变化追踪',
  'pipeline.eng-persona.label': '人设评分',
  'pipeline.eng-persona.desc': '内容构成、互动、节奏、一致性',
  'pipeline.eng-comparator.label': '跨平台对比',
  'pipeline.eng-comparator.desc': '跨平台统一指标',
  'pipeline.eng-benchmark.label': '基准分析',
  'pipeline.eng-benchmark.desc': '与参考创作者对比',
  'pipeline.eng-strategy.label': '策略引擎',
  'pipeline.eng-strategy.desc': '基于规则的内容建议',
  'pipeline.eng-explain.label': '分数解释',
  'pipeline.eng-explain.desc': '可读的分数拆解',
  'pipeline.eng-planner.label': '内容规划',
  'pipeline.eng-planner.desc': '最优发布时间表',
  'pipeline.eng-tree.label': '人设时间线',
  'pipeline.eng-tree.desc': '实验决策树',
  'pipeline.eng-ideas.label': '灵感生成',
  'pipeline.eng-ideas.desc': '数据驱动的实验建议',

  // Pipeline 节点 — 输出视图
  'pipeline.out-dashboard.label': '仪表盘',
  'pipeline.out-dashboard.desc': '增长概览 + 核心指标',
  'pipeline.out-persona.label': '人设详情',
  'pipeline.out-persona.desc': '维度拆解 + 标签',
  'pipeline.out-calendar.label': '内容日历',
  'pipeline.out-calendar.desc': '发布时间表',
  'pipeline.out-timeline.label': '人设时间线',
  'pipeline.out-timeline.desc': '实验决策树',
  'pipeline.out-compare.label': '跨平台对比',
  'pipeline.out-compare.desc': '并排分析',

  // Pipeline 类别标签
  'pipeline.category.input': '数据来源',
  'pipeline.category.schema': '数据验证',
  'pipeline.category.adapter': '适配器',
  'pipeline.category.engine': '分析引擎',
  'pipeline.category.output': '输出视图',

  // ===========================================================================
  // 数据画像
  // ===========================================================================
  'ui.portrait.title': '数据画像',
  'ui.portrait.creatorId': '创作者 ID',
  'ui.portrait.performanceMatrix': '表现矩阵',
  'ui.portrait.trend30d': '30天趋势',
  'ui.portrait.tags': '标签',
  'ui.portrait.copyText': '复制文本',
  'ui.portrait.exportPng': '导出 PNG',
  'ui.portrait.copied': '已复制到剪贴板',
  'ui.portrait.exported': 'PNG 已保存',
  'ui.portrait.noData': '请先导入创作者数据',
  'ui.portrait.hover': '悬停查看指标详情',

  // ===========================================================================
  // 全局错误和未找到页面
  // ===========================================================================
  'ui.error.title': '出了点问题',
  'ui.error.description': '发生了意外错误。你可以重试或返回首页。',
  'ui.error.tryAgain': '重试',
  'ui.error.backHome': '返回首页',
  'ui.notFound.title': '页面未找到',
  'ui.notFound.description': '你访问的页面不存在或已被移动。',
  'ui.notFound.backHome': '返回首页',
  'ui.notFound.tryDemo': '试试 Demo',

  // ===========================================================================
  // 布局与无障碍
  // ===========================================================================
  'ui.a11y.skipToContent': '跳到主要内容',
  'ui.a11y.toggleToEnglish': '切换为英文',
  'ui.a11y.toggleToChinese': '切换为中文',
  'ui.a11y.loadingPipeline': '正在加载流水线可视化',

  // ===========================================================================
  // 流水线骨架标签
  // ===========================================================================
  'ui.pipeline.dataSources': '数据源',
  'ui.pipeline.adapters': '适配器',
  'ui.pipeline.analysisEngine': '分析引擎',
  'ui.pipeline.outputViews': '输出视图',

  // ===========================================================================
  // 站点导航
  // ===========================================================================
  'ui.nav.siteNavigation': '站点导航',

  // ===========================================================================
  // 扩展超时
  // ===========================================================================
  'ui.extension.waiting': '等待 Data Passport 扩展...',
  'ui.extension.waitingDesc': '请在 creator.douyin.com 上打开 Data Passport 扩展并点击「采集」按钮',
  'ui.extension.notDetected': '未检测到 Data Passport 扩展',
  'ui.extension.notDetectedDesc': '10 秒内未收到扩展数据。请确认已安装 Data Passport 扩展且在 creator.douyin.com 页面上点击了「采集」按钮。',
  'ui.extension.fallbackToDemo': '查看演示数据',
  'ui.extension.tryOtherMethod': '尝试其他导入方式',
};

export default zh;
