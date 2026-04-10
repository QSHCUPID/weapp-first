const app = getApp()

Page({
  data: {
    // 滚动控制
    showFixedHeader: false, // 是否显示固定头部
    
    // 用户信息
    currentUser: null,
    isAdmin: false,
    userGameName: '',
    needsInput: true, // 是否需要录入游戏昵称（用于阻止操作）
    
    // 管理员选择的游戏昵称
    selectedUserId: null,
    selectedGameName: '',
    
    // 所有游戏昵称列表（管理员用）
    allUsers: [],
    
    // 过滤模式：union（工会）或 personal（个人）
    filterMode: 'personal',
    
    // 搜索和过滤
    searchKeyword: '',
    viewFilter: 'all', // all, owned, growing, notOwned
    minScore: '',
    maxScore: '',
    sortBy: 'scoreDesc', // scoreDesc, scoreAsc, name
    
    // 花朵数据
    flowers: [],
    totalFlowerCount: 0, // 花朵总数（应用搜索和分数过滤后）
    filteredFlowerCount: 0, // 当前已查询出的数量（应用视图过滤后）
    
    // 分页相关
    pageNum: 1, // 当前页码
    pageSize: 10, // 每页数量
    hasMore: true, // 是否还有更多数据
    isLoading: false, // 是否正在加载
    
    // 弹窗控制
    showInputModal: false, // 录入用户弹窗
    showAddFlowerModal: false, // 添加花朵弹窗
    showEditFlowerModal: false, // 编辑花朵弹窗
    showUserPicker: false, // 用户选择器弹窗
    inputGameName: '',
    
    // 新花朵表单
    newFlower: {
      name: '',
      score: '',
      type: '元宝活动',
      image: ''
    },
    
    // 编辑花朵表单
    editFlower: {
      _id: '',
      name: '',
      score: '',
      type: '元宝活动',
      image: '',
      displayImage: ''
    },
    editFlowerTypeIndex: 0, // 编辑时花朵类型的索引
    editFlowerOwnerIds: [], // 编辑时已拥有该花朵的用户ID列表
    
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

  // 监听页面滚动
  onPageScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const threshold = 50; // 滚动阈值（像素），超过此值显示固定头部
    
    // 根据滚动位置决定是否显示固定头部
    if (scrollTop > threshold && !this.data.showFixedHeader) {
      this.setData({ showFixedHeader: true });
    } else if (scrollTop <= threshold && this.data.showFixedHeader) {
      this.setData({ showFixedHeader: false });
    }
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
        const gameName = result.user.gameName || (result.user.role === 'admin' ? 'admin' : '');
        const needsInput = !gameName || gameName === '未录入';
        
        this.setData({
          currentUser: result.user,
          isAdmin: result.user.role === 'admin',
          userGameName: gameName,
          needsInput: needsInput
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
      
      // 捕获权限错误并获取客户信息
      if (err.errCode === -501023 || (err.message && err.message.includes('permission denied'))) {
        this.handlePermissionError(err);
      } else {
        wx.showToast({
          title: '加载失败，请重试',
          icon: 'none',
          duration: 3000
        });
      }
    }
  },

  // 处理权限错误，获取客户信息
  async handlePermissionError(err) {
    console.error('🚨 权限错误详情:', err);
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    
    // 获取账号信息
    const accountInfo = wx.getAccountInfoSync();
    
    // 收集客户信息
    const customerInfo = {
      错误类型: '云函数权限错误',
      错误代码: err.errCode || '未知',
      错误信息: err.errMsg || err.message || '未知错误',
      云函数名称: 'gardenUnion',
      小程序信息: {
        appId: accountInfo.miniProgram.appId,
        版本: accountInfo.miniProgram.version || '开发版',
        环境: accountInfo.miniProgram.envVersion || 'develop'
      },
      设备信息: {
        系统: systemInfo.system,
        平台: systemInfo.platform,
        微信版本: systemInfo.version,
        基础库版本: systemInfo.SDKVersion,
        品牌: systemInfo.brand,
        型号: systemInfo.model
      },
      时间戳: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      完整错误堆栈: err.stack || '无堆栈信息'
    };
    
    // 打印到控制台
    console.log('📋 客户信息收集完成:', JSON.stringify(customerInfo, null, 2));
    
    // 显示错误提示和解决方案
    wx.showModal({
      title: '云函数权限错误',
      content: '检测到云函数权限配置问题，请联系管理员配置云函数权限规则。\n\n错误代码：-501023\n\n点击"复制信息"可复制详细错误信息发送给技术支持。',
      confirmText: '复制信息',
      cancelText: '我知道了',
      success: (res) => {
        if (res.confirm) {
          // 复制客户信息到剪贴板
          wx.setClipboardData({
            data: JSON.stringify(customerInfo, null, 2),
            success: () => {
              wx.showToast({
                title: '已复制错误信息',
                icon: 'success'
              });
            }
          });
        }
      }
    });
    
    // 可选：上报到服务器（如果有错误收集服务）
    // this.reportErrorToServer(customerInfo);
  },

  // 可选：上报错误到服务器
  async reportErrorToServer(errorInfo) {
    try {
      // 这里可以调用另一个云函数来记录错误
      // 注意：这个云函数需要配置为允许所有用户访问
      await wx.cloud.callFunction({
        name: 'errorLogger',
        data: {
          action: 'logError',
          errorInfo: errorInfo
        }
      });
    } catch (e) {
      console.error('上报错误失败:', e);
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

  // 关闭用户选择器
  onCloseUserPicker() {
    this.setData({
      showUserPicker: false
    });
  },

  // 拦截需要录入的操作
  interceptIfNeedsInput(operationName = '操作') {
    if (this.data.needsInput) {
      wx.showToast({
        title: '请录入信息',
        icon: 'none',
        duration: 2000
      });
      return true; // 需要拦截
    }
    return false; // 不需要拦截
  },

  // 点击录入按钮
  onTapInput() {
    // 录入按钮永远可以点击，不受 needsInput 限制
    this.inputSelf();
  },

  // 录入或更新自己的游戏昵称
  async inputSelf() {
    const currentGameName = this.data.currentUser?.gameName || '';
    
    wx.showModal({
      title: currentGameName ? '更新游戏昵称' : '录入信息',
      editable: true,
      placeholderText: '请输入您的游戏昵称',
      content: currentGameName, // 已录入的话，显示当前昵称
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

  // 切换过滤模式
  onFilterModeChange(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const mode = e.currentTarget.dataset.mode;
    this.setData({ 
      filterMode: mode,
      viewFilter: 'all' // 切换模式时重置视图过滤
    });
    this.loadFlowers();
  },

  // 加载花朵列表（支持首次加载和追加加载）
  async loadFlowers(append = false) {
    // 防止重复加载
    if (this.data.isLoading) {
      return;
    }
    if (append && !this.data.hasMore) {
      return;
    }
    
    // 如果不是追加加载，重置分页
    if (!append) {
      this.setData({
        pageNum: 1,
        hasMore: true,
        flowers: []
      });
    }
    
    this.setData({ isLoading: true });
    
    if (!append) {
      wx.showLoading({ title: '加载中...' });
    }
    
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'getFlowers',
          filterMode: this.data.filterMode,
          searchKeyword: this.data.searchKeyword,
          viewFilter: this.data.viewFilter,
          minScore: this.data.minScore ? parseInt(this.data.minScore) : null,
          maxScore: this.data.maxScore ? parseInt(this.data.maxScore) : null,
          sortBy: this.data.sortBy,
          selectedUserId: this.data.selectedUserId, // 管理员选择的用户ID
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize
        }
      });
      
      if (result.success) {
        // 为每个花朵获取临时图片链接
        const newFlowers = [];
        for (const flower of result.flowers || []) {
          const flowerWithUrl = {
            ...flower,
            displayImage: flower.image
          };
          
          if (flower.image) {
            flowerWithUrl.displayImage = await this.getTempUrl(flower.image);
          }
          
          newFlowers.push(flowerWithUrl);
        }
        
        // 根据是否追加决定如何更新列表
        const flowers = append 
          ? [...this.data.flowers, ...newFlowers]
          : newFlowers;
        
        this.setData({ 
          flowers,
          totalFlowerCount: result.totalCount || 0,
          filteredFlowerCount: result.filteredCount || 0,
          hasMore: result.hasMore || false,
          pageNum: result.currentPage || this.data.pageNum
        });
      }
    } catch (err) {
      console.error('加载花朵失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      if (!append) {
        wx.hideLoading();
      }
    }
  },
  
  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({ pageNum: this.data.pageNum + 1 });
      this.loadFlowers(true); // 追加加载
    }
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 搜索确认
  onSearchConfirm() {
    if (this.interceptIfNeedsInput()) return;
    this.loadFlowers();
  },

  // 视图标签点击
  onViewTagTap(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const filter = e.currentTarget.dataset.filter;
    this.setData({ viewFilter: filter });
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

  // 快速竞赛分过滤
  onQuickScoreFilter(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const score = e.currentTarget.dataset.score;
    
    // 如果点击的是当前已选中的标签，则清除过滤
    if (this.data.minScore == score && this.data.maxScore == score) {
      this.setData({
        minScore: '',
        maxScore: ''
      });
    } else {
      // 否则设置为该分数
      this.setData({
        minScore: score,
        maxScore: score
      });
    }
    
    this.loadFlowers();
  },

  // 排序
  onSortChange(e) {
    this.setData({ sortBy: e.detail.value });
    this.loadFlowers();
  },

  // 切换排序（点击箭头图标）
  onToggleSort() {
    let newSortBy;
    const currentSort = this.data.sortBy;
    
    // 在当前排序模式下切换升序/降序
    if (currentSort === 'scoreDesc') {
      newSortBy = 'scoreAsc'; // 按分数降序 -> 按分数升序
    } else if (currentSort === 'scoreAsc') {
      newSortBy = 'scoreDesc'; // 按分数升序 -> 按分数降序
    } else if (currentSort === 'ownerCount') {
      newSortBy = 'ownerCountAsc'; // 按人数降序 -> 按人数升序
    } else if (currentSort === 'ownerCountAsc') {
      newSortBy = 'ownerCount'; // 按人数升序 -> 按人数降序
    } else if (currentSort === 'name') {
      newSortBy = 'nameDesc'; // 按名称升序 -> 按名称降序
    } else if (currentSort === 'nameDesc') {
      newSortBy = 'name'; // 按名称降序 -> 按名称升序
    } else {
      newSortBy = 'scoreDesc'; // 默认：按分数降序
    }
    
    this.setData({ sortBy: newSortBy });
    this.loadFlowers();
  },

  // 切换排序模式（点击文字）
  onToggleSortMode() {
    let newSortBy;
    const currentSort = this.data.sortBy;
    
    // 循环切换：按分数 -> 按人数 -> 按名称 -> 按分数
    if (currentSort === 'scoreDesc' || currentSort === 'scoreAsc') {
      newSortBy = 'ownerCount'; // 按分数 -> 按人数
    } else if (currentSort === 'ownerCount') {
      newSortBy = 'name'; // 按人数 -> 按名称
    } else {
      newSortBy = 'scoreDesc'; // 按名称 -> 按分数（降序）
    }
    
    this.setData({ sortBy: newSortBy });
    this.loadFlowers();
  },

  // 点击花朵项（两种视图都显示提示）
  onFlowerItemTap(e) {
    if (this.interceptIfNeedsInput()) return;
    
    // 阻止事件冒泡，避免触发按钮点击
    if (e.target.dataset.flower) {
      const flower = e.currentTarget.dataset.flower;
      let message = '';
      
      if (this.data.filterMode === 'personal') {
        // 个人模式：根据个人状态显示提示
        if (flower.isOwned) {
          message = '恭喜您已拥有🌸';
        } else if (flower.isGrowing) {
          message = '正在培育ing';
        } else {
          message = '期待拥有(✧∀✧)';
        }
      } else {
        // 工会模式：根据工会拥有状态显示提示
        if (flower.ownerCount > 0) {
          message = `工会已拥有🌸\n${flower.ownerCount}人持有`;
        } else {
          message = '工会期待拥有(✧∀✧)';
        }
      }
      
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 点击花朵图片，全屏预览
  onFlowerImageClick(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const url = e.currentTarget.dataset.url;
    if (url) {
      wx.previewImage({
        urls: [url],
        current: url
      });
    }
  },

  // 切换培育状态（培育中/取消培育）
  async onToggleGrowing(e) {
    if (this.interceptIfNeedsInput()) return;
    
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
      const res = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: action,
          flowerId: flower._id,
          selectedUserId: this.data.selectedUserId // 管理员选择的用户ID
        }
      });
      
      console.log('培育状态切换结果:', res);
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const toastMsg = flower.isGrowing ? '期待拥有(✧∀✧)' : '正在培育ing';
        wx.showToast({ title: toastMsg, icon: 'none', duration: 2000 });
        
        // 手动更新本地状态，处理三种状态联动
        const flowers = this.data.flowers.map(f => {
          if (f._id === flower._id) {
            // 如果点击培育中，则取消已拥有状态
            if (!flower.isGrowing) {
              // 标记为培育中，取消已拥有
              return { ...f, isGrowing: true, isOwned: false };
            } else {
              // 取消培育中
              return { ...f, isGrowing: false };
            }
          }
          return f;
        });
        this.setData({ flowers });
      } else {
        wx.showToast({ title: res.result?.message || '操作失败', icon: 'none', duration: 2000 });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('操作失败:', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none', duration: 2000 });
    }
  },

  // 切换拥有状态（拥有/取消拥有）
  async onToggleOwned(e) {
    if (this.interceptIfNeedsInput()) return;
    
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
      const res = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: action,
          flowerId: flower._id,
          selectedUserId: this.data.selectedUserId // 管理员选择的用户ID
        }
      });
      
      console.log('拥有状态切换结果:', res);
      
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const toastMsg = flower.isOwned ? '期待拥有(✧∀✧)' : '恭喜您已拥有🌸';
        wx.showToast({ title: toastMsg, icon: 'none', duration: 2000 });
        
        // 手动更新本地状态，处理三种状态联动
        const flowers = this.data.flowers.map(f => {
          if (f._id === flower._id) {
            // 如果点击已拥有，则取消培育中状态
            if (!flower.isOwned) {
              // 标记为已拥有，取消培育中
              return { ...f, isOwned: true, isGrowing: false };
            } else {
              // 取消已拥有
              return { ...f, isOwned: false };
            }
          }
          return f;
        });
        this.setData({ flowers });
      } else {
        wx.showToast({ title: res.result?.message || '操作失败', icon: 'none', duration: 2000 });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('操作失败:', err);
      wx.showToast({ title: '操作失败，请重试', icon: 'none', duration: 2000 });
    }
  },

  // 点击添加花朵
  onTapAddFlower() {
    if (this.interceptIfNeedsInput()) return;
    
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

  // 取消添加花朵
  onCancelAddFlower() {
    this.setData({ showAddFlowerModal: false });
  },

  // 点击弹窗背景（隐藏键盘）
  onModalBackgroundTap() {
    // 点击背景时隐藏键盘
    wx.hideKeyboard();
  },

  // 点击弹窗内容区域（阻止事件冒泡）
  onModalContentTap() {
    // 阻止事件冒泡到背景，避免点击内容区域时隐藏键盘
  },

  // 选择花朵图片
  async onChooseImage() {
    // 检查是否已填写花朵名称
    if (!this.data.newFlower.name || !this.data.newFlower.name.trim()) {
      wx.showToast({ 
        title: '请先填写花朵名称', 
        icon: 'none',
        duration: 2000
      });
      return;
    }

    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['original'], // 使用原图，不压缩
        sourceType: ['album', 'camera']
      });
      
      const tempFilePath = res.tempFilePaths[0];
      
      // 上传到云存储，使用花朵名称作为文件名
      wx.showLoading({ title: '上传中...' });
      const flowerName = this.data.newFlower.name.trim();
      const fileExt = this.getFileExt(tempFilePath);
      const cloudPath = `garden-union-flowers/${flowerName}${fileExt}`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath // 直接使用原图，不压缩
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
        
        // 获取新花朵的临时图片链接
        const displayImage = await this.getTempUrl(image);
        
        // 将新花朵添加到列表第一个位置
        const newFlower = {
          _id: result.flowerId || result.flower?._id, // 使用云函数返回的ID
          name: name.trim(),
          score: parseInt(score),
          type: type,
          image: image,
          displayImage: displayImage,
          ownerCount: 0, // 新花朵默认无人拥有
          isOwned: false,
          isGrowing: false
        };
        
        this.setData({
          flowers: [newFlower, ...this.data.flowers],
          totalFlowerCount: this.data.totalFlowerCount + 1,
          filteredFlowerCount: this.data.filteredFlowerCount + 1
        });
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

  // 删除花朵
  async onDeleteFlower(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const flower = e.currentTarget.dataset.flower;
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除花朵「${flower.name}」吗？删除后无法恢复！`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            const { result } = await wx.cloud.callFunction({
              name: 'gardenUnion',
              data: {
                action: 'deleteFlower',
                flowerId: flower._id
              }
            });
            
            if (result.success) {
              wx.showToast({ title: '删除成功！', icon: 'success' });
              
              // 直接从列表中移除该花朵
              const flowers = this.data.flowers.filter(f => f._id !== flower._id);
              this.setData({
                flowers,
                totalFlowerCount: this.data.totalFlowerCount - 1,
                filteredFlowerCount: this.data.filteredFlowerCount - 1
              });
            } else {
              wx.showToast({ title: result.message || '删除失败', icon: 'none' });
            }
          } catch (err) {
            console.error('删除失败:', err);
            wx.showToast({ title: '删除失败，请重试', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        }
      }
    });
  },

  // 获取文件扩展名
  getFileExt(filePath) {
    const ext = filePath.split('.').pop();
    return ext ? `.${ext}` : '.jpg';
  },

  // 点击编辑花朵
  async onEditFlower(e) {
    if (this.interceptIfNeedsInput()) return;
    
    const flower = e.currentTarget.dataset.flower;
    
    wx.showLoading({ title: '加载中...' });
    
    try {
      // 获取该花朵的所有拥有者
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'getFlowerOwners',
          flowerId: flower._id
        }
      });
      
      if (result.success) {
        // 获取临时图片URL
        const displayImage = await this.getTempUrl(flower.image);
        
        console.log('=== 编辑花朵调试信息 ===');
        console.log('花朵ID:', flower._id);
        console.log('拥有者IDs（原始）:', result.ownerIds);
        
        // 确保 ownerIds 是数组
        const ownerIds = result.ownerIds || [];
        console.log('处理后的拥有者IDs:', ownerIds);
        
        // 为每个用户添加 isOwner 属性，避免在 WXML 中使用 indexOf
        const allUsersWithOwnership = this.data.allUsers.map(user => {
          const isOwner = ownerIds.includes(user._id);
          console.log(`用户 ${user.gameName} (ID: ${user._id}): isOwner = ${isOwner}`);
          return {
            ...user,
            isOwner: isOwner
          };
        });
        
        console.log('处理后的用户列表:', allUsersWithOwnership);
        
        // 设置编辑表单数据
        this.setData({
          showEditFlowerModal: true,
          editFlower: {
            _id: flower._id,
            name: flower.name,
            score: flower.score,
            type: flower.type,
            image: flower.image,
            displayImage: displayImage
          },
          editFlowerTypeIndex: this.data.flowerTypes.indexOf(flower.type),
          editFlowerOwnerIds: ownerIds,
          editFlowerAllUsers: allUsersWithOwnership // 新增：带有 isOwner 属性的用户列表
        }, () => {
          console.log('setData完成');
          console.log('editFlowerOwnerIds:', this.data.editFlowerOwnerIds);
          console.log('editFlowerAllUsers:', this.data.editFlowerAllUsers);
          console.log('=== 调试信息结束 ===');
        });
      } else {
        wx.showToast({ title: result.message || '加载失败', icon: 'none' });
      }
    } catch (err) {
      console.error('加载花朵信息失败:', err);
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 取消编辑花朵
  onCancelEditFlower() {
    this.setData({ showEditFlowerModal: false });
  },

  // 编辑花朵 - 选择图片
  async onEditChooseImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['original'],
        sourceType: ['album', 'camera']
      });
      
      const tempFilePath = res.tempFilePaths[0];
      
      wx.showLoading({ title: '上传中...' });
      const flowerName = this.data.editFlower.name.trim();
      const fileExt = this.getFileExt(tempFilePath);
      const cloudPath = `garden-union-flowers/${flowerName}_${Date.now()}${fileExt}`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempFilePath
      });
      
      // 获取临时URL用于预览
      const displayImage = await this.getTempUrl(uploadRes.fileID);
      
      this.setData({
        'editFlower.image': uploadRes.fileID,
        'editFlower.displayImage': displayImage
      });
      wx.hideLoading();
      wx.showToast({ title: '图片上传成功！', icon: 'success' });
    } catch (err) {
      console.error('选择图片失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '图片上传失败', icon: 'none' });
    }
  },

  // 编辑花朵 - 名称输入
  onEditFlowerNameInput(e) {
    this.setData({ 'editFlower.name': e.detail.value });
  },

  // 编辑花朵 - 分数输入
  onEditFlowerScoreInput(e) {
    this.setData({ 'editFlower.score': e.detail.value });
  },

  // 编辑花朵 - 类型选择
  onEditFlowerTypeChange(e) {
    this.setData({ 
      'editFlower.type': this.data.flowerTypes[e.detail.value],
      editFlowerTypeIndex: e.detail.value
    });
  },

  // 切换拥有者状态
  onToggleOwner(e) {
    const user = e.currentTarget.dataset.user;
    const ownerIds = [...this.data.editFlowerOwnerIds];
    const index = ownerIds.indexOf(user._id);
    
    if (index !== -1) {
      // 已拥有，取消勾选
      ownerIds.splice(index, 1);
    } else {
      // 未拥有，添加勾选
      ownerIds.push(user._id);
    }
    
    // 同步更新 editFlowerAllUsers 中的 isOwner 属性
    const updatedUsers = this.data.editFlowerAllUsers.map(u => {
      if (u._id === user._id) {
        return { ...u, isOwner: !u.isOwner };
      }
      return u;
    });
    
    console.log('切换拥有者:', user.gameName, '新状态:', index === -1 ? '已拥有' : '未拥有');
    
    this.setData({ 
      editFlowerOwnerIds: ownerIds,
      editFlowerAllUsers: updatedUsers
    });
  },

  // 确认编辑花朵
  async onConfirmEditFlower() {
    const { _id, name, score, type, image } = this.data.editFlower;
    const ownerIds = this.data.editFlowerOwnerIds;
    
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
    
    wx.showLoading({ title: '保存中...' });
    try {
      const { result } = await wx.cloud.callFunction({
        name: 'gardenUnion',
        data: {
          action: 'updateFlower',
          flowerId: _id,
          flower: {
            name: name.trim(),
            score: parseInt(score),
            type: type,
            image: image
          },
          ownerIds: ownerIds
        }
      });
      
      if (result.success) {
        wx.showToast({ title: '保存成功！', icon: 'success' });
        this.setData({ showEditFlowerModal: false });
        
        // 更新本地列表中的花朵信息
        const flowers = this.data.flowers.map(f => {
          if (f._id === _id) {
            return {
              ...f,
              name: name.trim(),
              score: parseInt(score),
              type: type,
              image: image,
              displayImage: this.data.editFlower.displayImage,
              ownerCount: ownerIds.length
            };
          }
          return f;
        });
        
        this.setData({ flowers });
      } else {
        wx.showToast({ title: result.message || '保存失败', icon: 'none' });
      }
    } catch (err) {
      console.error('保存失败:', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
})
