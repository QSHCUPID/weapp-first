const config = require('../../config.js')

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
