// 小程序配置 - 直接写在这里避免 require 路径问题
const config = {
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
      enabled: false,
      name: '计算器',
      icon: '🧮',
      description: '简单好用的计算器',
      path: '',
      comingSoon: true
    },
    // 待办清单
    todo: {
      enabled: false,
      name: '待办清单',
      icon: '📝',
      description: '管理你的待办事项',
      path: '',
      comingSoon: true
    },
    // 天气预报
    weather: {
      enabled: false,
      name: '天气预报',
      icon: '🌤️',
      description: '实时天气查询',
      path: '',
      comingSoon: true
    }
  }
}

Page({
  data: {
    tools: []
  },

  onLoad() {
    console.log('🛠️ 工具大集合加载');
    this.loadTools();
  },

  // 从配置加载工具列表
  loadTools() {
    const tools = [];
    
    // 遍历配置中的工具
    for (const [id, toolConfig] of Object.entries(config.tools)) {
      // 只显示 enabled 为 true 的工具
      if (toolConfig.enabled) {
        tools.push({
          id: id,
          name: toolConfig.name,
          icon: toolConfig.icon,
          description: toolConfig.description,
          path: toolConfig.path,
          comingSoon: toolConfig.comingSoon || false
        });
      }
    }
    
    this.setData({ tools });
    console.log('✅ 加载了', tools.length, '个工具');
  },

  openTool(e) {
    const tool = e.currentTarget.dataset.tool;
    
    if (tool.comingSoon) {
      wx.showToast({
        title: '敬请期待～',
        icon: 'none'
      });
      return;
    }
    
    if (tool.path) {
      wx.navigateTo({
        url: tool.path
      });
    }
  }
})
