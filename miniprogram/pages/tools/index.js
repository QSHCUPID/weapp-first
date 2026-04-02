Page({
  data: {
    tools: [
      {
        id: 'calculator',
        name: '计算器',
        icon: '🧮',
        description: '简单好用的计算器',
        path: '',
        comingSoon: true
      },
      {
        id: 'pet',
        name: '棠棠成长日记',
        icon: '🐕',
        description: '记录毛茸茸的每一天',
        path: '',
        comingSoon: true
      },
      {
        id: 'todo',
        name: '待办清单',
        icon: '📝',
        description: '管理你的待办事项',
        path: '',
        comingSoon: true
      },
      {
        id: 'weather',
        name: '天气预报',
        icon: '🌤️',
        description: '实时天气查询',
        path: '',
        comingSoon: true
      }
    ]
  },

  onLoad() {
    console.log('🛠️ 工具大集合加载');
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
