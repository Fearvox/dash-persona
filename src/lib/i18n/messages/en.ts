const en: Record<string, string> = {
  // ===========================================================================
  // Common UI
  // ===========================================================================
  'ui.common.home': 'Home',
  'ui.common.dashboard': 'Dashboard',
  'ui.common.settings': 'Settings',
  'ui.common.back': 'Back',
  'ui.common.backToDashboard': 'Dashboard',
  'ui.common.backToHome': 'DashPersona',
  'ui.common.loading': 'Loading...',
  'ui.common.loadingImported': 'Loading imported data...',
  'ui.common.daySunday': 'Sunday',
  'ui.common.dayMonday': 'Monday',
  'ui.common.dayTuesday': 'Tuesday',
  'ui.common.dayWednesday': 'Wednesday',
  'ui.common.dayThursday': 'Thursday',
  'ui.common.dayFriday': 'Friday',
  'ui.common.daySaturday': 'Saturday',
  'ui.common.viewDetails': 'View details',
  'ui.common.viewDemoInstead': 'View demo instead',
  'ui.common.demo': 'Demo',
  'ui.common.import': 'Import',
  'ui.common.importMore': 'Import more',
  'ui.common.continue': 'Continue',
  'ui.common.cancel': 'Cancel',
  'ui.common.best': 'Best',
  'ui.common.na': 'N/A',
  'ui.common.tip': 'Tip',
  'ui.common.posts': 'Posts',
  'ui.common.followers': 'followers',
  'ui.common.version': 'v0.4.0',
  'ui.common.poweredBy': 'Powered by',
  'ui.common.customDigitalSystems': 'Custom Digital Systems',
  'ui.common.launchDashboard': 'Launch Dashboard',
  'ui.common.goToOnboarding': 'Go to Onboarding',
  'ui.common.insufficientData': 'Insufficient data',

  // ===========================================================================
  // Platform labels
  // ===========================================================================
  'platform.douyin': 'Douyin',
  'platform.tiktok': 'TikTok',
  'platform.xhs': 'Red Note',

  // ===========================================================================
  // Landing — Boot Sequence
  // ===========================================================================
  'ui.landing.tagline': 'Data-Agnostic Creator Intelligence Engine',
  'ui.landing.subTagline': 'Zero AI. Pure algorithms.',
  'ui.landing.tryDemo': 'Try Demo',
  'ui.landing.getStarted': 'Get Started',
  'ui.landing.installFull': 'Install Full Version',
  'ui.landing.scrollToExplore': 'Scroll to explore',

  // ===========================================================================
  // Landing — Output Wall
  // ===========================================================================
  'ui.landing.outputViews': 'Output Views',
  'ui.landing.outputDescription': 'Every insight derived from deterministic algorithms — no AI, no black boxes.',
  'ui.landing.viewDashboard': 'Dashboard',
  'ui.landing.viewDashboardDesc': 'Growth overview, metrics, and strategy suggestions',
  'ui.landing.viewPersona': 'Persona Detail',
  'ui.landing.viewPersonaDesc': 'Dimension breakdown, tags, and scoring',
  'ui.landing.viewCalendar': 'Content Calendar',
  'ui.landing.viewCalendarDesc': 'AI-free publishing schedule',
  'ui.landing.viewTimeline': 'Persona Timeline',
  'ui.landing.viewTimelineDesc': 'Experiment decision tree',
  'ui.landing.viewCompare': 'Cross-Platform',
  'ui.landing.viewCompareDesc': 'Side-by-side platform analysis',

  // ===========================================================================
  // Dashboard
  // ===========================================================================
  'ui.dashboard.title': 'Dashboard',
  'ui.dashboard.demoDashboard': 'Demo Dashboard',
  'ui.dashboard.growthOverview': 'Growth Overview',
  'ui.dashboard.crossPlatformComparison': 'Cross-Platform Comparison',
  'ui.dashboard.strategySuggestions': 'Strategy Suggestions',
  'ui.dashboard.quickLinks': 'Quick Links',
  'ui.dashboard.personaScore': 'Persona Score',
  'ui.dashboard.contentCalendar': 'Content Calendar',
  'ui.dashboard.contentCalendarDesc': 'Schedule posts based on engagement patterns',
  'ui.dashboard.personaTimeline': 'Persona Timeline',
  'ui.dashboard.personaTimelineDesc': 'Track strategy experiments and decisions',
  'ui.dashboard.comparePlatforms': 'Compare Platforms',
  'ui.dashboard.comparePlatformsDesc': 'Side-by-side platform performance',
  'ui.dashboard.invalidProfileUrl': 'Invalid profile URL',
  'ui.dashboard.noProfileUrl': 'No profile URL provided',
  'ui.dashboard.invalidUrlMessage': 'The URL provided is not valid. Please go through the onboarding flow and paste a valid TikTok profile URL.',
  'ui.dashboard.noUrlMessage': 'To use live data collection, please go through the onboarding flow and paste your TikTok profile URL.',
  'ui.dashboard.waitingExtension': 'Waiting for extension data...',
  'ui.dashboard.extensionError': 'Extension Error',
  'ui.dashboard.extensionData': 'Extension Data',
  'ui.dashboard.noExtensionData': 'No extension data received yet. Open the Data Passport extension on creator.douyin.com and click "Collect". Using demo data as fallback.',
  'ui.dashboard.loadingImported': 'Loading imported data...',
  'ui.dashboard.runningEngines': 'Running analysis engines...',
  'ui.dashboard.enrichmentTip': 'Want more accurate analysis? Export data from your Creator Center (account metrics, post lists) and click <strong>Import more</strong> to add them. The more data you provide, the better the persona insights.',
  'ui.dashboard.enrichmentTipPre': 'Want more accurate analysis? Export data from your Creator Center (account metrics, post lists) and click\u00a0',
  'ui.dashboard.enrichmentTipPost': '\u00a0to add them. The more data you provide, the better the persona insights.',
  'ui.dashboard.forYou': 'For You',
  'ui.dashboard.nicheDetection': 'Niche Detection',
  'ui.dashboard.overallScore': 'Overall Score',
  'ui.dashboard.bestPlatform': 'Best: {platform}',

  // ===========================================================================
  // Persona Detail
  // ===========================================================================
  'ui.persona.title': 'Persona Detail',
  'ui.persona.overallPersonaScore': 'Overall Persona Score',
  'ui.persona.momentum': 'Momentum',
  'ui.persona.postsAnalysed': '{count} posts analysed',
  'ui.persona.dimensionBreakdown': 'Dimension Breakdown',
  'ui.persona.contentMix': 'Content Mix',
  'ui.persona.engagementProfile': 'Engagement Profile',
  'ui.persona.postingRhythm': 'Posting Rhythm',
  'ui.persona.personaConsistency': 'Persona Consistency',
  'ui.persona.growthHealth': 'Growth Health',
  'ui.persona.strategy': 'Strategy',
  'ui.persona.personaTags': 'Persona Tags',
  'ui.persona.contentTypeDistribution': 'Content Type Distribution',
  'ui.persona.diversityIndex': 'Diversity index: {count} categories',
  'ui.persona.avgRate': 'Avg Rate',
  'ui.persona.bestCategory': 'Best Category',
  'ui.persona.trend': 'Trend',
  'ui.persona.viralPotential': 'Viral Potential',
  'ui.persona.postsPerWeek': 'Posts / Week',
  'ui.persona.consistency': 'Consistency',
  'ui.persona.bestSlots': 'Best Slots',
  'ui.persona.stableIdentity': 'Stable topical identity',
  'ui.persona.diverseTopics': 'Diverse topic coverage',
  'ui.persona.dominant': 'Dominant',
  'ui.persona.followerGrowth': 'Follower Growth',
  'ui.persona.viewGrowth': 'View Growth',
  'ui.persona.noSuggestions': 'No urgent suggestions. Keep it up!',

  // ===========================================================================
  // Timeline
  // ===========================================================================
  'ui.timeline.title': 'Persona Timeline',
  'ui.timeline.subtitle': 'Content strategy experiments as a decision tree',
  'ui.timeline.totalNodes': 'Total Nodes',
  'ui.timeline.mainline': 'Mainline',
  'ui.timeline.branches': 'Branches',
  'ui.timeline.boundaries': 'Boundaries',
  'ui.timeline.growthHistory': 'Growth History',
  'ui.timeline.statusAdopted': 'Adopted',
  'ui.timeline.statusRunning': 'Running',
  'ui.timeline.statusDiscarded': 'Discarded',
  'ui.timeline.statusPlanned': 'Planned',
  'ui.timeline.scoringBreakdown': 'Scoring Breakdown',
  'ui.timeline.scoreEngagement': 'Engagement',
  'ui.timeline.scoreRetention': 'Retention',
  'ui.timeline.scoreGrowth': 'Growth',
  'ui.timeline.scoreComposite': 'Composite',
  'ui.timeline.scoreCompositeLabel': 'Composite',
  'ui.timeline.variants': 'Variants',
  'ui.timeline.decision': 'Decision',
  'ui.timeline.series': 'Series',
  'ui.timeline.mergedBackTo': 'Merged back to',
  'ui.timeline.rejected': 'Rejected',
  'ui.timeline.conflict': 'Conflict',
  'ui.timeline.metricConflict': 'Metric Conflict',
  'ui.timeline.metricConflictDetected': 'Metric conflict detected',
  'ui.timeline.conflictAdoptedDesc': 'This node is adopted but metric conflicts with adjacent branches were detected. Review the data.',
  'ui.timeline.conflictDiscardedDesc': 'This node is discarded with metric conflicts against the adopted node. Further investigation may be needed.',
  'ui.timeline.discard': 'Discard',
  'ui.timeline.changesSaved': 'Changes saved',
  'ui.timeline.saveFailed': 'Save failed',
  'ui.timeline.treeReset': 'Timeline reset',
  'ui.timeline.platformHint': 'This is the Persona Timeline — a decision tree for tracking content strategy experiments. Click a node to view details, add variants, or discard branches.',
  'ui.timeline.gotIt': 'Got it',
  'ui.timeline.save': 'Save',
  'ui.timeline.reset': 'Reset',
  'ui.timeline.newExperimentBtn': '+ New Experiment',
  'ui.timeline.newExperiment': 'New Experiment',
  'ui.timeline.createFromIdea': 'Create from Idea',
  'ui.timeline.experimentDetail': 'Experiment Detail',
  'ui.timeline.close': 'Close',
  'ui.timeline.experimentIdeas': 'Experiment Ideas',
  'ui.timeline.ideasCount': '{count} ideas',
  'ui.timeline.resetDialogTitle': 'Reset Timeline',
  'ui.timeline.resetDialogDesc': 'Are you sure you want to reset the timeline to its default state? All local edits will be lost.',
  'ui.timeline.keepEditing': 'Keep Editing',

  // ===========================================================================
  // Calendar
  // ===========================================================================
  'ui.calendar.title': 'Content Calendar',
  'ui.calendar.subtitle': '{dataPoints} posts analysed \u00B7 {slots} slots generated',
  'ui.calendar.needMoreData': 'Need More Data',
  'ui.calendar.needMoreDataDesc': 'The content calendar needs at least 10 posts to generate meaningful scheduling recommendations. You currently have <strong>{count}</strong> post{plural}.',
  'ui.calendar.needMoreDataPre': 'The content calendar needs at least 10 posts. You currently have',
  'ui.calendar.needMoreDataPost': 'post{plural}.',
  'ui.calendar.posts': 's',
  'ui.calendar.importMoreDesc': 'Import more data to unlock the calendar',
  'ui.calendar.keepPublishing': 'Keep publishing and check back once you have more content to analyse.',
  'ui.calendar.accept': 'Accept',
  'ui.calendar.accepted': 'Accepted',
  'ui.calendar.dismiss': 'Dismiss',
  'ui.calendar.dismissed': 'Dismissed',
  'ui.calendar.month1': 'Jan',
  'ui.calendar.month2': 'Feb',
  'ui.calendar.month3': 'Mar',
  'ui.calendar.month4': 'Apr',
  'ui.calendar.month5': 'May',
  'ui.calendar.month6': 'Jun',
  'ui.calendar.month7': 'Jul',
  'ui.calendar.month8': 'Aug',
  'ui.calendar.month9': 'Sep',
  'ui.calendar.month10': 'Oct',
  'ui.calendar.month11': 'Nov',
  'ui.calendar.month12': 'Dec',
  'ui.calendar.dayMon': 'Mon',
  'ui.calendar.dayTue': 'Tue',
  'ui.calendar.dayWed': 'Wed',
  'ui.calendar.dayThu': 'Thu',
  'ui.calendar.dayFri': 'Fri',
  'ui.calendar.daySat': 'Sat',
  'ui.calendar.daySun': 'Sun',

  // ===========================================================================
  // Compare
  // ===========================================================================
  'ui.compare.title': 'Cross-Platform Comparison',
  'ui.compare.persona': 'Persona: {type}',
  'ui.compare.keyMetrics': 'Key Metrics',
  'ui.compare.radarOverview': 'Radar Overview',
  'ui.compare.radarFollowers': 'Followers',
  'ui.compare.radarEngagement': 'Engagement',
  'ui.compare.radarPosts': 'Posts',
  'ui.compare.radarViews': 'Views',
  'ui.compare.radarTotalEng': 'Total Eng.',
  'ui.compare.insightHighlights': 'Insight Highlights',
  'ui.compare.contentTypeOverlap': 'Content Type Overlap',
  'ui.compare.category': 'Category',
  'ui.compare.personaScoreComparison': 'Persona Score Comparison',
  'ui.compare.followers': 'Followers',
  'ui.compare.engagementRate': 'Engagement Rate',
  'ui.compare.likesTotal': 'Likes Total',
  'ui.compare.savesTotal': 'Saves Total',
  'ui.compare.multiDimensional': 'Multi-Dimensional Comparison',
  'ui.compare.needTwoPlatforms': 'Need at least 2 platforms to compare',
  'ui.compare.needTwoPlatformsDesc': 'Import data from multiple platforms (Douyin, TikTok, Red Note) to see cross-platform comparison, radar charts, and actionable insights.',
  'ui.compare.importMoreData': 'Import more data',
  'ui.compare.insights': 'Insights',

  // ===========================================================================
  // Settings
  // ===========================================================================
  'ui.settings.title': 'Settings',
  'ui.settings.learningData': 'Learning Data',
  'ui.settings.loadingPreferences': 'Loading preferences...',
  'ui.settings.totalInteractions': 'Total interactions tracked',
  'ui.settings.yourPreferences': 'Your preferences',
  'ui.settings.topSections': 'Top sections',
  'ui.settings.focusPlatform': 'Focus platform',
  'ui.settings.preferredTimeRange': 'Preferred time range',
  'ui.settings.noneYet': 'None yet',
  'ui.settings.clearLearningData': 'Clear Learning Data',
  'ui.settings.clearedSuccessfully': 'Cleared successfully',
  'ui.settings.about': 'About',
  'ui.settings.versionLabel': 'Version',
  'ui.settings.license': 'License',
  'ui.settings.source': 'Source',

  // ===========================================================================
  // Onboarding
  // ===========================================================================
  // ===========================================================================
  // Install page
  // ===========================================================================
  'ui.install.backToHome': '← Back to Home',
  'ui.install.pageTitle': 'Install Full DashPersona',
  'ui.install.pageDesc': 'Install the CLI to collect real data from your creator accounts and unlock the full analysis suite.',
  'ui.install.unlocksHeading': 'Full Version Unlocks',
  'ui.install.unlock1Title': 'Real Data',
  'ui.install.unlock1Desc': 'Collect real data directly from Douyin, TikTok, and Red Note creator centers.',
  'ui.install.unlock2Title': 'Growth Tracking',
  'ui.install.unlock2Desc': 'Track follower and engagement trends over time.',
  'ui.install.unlock3Title': 'Full Analysis',
  'ui.install.unlock3Desc': 'Unlock benchmark comparisons, content calendar, and complete persona scoring.',
  'ui.install.requirementsHeading': 'Requirements',
  'ui.install.req1': 'Node.js 22 or higher',
  'ui.install.req2': 'macOS, Windows, or Linux',
  'ui.install.req3': 'Google Chrome (for data collection)',
  'ui.install.stepsHeading': 'Installation Steps',
  'ui.install.step1Title': 'Install Node.js',
  'ui.install.step1Desc': 'Download and install the latest LTS version from nodejs.org. After installation, verify in your terminal:',
  'ui.install.step1VerifyDesc': 'If successful, you\'ll see a version number (e.g. v22.0.0):',
  'ui.install.step1ImgAlt': 'Terminal showing node --version output',
  'ui.install.step2Title': 'Install Claude Code CLI',
  'ui.install.step2Desc': 'Run the following command in your terminal to install Claude Code globally:',
  'ui.install.step2VerifyPre': 'After installation, run',
  'ui.install.step2VerifyPost': 'to verify it was installed correctly.',
  'ui.install.step3Title': 'Install the Web Access Skill',
  'ui.install.step3Desc': 'Install the skill that allows Claude to collect creator data:',
  'ui.install.step4Title': 'Enable Chrome Remote Debugging',
  'ui.install.step4Desc': 'Data collection requires connecting to your Chrome browser. Follow these steps:',
  'ui.install.step4Sub1Pre': 'Open Chrome and navigate to',
  'ui.install.step4Sub2Pre': 'Check the box labelled',
  'ui.install.step4Sub2Post': 'and click Done.',
  'ui.install.step4Sub3': 'Keep Chrome open and return to this page.',
  'ui.install.step4ImgAlt': 'Chrome remote debugging settings panel',
  'ui.install.step5Title': 'Start Collecting Data',
  'ui.install.step5Desc': 'You\'re all set! Head to the onboarding page to connect your accounts and start collecting data.',
  'ui.install.step5Cta': 'Go to Onboarding',
  'ui.install.faqHeading': 'Troubleshooting FAQ',
  'ui.install.faq1Q': 'Do I need an Anthropic account to use Claude Code?',
  'ui.install.faq1A': 'Yes, you need an Anthropic account to use Claude Code. You can sign up for free at console.anthropic.com.',
  'ui.install.faq2Q': 'Is my data uploaded to any server?',
  'ui.install.faq2A': 'No. All data processing happens locally on your device. DashPersona is a purely local analysis tool and does not send any data to external servers.',
  'ui.install.faq3Q': 'Does it work on Windows?',
  'ui.install.faq3A': 'Yes, DashPersona supports macOS, Windows, and Linux. The Chrome remote debugging steps are essentially the same across all platforms.',
  'ui.install.faq4Q': 'What do I do if something doesn\'t work?',
  'ui.install.faq4A': 'Check the Issues page on our GitHub repository, or open a new issue there. We\'ll get back to you as soon as possible.',

  // ===========================================================================
  // Onboarding
  // ===========================================================================
  'ui.onboarding.step': 'Step {step} of 2',
  'ui.onboarding.connectAccounts': 'Connect your accounts',
  'ui.onboarding.connectDesc': 'Import your data files or paste a TikTok profile URL to get started.',
  'ui.onboarding.importFiles': 'Import Files',
  'ui.onboarding.pasteUrl': 'Paste URL',
  'ui.onboarding.autoCollect': 'Auto Collect',
  'ui.onboarding.exportGuideTitle': 'How to export your data from Creator Centers',
  'ui.onboarding.douyinExport': 'Douyin',
  'ui.onboarding.douyinStep1': '1. Data Center \u2192 Account Overview \u2192 select Last 30 days \u2192 click each metric tab \u2192 Export Data',
  'ui.onboarding.douyinStep2': '2. Data Center \u2192 Content Analysis \u2192 Post List \u2192 click calendar icon \u2192 select All (max range) \u2192 Export Data',
  'ui.onboarding.tiktokExport': 'TikTok',
  'ui.onboarding.tiktokStep1': '1. Overview tab \u2192 Download Data (365 days of views, likes, comments)',
  'ui.onboarding.tiktokStep2': '2. Content tab \u2192 Download Data (per-video metrics)',
  'ui.onboarding.tiktokStep3': '3. Followers tab \u2192 Download Data (follower history, demographics, regions)',
  'ui.onboarding.tiktokStep4': '4. Viewers tab \u2192 Download Data (viewer trends)',
  'ui.onboarding.redNoteExport': 'Red Note',
  'ui.onboarding.redNoteStep': 'Open creator.xiaohongshu.com \u2192 Data Dashboard \u2192 Export Data',
  'ui.onboarding.exportMoreData': 'Export as much data as possible \u2014 more data means more accurate analysis. Select the maximum date range available for the best results.',
  'ui.onboarding.mergePreview': 'Merge preview',
  'ui.onboarding.postsCount': '{count} posts',
  'ui.onboarding.dailySnapshots': '{count} daily snapshots',
  'ui.onboarding.readyToAnalyze': 'Ready to analyze',
  'ui.onboarding.tiktokSupported': 'TikTok is supported via URL paste. For Douyin, install the Data Passport browser extension for one-click data capture. Red Note support is coming soon.',
  'ui.onboarding.profileUrl': 'Profile URL {index}',
  'ui.onboarding.douyinRedNoteNotSupported': 'Douyin and Red Note URLs detected but not yet supported for live collection. Please use a TikTok URL or try demo data.',
  'ui.onboarding.addPlatform': '+ Add another platform',
  'ui.onboarding.skipDemo': 'Skip \u2014 use demo data',
  'ui.onboarding.useExtension': 'Use extension (Douyin)',
  'ui.onboarding.benchmarkTitle': 'Benchmark comparison',
  'ui.onboarding.benchmarkDesc': 'Compare your account against competitors or aspirational creators to identify gaps and opportunities.',
  'ui.onboarding.benchmarkNotAvailable': 'Benchmark comparison is not yet available. This feature requires live data collection for both your account and benchmark accounts, which is currently limited to TikTok snapshots. Full benchmark support is on the roadmap.',

  // ===========================================================================
  // Upgrade Banner
  // ===========================================================================
  'ui.banner.unlockFull': 'Unlock full analysis',
  'ui.banner.installCli': 'Install the CLI to collect real-time data from your Creator Centers.',
  'ui.banner.viewingDemo': "You're viewing demo data",
  'ui.banner.demoDesc': 'The web version uses simulated data for preview. Install the CLI tool to collect real data from your Creator Centers (Douyin, TikTok, Red Note) and get accurate persona analysis.',
  'ui.banner.viewInstallGuide': 'View installation guide \u2192',

  // ===========================================================================
  // Components — For You Card
  // ===========================================================================
  'ui.components.loadingInsights': 'Loading personalized insights...',
  'ui.components.topPost': '{platform} Top Post',
  'ui.components.topPostDetail': 'Your most viewed {platform} post has {views} views. Tap to explore patterns.',
  'ui.components.personaDeepDive': 'Persona Deep Dive',
  'ui.components.personaDeepDiveDetail': 'You frequently explore persona scores. Check the Persona page for detailed breakdowns and tag analysis.',
  'ui.components.dayGrowthTrend': '{days}-Day Growth Trend',
  'ui.components.dayGrowthTrendDetail': 'You prefer the {days}-day view. Your growth trends over this period are available in the Growth section.',
  'ui.components.contentFilterApplied': 'Content Filter Applied',
  'ui.components.contentFilterDetail': "You've dismissed {count} content type(s). Your calendar view is tailored accordingly.",
  'ui.components.powerUser': 'Power User',
  'ui.components.powerUserDetail': 'You explore multiple dashboard sections. Consider the cross-platform comparison for a holistic view.',
  'ui.components.exploreData': 'Explore Your Data',
  'ui.components.exploreDataDetail': 'Click around the dashboard to personalize this section. Your interactions shape the insights shown here.',
  'ui.components.crossPlatformView': 'Cross-Platform View',
  'ui.components.crossPlatformViewDetail': 'Compare your performance across Douyin, TikTok, and Red Note to find your strongest platform.',
  'ui.components.contentCalendarInsight': 'Content Calendar',
  'ui.components.contentCalendarInsightDetail': 'Check the content calendar for AI-free publishing suggestions based on your engagement patterns.',

  // ===========================================================================
  // Components — Niche Detect Card
  // ===========================================================================
  'ui.components.confidence': 'Confidence',
  'ui.components.relatedCategories': 'Related categories',

  // ===========================================================================
  // Components — Dashboard Interactive
  // ===========================================================================
  'ui.components.browseAllPosts': 'Browse All Posts ({count})',
  'ui.components.collectNow': 'Collect Now',
  'ui.components.collecting': 'Collecting...',
  'ui.components.relatedPosts': 'Related Posts ({count})',
  'ui.components.postsTitle': 'Posts',
  'ui.components.postsCount': 'Posts ({count})',
  'ui.components.viewPosts': 'View posts ({count})',

  // ===========================================================================
  // Components — Growth Sparklines
  // ===========================================================================
  'ui.components.followersTooltip': 'Followers: {count}',

  // ===========================================================================
  // Components — Strategy Suggestions
  // ===========================================================================
  'ui.components.noStrategySuggestions': 'No strategy suggestions available yet. Add more data to unlock personalised recommendations.',

  // ===========================================================================
  // Components — Post Drawer
  // ===========================================================================
  'ui.components.closePanel': 'Close panel',
  'ui.components.noPosts': 'No posts to display.',
  'ui.components.showingPosts': 'Showing {visible} of {total} \u2014 scroll for more',
  'ui.components.sortViews': 'Views',
  'ui.components.sortLikes': 'Likes',
  'ui.components.sortDate': 'Date',
  'ui.components.metricViews': 'views',
  'ui.components.metricLikes': 'likes',
  'ui.components.metricComments': 'comments',
  'ui.components.metricShares': 'shares',
  'ui.components.metricSaves': 'saves',

  // ===========================================================================
  // Components — Growth Trend Chart
  // ===========================================================================
  'ui.components.followers': 'Followers',
  'ui.components.totalLikes': 'Total Likes',
  'ui.components.videos': 'Videos',
  'ui.components.startTracking': 'Start tracking to see trends',
  'ui.components.startTrackingDesc': 'Growth history snapshots will appear here once data is collected over multiple sessions.',
  'ui.components.needTwoDataPoints': 'Need at least 2 data points to render a trend line',

  // ===========================================================================
  // Components — File Drop Zone
  // ===========================================================================
  'ui.components.dropFilesHere': 'Drop files here',
  'ui.components.dragOrBrowse': 'Drag files here or click to browse',
  'ui.components.fileFormats': 'JSON, CSV, XLSX \u2014 multiple files supported, 10 MB max each',

  // ===========================================================================
  // Components — Export Button
  // ===========================================================================
  'ui.components.export': 'Export',
  'ui.components.exporting': 'Exporting',
  'ui.components.exportPng': 'Export as PNG',
  'ui.components.exportPdf': 'Export as PDF',
  'ui.components.exportCsv': 'Export as CSV',

  // ===========================================================================
  // Components — Benchmark Card
  // ===========================================================================
  'ui.components.vsBenchmark': 'vs {niche} Average',

  // ===========================================================================
  // Components — Browser Collect Status
  // ===========================================================================
  'ui.components.userIdRequired': 'User ID required',
  'ui.components.profileUrlRequired': 'Profile URL required',
  'ui.components.comingSoon': 'Coming soon',
  'ui.components.enterIdentifier': 'Enter identifier',
  'ui.components.collect': 'Collect',
  'ui.components.connectingBrowser': 'Connecting to browser...',
  'ui.components.collectingData': 'Collecting creator data...',
  'ui.components.collectionComplete': 'Collection complete',
  'ui.components.collectionFailed': 'Collection failed',
  'ui.components.browserCollectInfo': 'Collects data through your real browser with existing login sessions. Make sure you are logged in to the target platform before collecting.',

  // ===========================================================================
  // Components — Live Dashboard Wrapper
  // ===========================================================================
  'ui.components.liveData': 'Live Data',
  'ui.components.demoModeFallback': 'Demo Mode (live fetch failed)',
  'ui.components.showingDemo': 'Showing demo data',
  'ui.components.snapshotNote': 'Showing current snapshot only. Growth history and trend tracking will be available once continuous data collection is enabled.',

  // ===========================================================================
  // Components — Experiment Form
  // ===========================================================================
  'ui.components.experimentForm': 'Experiment form',
  'ui.components.experimentDetails': 'Experiment details',
  'ui.components.expTitle': 'Title',
  'ui.components.expTitlePlaceholder': 'e.g. Tutorial Content Deep-dive',
  'ui.components.expHypothesis': 'Hypothesis',
  'ui.components.expHypothesisPlaceholder': 'If we increase tutorial content from 10% to 25%...',
  'ui.components.expSeries': 'Series',
  'ui.components.expSeriesPlaceholder': 'e.g. content-mix, hook-style',
  'ui.components.expParentNode': 'Parent Node',
  'ui.components.expNoneRoot': 'None (root node)',
  'ui.components.expStatus': 'Status',
  'ui.components.expPlanned': 'Planned',
  'ui.components.expRunning': 'Running',
  'ui.components.createExperiment': 'Create Experiment',
  'ui.components.updateExperiment': 'Update Experiment',

  // ===========================================================================
  // Onboarding — File import schema type labels
  // ===========================================================================
  'ui.onboarding.schemaPostList': 'Post List',
  'ui.onboarding.schemaPostAnalysis': 'Post Analysis',
  'ui.onboarding.schemaAggregate': 'Aggregate',
  'ui.onboarding.schemaTimeseries': 'Time Series',
  'ui.onboarding.schemaGeneric': 'Generic Data',
  'ui.onboarding.profileUrls': 'Profile URLs',
  'ui.onboarding.removeUrl': 'Remove URL {index}',

  // ===========================================================================
  // Components — CDP Setup Guide
  // ===========================================================================
  'ui.components.cdpReadsCreatorCenter': 'Reads from your Creator Center \u2014 no URL needed',
  'ui.components.cdpReadsTikTokStudio': 'Reads from your TikTok Studio \u2014 no URL needed',
  'ui.components.cdpProxyNotRunning': 'CDP Proxy is not running',
  'ui.components.cdpNotLoggedIn': 'Not logged in to the platform',
  'ui.components.cdpTimeout': 'Collection timed out',
  'ui.components.cdpParseError': 'Could not read page data',
  // Step indicator
  'ui.components.cdpStepSetup': 'Setup',
  'ui.components.cdpStepLogin': 'Login',
  'ui.components.cdpStepCollect': 'Collect',
  'ui.components.cdpStepDone': 'Done',
  // Setup instructions
  'ui.components.cdpStep1Header': 'Step 1 \u2014 Enable Chrome Remote Debugging',
  'ui.components.cdpStep1_1': 'Open',
  'ui.components.cdpStep1_1_suffix': 'in your Chrome browser.',
  'ui.components.cdpStep1_2_pre': 'Check',
  'ui.components.cdpStep1_2_strong': '\u201cAllow remote debugging for this browser instance\u201d',
  'ui.components.cdpStep1_2_suffix': '.',
  'ui.components.cdpStep2Header': 'Step 2 \u2014 Start CDP Proxy',
  'ui.components.cdpStep2Desc': 'Run this command in your terminal:',
  'ui.components.cdpRecheckBtn': 'Recheck Connection',
  'ui.components.cdpChecking': 'Checking...',
  // Troubleshoot
  'ui.components.cdpTroubleshoot': 'Troubleshoot',
  'ui.components.cdpHowToFix': 'How to fix',
  // Troubleshoot step 1 items
  'ui.components.cdpTs1_1': '"Page not found?" \u2014 Make sure you\'re using Google Chrome (not Safari or Firefox)',
  'ui.components.cdpTs1_2': '"No checkbox visible?" \u2014 Scroll down, it may be below the fold',
  'ui.components.cdpTs1_3': '"Still not working?" \u2014 Restart Chrome completely, then try again',
  // Troubleshoot step 2 items
  'ui.components.cdpTs2_1': '"node" not found? \u2014 Install Node.js from nodejs.org (version 22+)',
  'ui.components.cdpTs2_2': '"Port already in use?" \u2014 Another proxy may be running; this is fine',
  'ui.components.cdpTs2_3': '"Chrome auth popup?" \u2014 Click "Allow" in your Chrome browser',
  // Error recovery
  'ui.components.cdpErrProxyTitle': 'CDP Proxy is not running',
  'ui.components.cdpErrProxy1': 'Open your terminal',
  'ui.components.cdpErrProxy3': 'Wait for the "proxy: ready" message',
  'ui.components.cdpErrProxy4': 'Come back here and retry',
  'ui.components.cdpErrLoginTitle': 'Not logged in to the platform',
  'ui.components.cdpErrLogin1': 'Open the platform website in your Chrome browser',
  'ui.components.cdpErrLogin2': 'Log in with your account credentials',
  'ui.components.cdpErrLogin3': 'Come back here and click Collect again',
  'ui.components.cdpErrTimeoutTitle': 'Collection timed out',
  'ui.components.cdpErrTimeout1': 'The page may be loading slowly',
  'ui.components.cdpErrTimeout2': 'Make sure your internet connection is stable',
  'ui.components.cdpErrTimeout3': 'Try again \u2014 it usually works on retry',
  'ui.components.cdpErrParseTitle': 'Could not read page data',
  'ui.components.cdpErrParse1': 'The platform page structure may have changed',
  'ui.components.cdpErrParse2': 'Try refreshing the platform page in Chrome first',
  'ui.components.cdpErrParse3': 'If the issue persists, try again later',
  // Login check panel
  'ui.components.cdpVerifyLogins': 'Verify platform logins',
  'ui.components.cdpLoginDesc': 'Data collection reads from your existing browser sessions. Make sure you are logged in to each platform you want to collect.',
  'ui.components.cdpCheckLoginBtn': 'Check Login',
  'ui.components.cdpLoginReady': 'Ready',
  'ui.components.cdpLoginAs': 'as {username}',
  'ui.components.cdpOpenInChrome': 'Open',
  'ui.components.cdpOpenAndLogin': 'in Chrome and log in',
  'ui.components.cdpSkipLoginNote': 'Skip if you prefer to verify manually. You can always retry if collection fails with a login error.',
  // Copy button
  'ui.components.cdpCopy': 'Copy',
  'ui.components.cdpCopied': 'Copied',
  'ui.components.cdpCopyAriaDefault': 'Copy command',
  'ui.components.cdpCopyAriaCopied': 'Copied',
  // Collect panel
  'ui.components.cdpNotVerified': 'Not verified',
  'ui.components.cdpCollecting': 'Collecting...',
  'ui.components.cdpFailed': 'Failed',
  'ui.components.cdpRecollect': 'Recollect',
  'ui.components.cdpCollect': 'Collect',
  'ui.components.cdpCollectAll': 'Collect All Verified Platforms',
  'ui.components.cdpCollectPanelNote': 'Collect each platform individually or all at once. You can launch the dashboard anytime after at least one platform is collected.',
  'ui.components.cdpPostsCount': '{count} post{plural}',
  // Phase status bars
  'ui.components.cdpCheckingProxy': 'Checking CDP proxy connection...',
  'ui.components.cdpProxyNotRunningStatus': 'CDP proxy not running',
  'ui.components.cdpProxyNotRunningSub': 'Follow the steps below to connect your Chrome browser.',
  'ui.components.cdpProxyConnected': 'CDP proxy connected',
  'ui.components.cdpVerifyLoginsSub': 'Verify your platform logins before collecting.',
  'ui.components.cdpReadyToCollect': 'CDP proxy connected',
  'ui.components.cdpReadyToCollectSub': 'Select platforms and collect data.',
  // Platform status dot labels
  'ui.components.cdpStatusIdle': 'Idle',
  'ui.components.cdpStatusCollecting': 'Collecting',
  'ui.components.cdpStatusDone': 'Done',
  'ui.components.cdpStatusError': 'Error',
  // Login dot labels
  'ui.components.cdpLoginDotLoggedIn': 'Logged in',
  'ui.components.cdpLoginDotNotLoggedIn': 'Not logged in',
  'ui.components.cdpLoginDotUnknown': 'Status unknown',
  // Done panel
  'ui.components.cdpCollectionComplete': 'Collection complete',
  'ui.components.cdpCollectionSummary': '{posts} post{plural} across {platforms} platform{platformPlural}',
  'ui.components.cdpRetryFailed': 'Retry Failed',
  'ui.components.cdpNeedOneCollection': 'At least one successful collection is required to launch the dashboard.',

  // ===========================================================================
  // Components — Extension Data Loader / Fan Portrait
  // ===========================================================================
  'ui.components.fanPortrait': 'Fan Portrait',
  'ui.components.gender': 'Gender',
  'ui.components.male': 'Male',
  'ui.components.female': 'Female',
  'ui.components.ageGroups': 'Age Groups',
  'ui.components.interests': 'Interests',
  'ui.components.topRegions': 'Top Regions',

  // ===========================================================================
  // Momentum labels
  // ===========================================================================
  'momentum.accelerating': 'Accelerating',
  'momentum.steady': 'Steady',
  'momentum.decelerating': 'Decelerating',
  'momentum.insufficient_data': 'No data',

  // ===========================================================================
  // Engine — Content categories (31 categories from persona.ts)
  // ===========================================================================
  'engine.category.tutorial': 'Tutorial',
  'engine.category.daily': 'Daily',
  'engine.category.review': 'Review',
  'engine.category.entertainment': 'Entertainment',
  'engine.category.story': 'Story',
  'engine.category.emotion': 'Emotion',
  'engine.category.food': 'Food',
  'engine.category.fitness': 'Fitness',
  'engine.category.travel': 'Travel',
  'engine.category.fashion': 'Fashion',
  'engine.category.beauty': 'Beauty',
  'engine.category.tech': 'Tech',
  'engine.category.knowledge': 'Knowledge',
  'engine.category.music': 'Music',
  'engine.category.dance': 'Dance',
  'engine.category.pet': 'Pet',
  'engine.category.photography': 'Photography',
  'engine.category.parenting': 'Parenting',
  'engine.category.diy': 'DIY',
  'engine.category.finance': 'Finance',
  'engine.category.gaming': 'Gaming',
  'engine.category.car': 'Car',
  'engine.category.home': 'Home',
  'engine.category.book': 'Book',
  'engine.category.health': 'Health',
  'engine.category.art': 'Art',
  'engine.category.outdoor': 'Outdoor',
  'engine.category.couple': 'Couple',
  'engine.category.workplace': 'Workplace',
  'engine.category.language': 'Language',
  'engine.category.comedy_skit': 'Comedy Skit',
  'engine.category.uncategorised': 'Uncategorised',

  // ===========================================================================
  // Engine — Niche labels (10 niches from benchmark-data.ts)
  // ===========================================================================
  'engine.niche.tutorial': 'Tutorial & Education',
  'engine.niche.entertainment': 'Entertainment',
  'engine.niche.food': 'Food & Cooking',
  'engine.niche.fitness': 'Fitness & Health',
  'engine.niche.beauty': 'Beauty & Skincare',
  'engine.niche.tech': 'Tech & Gadgets',
  'engine.niche.travel': 'Travel & Outdoor',
  'engine.niche.fashion': 'Fashion & Style',
  'engine.niche.lifestyle': 'Lifestyle',
  'engine.niche.gaming': 'Gaming',

  // ===========================================================================
  // Engine — Persona tags (from persona.ts lines 650-770)
  // ===========================================================================
  'engine.tags.specialist': '{category} Specialist',
  'engine.tags.highEngagement': 'High Engagement',
  'engine.tags.engagementRising': 'Engagement Rising',
  'engine.tags.engagementDeclining': 'Engagement Declining',
  'engine.tags.consistentIdentity': 'Consistent Identity',
  'engine.tags.contentExplorer': 'Content Explorer',
  'engine.tags.prolificPublisher': 'Prolific Publisher',
  'engine.tags.clockworkRhythm': 'Clockwork Rhythm',
  'engine.tags.growthRocket': 'Growth Rocket',
  'engine.tags.plateauAlert': 'Plateau Alert',
  'engine.tags.viralPotential': 'Viral Potential',

  // ===========================================================================
  // Engine — Strategy suggestions (from strategy.ts)
  // ===========================================================================
  'engine.strategy.contentMixTitle': 'Shift towards {category} content',
  'engine.strategy.contentMixDesc': 'Your {category} posts achieve {ratio}x higher engagement than your most-posted category ({mostPosted}). Consider increasing {category} content from its current share and reducing less effective categories.',
  'engine.strategy.rhythmTitle': 'Establish a consistent posting schedule',
  'engine.strategy.rhythmDesc': 'Your posting consistency score is {score}/100, which indicates irregular publishing intervals. Algorithms on most platforms favour predictable creators. Your historical data suggests {bestDay} around {bestHour} UTC may be your best time slot. Try committing to a fixed schedule (e.g., every {interval} days).',
  'engine.strategy.crossPlatformTitle': 'Adapt {platform} strategy to other platforms',
  'engine.strategy.crossPlatformDesc': '{insight}. Analyse what makes your content resonate on {platform} \u2014 format, length, hooks, timing \u2014 and test applying those patterns to your weaker platforms.',
  'engine.strategy.engagementDeclineTitle': 'Reverse the engagement decline',
  'engine.strategy.engagementDeclineDesc': 'Your engagement rate is trending downward ({trend}pp shift from older to newer posts). This may indicate audience fatigue with the current format. Consider experimenting with new content formats, stronger opening hooks, or direct calls-to-action in your posts.',
  'engine.strategy.growthPlateauTitle': 'Break through the growth plateau',
  'engine.strategy.growthPlateauDesc': 'Your follower growth is decelerating ({rate}% over the tracked window). Consider collaborations with creators in adjacent niches, leveraging trending formats, or running a content series that encourages saves and shares to boost algorithmic distribution.',

  // ===========================================================================
  // Engine — Explain factors (from explain.ts)
  // ===========================================================================
  'engine.explain.overallRate': 'Overall Rate',
  'engine.explain.medianRate': 'Median Rate',
  'engine.explain.trend': 'Trend',
  'engine.explain.postsPerWeek': 'Posts Per Week',
  'engine.explain.consistency': 'Consistency',
  'engine.explain.meanInterval': 'Mean Interval',
  'engine.explain.cosineSimilarity': 'Cosine Similarity',
  'engine.explain.dominant': 'Dominant: {category}',
  'engine.explain.followerGrowthRate': 'Follower Growth Rate',
  'engine.explain.momentum': 'Momentum',
  'engine.explain.dataPoints': 'Data Points',
  'engine.explain.bestCategory': 'Best Category: {category}',
  'engine.explain.postCount': 'Post Count',
  'engine.explain.overallEngagement': 'Overall Engagement',
  'engine.explain.followers': 'Followers',
  'engine.explain.likes': 'Likes',
  'engine.explain.views': 'Views',
  'engine.explain.engagement': 'Engagement',
  'engine.explain.retention': 'Retention',
  'engine.explain.growth': 'Growth',

  // ===========================================================================
  // Engine — Idea generator (from idea-generator.ts)
  // ===========================================================================
  'engine.ideas.contentGapTitle': 'Increase {category} Content',
  'engine.ideas.contentGapHypothesis': 'If you increase {category} content from {currentPct}% to {suggestedPct}%, engagement rate should improve by ~{engMult}x based on current per-category performance.',
  'engine.ideas.contentGapRationale': '{category} has {rate}% engagement rate ({engMult}x above average) but only makes up {currentPct}% of your posts.',
  'engine.ideas.crossPlatformTitle': 'Test {category} on {platform}',
  'engine.ideas.crossPlatformHypothesis': '{category} content gets {ratio}x higher engagement on {bestPlatform} vs {worstPlatform}. Adapting the format for {worstPlatform}\'s audience could close the gap.',
  'engine.ideas.rhythmTitle': 'Optimize Publishing Schedule',
  'engine.ideas.rhythmHypothesis': 'Your best engagement window is {bestDay}s around {bestHour}:00 UTC, but only {usagePct}% of posts target this slot. Scheduling more posts here could boost visibility.',
  'engine.ideas.personaDriftTitle': 'Refocus Content Identity',
  'engine.ideas.personaDriftHypothesis': 'Persona consistency is at {score}/100. Refocusing on {category} (currently {pct}% of posts) and reducing topic scatter could strengthen audience retention.',
  'engine.ideas.viralTitle': 'Replicate {category} Viral Hit',
  'engine.ideas.viralHypothesis': 'One {category} post achieved {multiple}x average views. Replicating its characteristics (format, length, hook style) in a series of 3-5 posts could capture similar audience spikes.',

  // ===========================================================================
  // Engine — Comparator insights (from comparator.ts)
  // ===========================================================================
  'engine.compare.engagementGap': 'Your content gets {ratio}x more engagement on {topPlatform} than {bottomPlatform}',
  'engine.compare.audienceSize': 'Your audience on {topPlatform} is {ratio}x larger than on {bottomPlatform}',
  'engine.compare.bestContent': 'Your {category} content gets {ratio}x more engagement on {bestPlatform} than {worstPlatform}',
  'engine.compare.contentDistribution': '{category} content is {pct}% of your {platformA} but nearly absent on {platformB}',

  // ===========================================================================
  // Engine — Persona tree labels (from persona-tree.ts)
  // ===========================================================================
  'engine.tree.baselineStrategy': 'Baseline Strategy',
  'engine.tree.baselineHypothesis': 'Current content mix is the optimal starting point for audience growth.',
  'engine.tree.variantA': 'Variant A',
  'engine.tree.variantB': 'Variant B',
  'engine.tree.focusExperiment': '{category} Focus Experiment',
  'engine.tree.focusHypothesis': 'Doubling down on {category} content will improve engagement and retention.',
  'engine.tree.pivotTest': '{category} Pivot Test',
  'engine.tree.pivotHypothesis': 'Pivoting to {category} content could open a new audience segment.',
  'engine.tree.adoptedBaseline': 'Adopted as baseline',
  'engine.tree.adoptedBaselineReason': 'Establishes the control group for all subsequent content experiments.',
  'engine.tree.adopted': 'Adopted',
  'engine.tree.adoptedReason': '{category} content shows strongest audience resonance.',
  'engine.tree.discarded': 'Discarded',
  'engine.tree.discardedReason': '{category} content underperforms relative to core content mix. Metrics below threshold.',
  'engine.tree.discardedDetail': 'Low engagement and retention scores.',
  'engine.tree.highFrequencyDesc': 'High-frequency {category} posts',
  'engine.tree.mixedDesc': '{category} mixed with other topics',
  'engine.tree.pureDesc': 'Pure {category} content approach',
  'engine.tree.originalMixDesc': 'Original content mix across all categories',

  // ===========================================================================
  // Engine — Content planner (from content-planner.ts)
  // ===========================================================================
  'engine.planner.dayNames.0': 'Sunday',
  'engine.planner.dayNames.1': 'Monday',
  'engine.planner.dayNames.2': 'Tuesday',
  'engine.planner.dayNames.3': 'Wednesday',
  'engine.planner.dayNames.4': 'Thursday',
  'engine.planner.dayNames.5': 'Friday',
  'engine.planner.dayNames.6': 'Saturday',
  'engine.planner.timeSlot.morning': 'morning',
  'engine.planner.timeSlot.afternoon': 'afternoon',
  'engine.planner.timeSlot.evening': 'evening',
  'engine.planner.reasoning': '{type} content gets {engRate} engagement on {platform} (vs {avgRate} average). {day} {timeSlot} is your peak time.',
  'engine.planner.reasoningGap': "You've only posted {count} {type} posts in the last 30 days \u2014 room to grow.",

  // ===========================================================================
  // Engine — Benchmark (from benchmark.ts)
  // ===========================================================================
  'engine.benchmark.followers': 'Followers',
  'engine.benchmark.engagementRate': 'Engagement Rate',
  'engine.benchmark.postCount': 'Post Count',
  'engine.benchmark.noBenchmarks': 'No benchmark profiles available for comparison.',
  'engine.benchmark.outperforming': 'Outperforming benchmarks across all metrics ({metrics}).',
  'engine.benchmark.belowAll': 'Below benchmark averages on all metrics ({metrics}). Focus on the highest-gap area first.',
  'engine.benchmark.mixed': 'Above benchmarks in {above}; below in {below}.',
  'engine.benchmark.atAverage': 'Performing at benchmark average levels across all compared metrics.',

  // ===========================================================================
  // Engine — Content analyzer hook types (from content-analyzer.ts)
  // ===========================================================================
  'engine.analyzer.questionHook': 'Question hook',
  'engine.analyzer.numberHook': 'Number hook',
  'engine.analyzer.contrastHook': 'Contrast hook',
  'engine.analyzer.emotionalHook': 'Emotional hook',
  'engine.analyzer.challengeHook': 'Challenge hook',
  'engine.analyzer.storyHook': 'Story hook',
  'engine.analyzer.nicheHeavy': 'skewing toward niche-specific tags',
  'engine.analyzer.broadHeavy': 'leaning on broad discovery tags',
  'engine.analyzer.balanced': 'mixing niche and broad tags',
  'engine.analyzer.trendingHeavy': 'clustering around a few dominant trending tags',

  // ===========================================================================
  // Engine — Next content (from next-content.ts)
  // ===========================================================================
  'engine.nextContent.dayNames.0': 'Sunday',
  'engine.nextContent.dayNames.1': 'Monday',
  'engine.nextContent.dayNames.2': 'Tuesday',
  'engine.nextContent.dayNames.3': 'Wednesday',
  'engine.nextContent.dayNames.4': 'Thursday',
  'engine.nextContent.dayNames.5': 'Friday',
  'engine.nextContent.dayNames.6': 'Saturday',
  'engine.nextContent.timingPersonal': 'Based on your historical posting data: your best engagement window is {day}s at {hour}:00 UTC.',
  'engine.nextContent.timingPlatform': 'Based on {platform} platform-wide peak hours ({hours} UTC). No personal rhythm data available yet.',

  // ===========================================================================
  // Radar chart dimension labels
  // ===========================================================================
  'engine.radar.followers': 'Followers',
  'engine.radar.engagement': 'Engagement',
  'engine.radar.posts': 'Posts',
  'engine.radar.views': 'Views',
  'engine.radar.totalEngagement': 'Total Eng.',

  // ===========================================================================
  // Priority labels
  // ===========================================================================
  'priority.high': 'high',
  'priority.medium': 'medium',
  'priority.low': 'low',

  // ===========================================================================
  // Components — Platform comparison card
  // ===========================================================================
  'ui.components.topContent': 'Top Content',
  'ui.components.rangeAll': 'All',

  // ===========================================================================
  // Components — Live collector
  // ===========================================================================
  'ui.components.fetchingLive': 'Fetching live data from TikTok\u2026 This may take a few seconds.',
  'ui.components.liveCollectionFailed': 'Live collection failed',
  'ui.components.fallingBackDemo': 'Falling back to demo data\u2026',
  'ui.components.liveDataCollected': 'Live data collected for @{userId}',
  'ui.components.errorTimedOut': 'TikTok took too long to respond. This sometimes happens due to rate limiting.',
  'ui.components.errorNotAllowed': 'This URL is not supported. Please use a TikTok profile URL.',
  'ui.components.errorCouldNotFind': 'Could not extract profile data. The page may be private or geo-restricted.',
  'ui.components.errorInvalidResponse': 'Server returned an invalid response. Please try again.',
  'ui.components.errorNoProfile': 'No profile data returned',
  'ui.components.errorNetwork': 'Network error',
};

export default en;
