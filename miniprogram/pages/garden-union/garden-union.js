const app = getApp()

Page({
  data: {
    // 用户信息
    currentUser: null,
    isAdmin: false,
    userGameName: '',
    
    // 管理员选择的游戏昵称
    selectedUserId: null,
    selectedGameName: '',
    
    // 所有游戏昵称列表（管理员用）
    allUsers: [],
    
    // 搜索和过滤
    searchKeyword: '',
    viewFilter: 'all', // all, owned, growing, notOwned
    minScore: '',
    maxScore: '',
    sortBy: 'scoreDesc', // scoreDesc, scoreAsc, name
    
    // 花朵数据
    flowers: [],
    
    // 弹窗控制
    showInputModal: false, // 录入用户弹窗
    showAddFlowerModal: false, // 添加花朵弹窗
    showUserPicker: false, // 用户选择器弹窗
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
    this.loadAllData();
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

  // 加载所有数据
  async loadAllData() {
    if (this.data.isAdmin) {
      await this.loadAllUsers();
    }
    await this.loadFlowers();
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
        
        // 如果是管理员，默认选择自己
        if (result.user.role === 'admin') {
          this.setData({
            selectedUserId: result.user._id,
            selectedGameName: result.user.gameName || 'admin'
          });
        }
      }
      await this.loadAllData();
    } catch (err) {
      console.error('检查登录失败:', err);
    }
  },

  // 加载所有用户（管理员用）
  async loadAllUsers() {
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: { action: 'getAllUsers' }
      });
      
      if (result.success) {
        this.setData({ allUsers: result.users || [] });
      }
    } catch (err) {
      console.error('加载用户列表失败:', err);
    }
  },

  // 点击游戏昵称区域（管理员可以选择）
  onTapUserGameName() {
    if (!this.data.isAdmin) {
      return; // 普通用户不能选择
    }
    this.setData({ showUserPicker: true });
  },

  // 选择用户
  onSelectUser(e) {
    const user = e.currentTarget.dataset.user;
    this.setData({
      selectedUserId: user._id,
      selectedGameName: user.gameName,
      showUserPicker: false
    });
    this.loadFlowers(); // 刷新花朵列表
  },

  // 点击录入按钮
  onTapInput() {
    // 只检测当前用户是否已录入过，不管是不是管理员
    if (this.data.currentUser && this.data.currentUser.gameName) {
      wx.showToast({ title: '您已经录入过啦～', icon: 'none' });
      return;
    }
    this.inputSelf();
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
        await this.checkLogin(); // 刷新用户信息
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

  // 获取图片临时链接
  async getTempUrl(fileID) {
    if (!fileID) return '';
    try {
      const res = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          fileID: fileID,
          action: 'getTempUrl'
        }
      });
      
      if (res.result.success) {
        return res.result.tempFileURL;
      }
      return fileID;
    } catch (err) {
      console.error('获取临时URL失败:', err);
      return fileID;
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
          sortBy: this.data.sortBy,
          selectedUserId: this.data.selectedUserId // 管理员选择的用户ID
        }
      });
      
      if (result.success) {
        // 为每个花朵获取临时图片链接
        const flowers = [];
        for (const flower of result.flowers || []) {
          const flowerWithUrl = {
            ...flower,
            displayImage: flower.image
          };
          
          if (flower.image) {
            flowerWithUrl.displayImage = await this.getTempUrl(flower.image);
          }
          
          flowers.push(flowerWithUrl);
        }
        
        this.setData({ flowers });
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

  // 切换培育状态（培育中/取消培育）
  async onToggleGrowing(e) {
    const flower = e.currentTarget.dataset.flower;
    
    if (this.data.isAdmin) {
      // 管理员：需要选择了用户才能操作
      if (!this.data.selectedUserId) {
        wx.showToast({ title: '请先选择游戏昵称', icon: 'none' });
        return;
      }
    } else {
      // 普通用户：需要先录入
      if (!this.data.currentUser || !this.data.currentUser.gameName) {
        wx.showToast({ title: '请先录入您的信息', icon: 'none' });
        return;
      }
    }
    
    const action = flower.isGrowing ? 'unmarkGrowing' : 'markGrowing';
    const message = flower.isGrowing ? '取消培育中...' : '记录培育中...';
    
    wx.showLoading({ title: message });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: action,
          flowerId: flower._id,
          selectedUserId: this.data.selectedUserId // 管理员选择的用户ID
        }
      });
      
      if (result.success) {
        const toastMsg = flower.isGrowing ? '已取消培育！' : '记录培育成功！';
        wx.showToast({ title: toastMsg, icon: 'success' });
        this.loadFlowers(); // 刷新列表
      } else {
        wx.showToast({ title: result.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('操作失败:', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 切换拥有状态（拥有/取消拥有）
  async onToggleOwned(e) {
    const flower = e.currentTarget.dataset.flower;
    
    if (this.data.isAdmin) {
      // 管理员：需要选择了用户才能操作
      if (!this.data.selectedUserId) {
        wx.showToast({ title: '请先选择游戏昵称', icon: 'none' });
        return;
      }
    } else {
      // 普通用户：需要先录入
      if (!this.data.currentUser || !this.data.currentUser.gameName) {
        wx.showToast({ title: '请先录入您的信息', icon: 'none' });
        return;
      }
    }
    
    const action = flower.isOwned ? 'unmarkOwned' : 'markOwned';
    const message = flower.isOwned ? '取消中...' : '记录中...';
    
    wx.showLoading({ title: message });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: action,
          flowerId: flower._id,
          selectedUserId: this.data.selectedUserId // 管理员选择的用户ID
        }
      });
      
      if (result.success) {
        const toastMsg = flower.isOwned ? '已取消拥有！' : '记录成功！';
        wx.showToast({ title: toastMsg, icon: 'success' });
        this.loadFlowers(); // 刷新列表
      } else {
        wx.showToast({ title: result.message || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('操作失败:', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none' });
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
      const cloudPath = `garden-union-flowers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}${this.getFileExt(compressedImage)}`;
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
  },

  // 获取文件扩展名
  getFileExt(filePath) {
    const ext = filePath.split('.').pop();
    return ext ? `.${ext}` : '.jpg';
  }
})
