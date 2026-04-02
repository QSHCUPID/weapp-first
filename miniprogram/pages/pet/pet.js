const DB = wx.cloud.database().collection('pet_posts');
const _ = wx.cloud.database().command;

Page({
  data: {
    posts: [],
    filteredPosts: [],
    currentFilter: 'all',
    loading: true,
    stats: {
      totalPosts: 0,
      photoCount: 0,
      videoCount: 0,
      totalLikes: 0
    },
    showAddModal: false,
    showViewModal: false,
    viewPost: {},
    newPost: {
      title: '',
      type: 'photo',
      content: '',
      filePath: '',
      fileID: ''
    },
    typeOptions: [
      { value: 'photo', label: '🖼️ 照片' },
      { value: 'video', label: '🎬 视频' },
      { value: 'text', label: '📝 纯文字' }
    ],
    typeIndex: 0,
    submitting: false
  },

  onLoad() {
    this.initCloud();
    this.loadPosts();
  },

  onPullDownRefresh() {
    this.loadPosts().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
  },

  async loadPosts() {
    this.setData({ loading: true });
    
    try {
      const { data } = await DB.orderBy('createdAt', 'desc').get();
      
      const posts = data.map(post => ({
        ...post,
        dateText: this.formatDate(post.createdAt)
      }));
      
      this.setData({ posts });
      this.updateStats();
      this.applyFilter();
    } catch (err) {
      console.error('加载动态失败:', err);
      
      if (err.errCode === -502003) {
        wx.showModal({
          title: '权限提示',
          content: '请在微信开发者工具-云开发控制台-数据库-pet_posts集合-权限设置中，将权限改为"所有用户可读，仅创建者可写"',
          showCancel: false
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      }
    }
    
    this.setData({ loading: false });
  },

  updateStats() {
    const { posts } = this.data;
    const stats = {
      totalPosts: posts.length,
      photoCount: posts.filter(p => p.type === 'photo').length,
      videoCount: posts.filter(p => p.type === 'video').length,
      totalLikes: posts.reduce((sum, p) => sum + (p.likes || 0), 0)
    };
    this.setData({ stats });
  },

  applyFilter() {
    const { posts, currentFilter } = this.data;
    let filteredPosts = posts;
    
    if (currentFilter !== 'all') {
      filteredPosts = posts.filter(p => p.type === currentFilter);
    }
    
    this.setData({ filteredPosts });
  },

  onFilterChange(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.applyFilter();
  },

  onPostClick(e) {
    const id = e.currentTarget.dataset.id;
    const post = this.data.posts.find(p => p._id === id);
    if (post) {
      this.setData({ viewPost: post, showViewModal: true });
    }
  },

  async onLikeClick(e) {
    const id = e.currentTarget.dataset.id;
    
    try {
      const post = this.data.posts.find(p => p._id === id);
      const newLikes = (post.likes || 0) + 1;
      
      await DB.doc(id).update({
        data: { likes: newLikes }
      });
      
      await this.loadPosts();
    } catch (err) {
      console.error('点赞失败:', err);
    }
  },

  async onDeleteClick(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条动态吗？删除后无法恢复！',
      success: async (res) => {
        if (res.confirm) {
          try {
            await DB.doc(id).remove();
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            await this.loadPosts();
          } catch (err) {
            console.error('删除失败:', err);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  onAddClick() {
    this.setData({
      showAddModal: true,
      newPost: {
        title: '',
        type: 'photo',
        content: '',
        filePath: '',
        fileID: ''
      },
      typeIndex: 0
    });
  },

  onModalClose() {
    this.setData({ showAddModal: false, showViewModal: false });
  },

  onTitleInput(e) {
    this.setData({ 'newPost.title': e.detail.value });
  },

  onTypeChange(e) {
    const index = e.detail.value;
    const type = this.data.typeOptions[index].value;
    this.setData({ 
      typeIndex: index, 
      'newPost.type': type,
      'newPost.filePath': ''
    });
  },

  onChooseMedia() {
    const { newPost } = this.data;
    
    if (newPost.type === 'photo') {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({ 'newPost.filePath': res.tempFilePaths[0] });
        }
      });
    } else if (newPost.type === 'video') {
      wx.chooseVideo({
        sourceType: ['album', 'camera'],
        maxDuration: 60,
        camera: 'back',
        success: (res) => {
          this.setData({ 'newPost.filePath': res.tempFilePath });
        }
      });
    }
  },

  onRemoveMedia() {
    this.setData({ 'newPost.filePath': '' });
  },

  onContentInput(e) {
    this.setData({ 'newPost.content': e.detail.value });
  },

  async onSubmit() {
    const { newPost } = this.data;
    
    if (!newPost.title) {
      wx.showToast({
        title: '请输入标题',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ submitting: true });
    
    try {
      let fileID = '';
      
      if (newPost.filePath && newPost.type !== 'text') {
        const cloudPath = `pet-posts/${Date.now()}-${Math.random().toString(36).substr(2, 9)}${this.getFileExt(newPost.filePath)}`;
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath,
          filePath: newPost.filePath
        });
        fileID = uploadRes.fileID;
      }
      
      await DB.add({
        data: {
          title: newPost.title,
          type: newPost.type,
          content: newPost.content,
          fileID,
          likes: 0,
          createdAt: new Date()
        }
      });
      
      wx.showToast({
        title: '发布成功！',
        icon: 'success'
      });
      
      this.setData({ showAddModal: false });
      await this.loadPosts();
      
    } catch (err) {
      console.error('发布失败:', err);
      wx.showToast({
        title: '发布失败',
        icon: 'none'
      });
    }
    
    this.setData({ submitting: false });
  },

  getFileExt(filePath) {
    const ext = filePath.split('.').pop();
    return ext ? `.${ext}` : '';
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
});
