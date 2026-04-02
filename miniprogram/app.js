// 读取私密配置（不会上传到GitHub）
let secretConfig = {}
try {
  secretConfig = require('./config.secret')
} catch (e) {
  console.log('请创建 config.secret.js 文件并填写你的配置')
}

App({
  onLaunch: function () {
    this.globalData = {
      env: secretConfig.envId || "", // 从私密文件读取，不写死
    };

    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },
});