export type Language = 'en' | 'zh';

export const translations = {
  en: {
    title: 'Farcaster Snapchain Suite',
    subtitle: 'Standalone Read Node & Sovereign Client with Gasless Signers',
    heroTag: 'Zero API Keys • MIT Licensed • Balaji Challenge Specification',
    heroDesc:
      'Run a standalone Farcaster Snapchain read node on AWS or any Linux VPS with zero third-party API keys. Build and use a sovereign client that issues gasless app keys via EIP-712 and filters out casts from any client to craft your own custom community.',
    quickstartTitle: 'Quickstart: 3 Commands to Full Sovereignty',
    quickstartSub:
      'Paste these three commands sequentially into your terminal to provision compute, launch your read node, and start interacting via the client.',
    copyAll: 'Copy All 3 Commands',
    copied: 'Copied!',
    cmd0Title: '0. Provision Compute (AWS EC2 / Ubuntu VPS)',
    cmd0Desc: 'Installs Docker, sets up UFW firewall (ports 22, 3381, 3382, 3383), and tunes Linux kernel network buffers.',
    cmd1Title: '1. Setup & Bootstrap Read Node',
    cmd1Desc: 'Pulls official Snapchain docker-compose & validators.toml, starts container, and polls :3381/v1/info.',
    cmd2Title: '2. Launch Sovereign Client',
    cmd2Desc: 'Spawns the local web client and CLI, generates gasless signers, and reads directly from your node.',
    
    // Client App
    clientTitle: 'Interactive Farcaster Client',
    nodeEndpoint: 'Snapchain Node Endpoint',
    ping: 'Ping Node',
    online: 'ONLINE',
    offline: 'OFFLINE',
    securityNoticeTitle: 'Developer Security Notice (Unix `rm` Analogy)',
    securityNoticeBody:
      'Like entering `rm -rf` in Unix, developer software that takes a mnemonic seed phrase is intended exclusively for developer testing accounts. Never enter your primary cold-storage wallet. Below you can use our built-in Sandbox Test Generator to safely test gasless signing with zero risk.',
    generateSandbox: 'Generate Sandbox Test Account',
    fidLabel: 'Farcaster FID',
    custodyKeyLabel: 'Custody Private Key / Seed Phrase',
    custodyKeyPlaceholder: '0x... or 12/24 word mnemonic (Test accounts only)',
    generateKeyAdd: 'Issue Gasless App Key (EIP-712)',
    keyAddSuccess: 'Gasless Signer active!',
    activeSigner: 'Active Ed25519 Signer',
    expiresIn: 'Expires in',
    
    // Community Filter
    filterTitle: 'Community Client Filtering Engine',
    filterSub: 'Include or exclude casts by client origin to craft your custom community experience.',
    modeAll: 'Show All Clients',
    modeExclude: 'Exclude Selected Clients',
    modeInclude: 'Include Only Selected',
    keywordFilter: 'Keyword Blacklist Filter (comma-separated)',
    
    // Compose & Feed
    composeTitle: 'Publish Cast directly to Node Mempool',
    composePlaceholder: 'What is happening on decentralized social? (Max 320 chars)',
    publishCast: 'Broadcast Cast',
    feedTitle: 'Live Cast Feed from Node',
    refreshFeed: 'Refresh Feed',
    noCastsFound: 'No casts found matching your current filter criteria.',
    like: 'Like',
    recast: 'Recast',
    
    // Deep Dive
    deepDiveTitle: 'Protocol Architecture & Deep-Dive Tutorial',
    deepDiveSub: 'Comprehensive technical walkthrough of Snapchain BFT, read nodes, and gasless cryptography.',
    architectureTitle: '1. Snapchain Topology & BFT Consensus',
    readNodeRoleTitle: '2. Why Read Nodes Accept Writes',
    gaslessSignersTitle: '3. Gasless App Keys (Snapchain Engine V16+)',
    clientFilterTheoryTitle: '4. The Mechanics of Client Filtering',
    zeroApiKeyTitle: '5. Zero API Keys vs Centralized Gateways',
    
    // Diagnostics
    diagTitle: 'Live Node Diagnostics & Health Ping',
    diagDesc: 'Test any Snapchain read node or Hubble hub in real-time.',
    latency: 'Latency',
    version: 'Engine Version',
    peers: 'Connected Peers',
    syncStatus: 'Sync State',
    totalMessages: 'Total Messages',
    totalFids: 'Registered FIDs',
    
    // Footer
    openSourceNotice: 'Open-source software published under the MIT License.',
    voucherGuideLink: 'Voucher Endorsement Guide',
    videoScriptLink: '59-Second Video Script',
    viewGithub: 'GitHub Repository',
  },
  zh: {
    title: 'Farcaster Snapchain 套件',
    subtitle: '独立只读节点与具备无Gas应用密钥的自主客户端',
    heroTag: '零API密钥 • MIT 开源协议 • Balaji 挑战赛全指标实现',
    heroDesc:
      '在 AWS 或任何 Linux VPS 上运行一个完全独立的 Farcaster Snapchain 只读节点，无需任何第三方 API 密钥。构建并使用自主客户端，通过 EIP-712 发行无 Gas 签发者，并自由包含或排除来自特定客户端（如 Warpcast、Supercast）的内容，构建属于你自己的去中心化社区。',
    quickstartTitle: '快速入门：3条命令实现完全主权',
    quickstartSub: '在终端中按顺序执行以下三条命令，即可完成服务器配置、启动只读节点并通过客户端进行交互。',
    copyAll: '复制全部 3 条命令',
    copied: '已复制！',
    cmd0Title: '0. 服务器算力准备 (AWS EC2 / Ubuntu VPS)',
    cmd0Desc: '自动安装 Docker，配置 UFW 防火墙（开放 22, 3381, 3382, 3383 端口），优化 Linux 内核网络缓冲区。',
    cmd1Title: '1. 部署并启动 Snapchain 只读节点',
    cmd1Desc: '自动拉取官方 docker-compose 与 validators.toml，启动容器并持续轮询 :3381/v1/info 健康状态。',
    cmd2Title: '2. 启动自主客户端',
    cmd2Desc: '启动本地 Web 客户端与命令行 CLI，生成无 Gas 签发密钥，直接向本地节点发起读取与写入。',
    
    // Client App
    clientTitle: '交互式 Farcaster 客户端',
    nodeEndpoint: 'Snapchain 节点端点',
    ping: '测试节点连接',
    online: '在线 (ONLINE)',
    offline: '离线 (OFFLINE)',
    securityNoticeTitle: '开发者安全须知（类比 Unix `rm` 命令）',
    securityNoticeBody:
      '正如在 Unix 终端中输入 `rm -rf` 一样，需要输入助记词或私钥的开发者工具仅限用于开发者测试账户。切勿输入存放重要资产的冷钱包！你可以使用下方内置的“生成沙盒测试账户”按钮，零风险体验无 Gas 签发机制。',
    generateSandbox: '生成沙盒测试账户',
    fidLabel: 'Farcaster FID 编号',
    custodyKeyLabel: '托管私钥 / 助记词',
    custodyKeyPlaceholder: '0x... 或 12/24 位助记词（仅限测试账号）',
    generateKeyAdd: '通过 EIP-712 发行无 Gas 签名密钥',
    keyAddSuccess: '无 Gas 密钥注册成功！',
    activeSigner: '活跃的 Ed25519 签名密钥',
    expiresIn: '有效期限',
    
    // Community Filter
    filterTitle: '社区客户端过滤引擎',
    filterSub: '根据客户端来源包含或排除特定内容，定制专属的社区信息流。',
    modeAll: '显示所有客户端',
    modeExclude: '排除选中的客户端',
    modeInclude: '仅包含选中的客户端',
    keywordFilter: '关键词黑名单（逗号分隔）',
    
    // Compose & Feed
    composeTitle: '直接向节点内存池发布 Cast',
    composePlaceholder: '去中心化社交网络正在发生什么？（最多 320 字符）',
    publishCast: '广播发布',
    feedTitle: '来自节点的实时信息流',
    refreshFeed: '刷新信息流',
    noCastsFound: '未找到符合当前过滤规则的内容。',
    like: '点赞',
    recast: '转发',
    
    // Deep Dive
    deepDiveTitle: '协议架构与深度教程',
    deepDiveSub: '全面解析 Snapchain BFT 共识、只读节点写入逻辑与无 Gas 密码学原理。',
    architectureTitle: '1. Snapchain 网络拓扑与 BFT 共识',
    readNodeRoleTitle: '2. 为什么只读节点可以处理写入操作',
    gaslessSignersTitle: '3. 无 Gas 签名密钥机制 (Snapchain Engine V16+)',
    clientFilterTheoryTitle: '4. 客户端过滤的实现原理',
    zeroApiKeyTitle: '5. 零 API 密钥对比中心化中继网关',
    
    // Diagnostics
    diagTitle: '实时节点诊断与延迟测速',
    diagDesc: '实时检测任何 Snapchain 只读节点或 Hubble Hub 的运行状况。',
    latency: '网络延迟',
    version: '引擎版本',
    peers: '连接节点数',
    syncStatus: '同步状态',
    totalMessages: '全网消息总数',
    totalFids: '已注册 FID 总数',
    
    // Footer
    openSourceNotice: '基于 MIT 许可证发布的完全开源软件。',
    voucherGuideLink: '真人见证人测试指南',
    videoScriptLink: '59 秒竖屏演示脚本',
    viewGithub: 'GitHub 开源代码库',
  },
};
