const app = getApp()

Page({
  data: {
    // 用户信息
    currentUser: null,
    isAdmin: false,
    userGameName: '',
    
    // 搜索和过滤
    searchKeyword: '',
    viewFilter: 'all', // all, owned, notOwned, toGrow
    minScore: '',
    maxScore: '',
    sortBy: 'scoreDesc', // scoreDesc, scoreAsc, name
    
    // 花朵数据
    flowers: [],
    
    // 弹窗控制
    showInputModal: false, // 录入用户弹窗
    showAddFlowerModal: false, // 添加花朵弹窗
    inputGameName: '',
    
    // 新花朵表单
    newFlower: {
      name: '',
      score: '',
      type: '元宝活动',
      image: ''
    },
    
    // 花朵类型选项
    flowerTypes: ['元宝活动', '花灵活动', '鲜花礼包', '花圃', '花坊', '卡册活动', '其他']
  },

  onLoad() {
    console.log('🌸 花园世界工会助手加载');
    this.initCloud();
    this.checkLogin();
  },

  onPullDownRefresh() {
    this.loadFlowers();
    wx.stopPullDownRefresh();
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV
    });
  },

  // 检查登录状态
  async checkLogin() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: { action: 'getCurrentUser' }
      });
      
      if (result.success && result.user) {
        this.setData({
          currentUser: result.user,
          isAdmin: result.user.role === 'admin',
          userGameName: result.user.gameName || (result.user.role === 'admin' ? 'admin' : '')
        });
      }
      this.loadFlowers();
    } catch (err) {
      console.error('检查登录失败:', err);
    }
  },

  // 点击录入按钮
  onTapInput() {
    if (this.data.isAdmin) {
      // 管理员可以录入任意用户
      this.setData({ showInputModal: true, inputGameName: '' });
    } else {
      // 普通用户只能录入自己
      this.inputSelf();
    }
  },

  // 普通用户录入自己
  async inputSelf() {
    if (this.data.currentUser && this.data.currentUser.gameName) {
      wx.showToast({ title: '您已经录入过啦～', icon: 'none' });
      return;
    }
    
    wx.showModal({
      title: '录入信息',
      editable: true,
      placeholderText: '请输入您的游戏昵称',
      success: async (res) => {
        if (res.confirm && res.content) {
          await this.doInputUser(res.content);
        }
      }
    });
  },

  // 管理员录入用户弹窗确认
  async onConfirmInput() {
    if (!this.data.inputGameName.trim()) {
      wx.showToast({ title: '请输入游戏昵称', icon: 'none' });
      return;
    }
    await this.doInputUser(this.data.inputGameName);
    this.setData({ showInputModal: false });
  },

  // 执行录入用户
  async doInputUser(gameName) {
    wx.showLoading({ title: '录入中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'inputUser',
          gameName: gameName.trim()
        }
      });
      
      if (result.success) {
        wx.showToast({ title: '录入成功！', icon: 'success' });
        this.checkLogin(); // 刷新用户信息
      } else {
        wx.showToast({ title: result.message || '录入失败', icon: 'none' });
      }
    } catch (err) {
      console.error('录入失败:', err);
      wx.showToast({ title: '录入失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载花朵列表
  async loadFlowers() {
    wx.showLoading({ title: '加载中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'getFlowers',
          searchKeyword: this.data.searchKeyword,
          viewFilter: this.data.viewFilter,
          minScore: this.data.minScore ? parseInt(this.data.minScore) : null,
          maxScore: this.data.maxScore ? parseInt(this.data.maxScore) : null,
          sortBy: this.data.sortBy
        }
      });
      
      if (result.success) {
        this.setData({ flowers: result.flowers || [] });
      }
    } catch (err) {
      console.error('加载花朵失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm() {
    this.loadFlowers();
  },

  // 视图过滤
  onViewFilterChange(e) {
    this.setData({ viewFilter: e.detail.value });
    this.loadFlowers();
  },

  // 分数过滤
  onMinScoreInput(e) {
    this.setData({ minScore: e.detail.value });
  },

  onMaxScoreInput(e) {
    this.setData({ maxScore: e.detail.value });
  },

  onApplyScoreFilter() {
    this.loadFlowers();
  },

  // 排序
  onSortChange(e) {
    this.setData({ sortBy: e.detail.value });
    this.loadFlowers();
  },

  // 标记拥有花朵
  async onMarkOwned(e) {
    const flower = e.currentTarget.dataset.flower;
    if (!this.data.currentUser || !this.data.currentUser.gameName) {
      wx.showToast({ title: '请先录入您的信息', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '记录中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'markOwned',
          flowerId: flower._id
        }
      });
      
      if (result.success) {
        wx.showToast({ title: '记录成功！', icon: 'success' });
        this.loadFlowers(); // 刷新列表
      } else {
        wx.showToast({ title: result.message || '记录失败', icon: 'none' });
      }
    } catch (err) {
      console.error('记录失败:', err);
      wx.showToast({ title: '记录失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 点击添加花朵
  onTapAddFlower() {
    this.setData({
      showAddFlowerModal: true,
      newFlower: {
        name: '',
        score: '',
        type: '元宝活动',
        image: ''
      }
    });
  },

  // 选择花朵图片
  async onChooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      
      const tempFilePath = res.tempFilePaths[0];
      
      // 压缩图片
      const compressedImage = await this.compressImage(tempFilePath);
      
      // 上传到云存储
      wx.showLoading({ title: '上传中...' });
      const cloudPath = `flowers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: compressedImage
      });
      
      this.setData({
        'newFlower.image': uploadRes.fileID
      });
      wx.hideLoading();
      wx.showToast({ title: '图片上传成功！', icon: 'success' });
    } catch (err) {
      console.error('选择图片失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    }
  },

  // 压缩图片
  async compressImage(filePath) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src: filePath,
        success: (imgInfo) => {
          const maxWidth = 400;
          const maxHeight = 400;
          let width = imgInfo.width;
          let height = imgInfo.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          const ctx = wx.createCanvasContext('compressCanvas');
          ctx.drawImage(filePath, 0, 0, width, height);
          ctx.draw(false, () => {
            wx.canvasToTempFilePath({
              canvasId: 'compressCanvas',
              width: width,
              height: height,
              destWidth: width,
              destHeight: height,
              quality: 0.8,
              success: (res) => {
                resolve(res.tempFilePath);
              }
            });
          });
        },
        fail: () => {
          resolve(filePath);
        }
      });
    });
  },

  // 花朵名称输入
  onFlowerNameInput(e) {
    this.setData({ 'newFlower.name': e.detail.value });
  },

  // 花朵分数输入
  onFlowerScoreInput(e) {
    this.setData({ 'newFlower.score': e.detail.value });
  },

  // 花朵类型选择
  onFlowerTypeChange(e) {
    this.setData({ 'newFlower.type': this.data.flowerTypes[e.detail.value] });
  },

  // 确认添加花朵
  async onConfirmAddFlower() {
    const { name, score, type, image } = this.data.newFlower;
    
    if (!name.trim()) {
      wx.showToast({ title: '请输入花朵名称', icon: 'none' });
      return;
    }
    if (!score || isNaN(parseInt(score))) {
      wx.showToast({ title: '请输入有效的竞赛分数', icon: 'none' });
      return;
    }
    if (!image) {
      wx.showToast({ title: '请选择花朵图片', icon: 'none' });
      return;
    }
    
    wx.showLoading({ title: '添加中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'addFlower',
          flower: {
            name: name.trim(),
            score: parseInt(score),
            type: type,
            image: image
          }
        }
      });
      
      if (result.success) {
        wx.showToast({ title: '添加成功！', icon: 'success' });
        this.setData({ showAddFlowerModal: false });
        this.loadFlowers(); // 刷新列表
      } else {
        wx.showToast({ title: result.message || '添加失败', icon: 'none' });
      }
    } catch (err) {
      console.error('添加花朵失败:', err);
      wx.showToast({ title: '添加失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
})
