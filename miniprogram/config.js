// 小程序配置文件
// 在这里可以控制各个功能模块的显示/隐藏

module.exports = {
  // 工具菜单配置
  tools: {
    // 花园世界工会助手
    gardenUnion: {
      enabled: true,
      name: '花园世界工会助手',
      icon: '🌸',
      description: '蕊香阁工会管理工具',
      path: '/pages/garden-union/garden-union'
    },
    // 棠棠成长日记
    pet: {
      enabled: false,  // 设置为 false 可以隐藏这个入口
      name: '棠棠成长日记',
      icon: '🐕',
      description: '记录毛茸茸的每一天',
      path: '/pages/pet/pet'
    },
    // 计算器
    calculator: {
      enabled: true,
      name: '计算器',
      icon: '🧮',
      description: '简单好用的计算器',
      path: '',
      comingSoon: true
    },
    // 待办清单
    todo: {
      enabled: true,
      name: '待办清单',
      icon: '📝',
      description: '管理你的待办事项',
      path: '',
      comingSoon: true
    },
    // 天气预报
    weather: {
      enabled: true,
      name: '天气预报',
      icon: '🌤️',
      description: '实时天气查询',
      path: '',
      comingSoon: true
    }
  }
}
