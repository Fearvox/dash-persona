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
  'ui.common.version': 'v0.4.0',
  'ui.common.poweredBy': '技术支持',
  'ui.common.customDigitalSystems': '定制数字系统',
  'ui.common.launchDashboard': '启动仪表盘',
  'ui.common.goToOnboarding': '前往引导',
  'ui.common.insufficientData': '数据不足',

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

  // ===========================================================================
  // 日历
  // ===========================================================================
  'ui.calendar.title': '内容日历',
  'ui.calendar.subtitle': '已分析 {dataPoints} 条作品 \u00B7 生成 {slots} 个时段',
  'ui.calendar.needMoreData': '需要更多数据',
  'ui.calendar.needMoreDataDesc': '内容日历需要至少 10 条作品才能生成有意义的排期建议。当前有 <strong>{count}</strong> 条作品。',
  'ui.calendar.keepPublishing': '继续发布作品，积累更多数据后再来查看。',

  // ===========================================================================
  // 对比
  // ===========================================================================
  'ui.compare.title': '跨平台对比',
  'ui.compare.persona': '人设：{type}',
  'ui.compare.keyMetrics': '核心指标',
  'ui.compare.radarOverview': '雷达图总览',
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
  // 组件 — CDP 设置指南
  // ===========================================================================
  'ui.components.cdpReadsCreatorCenter': '从创作者中心读取 \u2014 无需链接',
  'ui.components.cdpReadsTikTokStudio': '从 TikTok Studio 读取 \u2014 无需链接',
  'ui.components.cdpProxyNotRunning': 'CDP 代理未运行',
  'ui.components.cdpNotLoggedIn': '未登录到平台',
  'ui.components.cdpTimeout': '采集超时',
  'ui.components.cdpParseError': '无法读取页面数据',

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
};

export default zh;
