const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

// 超级管理员的 openid 列表（大帅可以在这里添加其他管理员）
const ADMIN_OPENIDS = [
  // 大帅的 openid 会在这里，需要在云开发控制台获取后添加
  // '你的openid',
]

// 数据库集合名称
const COLLECTIONS = {
  USERS: 'gu_users',      // 用户表
  FLOWERS: 'gu_flowers',  // 花朵表
  OWNERSHIPS: 'gu_ownerships' // 拥有记录表
}

// 云函数入口
exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event
  
  console.log('🌸 收到请求:', action, 'OPENID:', OPENID)
  
  try {
    // 确保数据库集合存在（如果不存在会自动创建）
    await ensureCollections()
    
    // 检查是否是管理员
    const isAdmin = ADMIN_OPENIDS.includes(OPENID) || await checkIsAdmin(OPENID)
    
    switch (action) {
      case 'getCurrentUser':
        return await getCurrentUser(OPENID, isAdmin)
      case 'inputUser':
        return await inputUser(OPENID, event.gameName, isAdmin)
      case 'getFlowers':
        return await getFlowers(OPENID, event)
      case 'markOwned':
        return await markOwned(OPENID, event.flowerId)
      case 'addFlower':
        return await addFlower(OPENID, event.flower)
      default:
        return { success: false, message: '未知操作' }
    }
  } catch (err) {
    console.error('❌ 云函数错误:', err)
    return { success: false, message: err.message }
  }
}

// 确保数据库集合存在（通过尝试查询来触发创建）
async function ensureCollections() {
  try {
    await db.collection(COLLECTIONS.USERS).limit(1).get()
  } catch (e) {}
  try {
    await db.collection(COLLECTIONS.FLOWERS).limit(1).get()
  } catch (e) {}
  try {
    await db.collection(COLLECTIONS.OWNERSHIPS).limit(1).get()
  } catch (e) {}
}

// 检查是否是管理员（通过用户表的 role 字段）
async function checkIsAdmin(openid) {
  const { data } = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .get()
  return data.length > 0 && data[0].role === 'admin'
}

// 获取当前用户信息
async function getCurrentUser(openid, isAdmin) {
  const { data } = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .get()
  
  let user = null
  if (data.length > 0) {
    user = data[0]
  } else if (isAdmin || ADMIN_OPENIDS.includes(openid)) {
    // 如果是管理员但用户表中没有记录，创建一个管理员用户
    const now = new Date()
    const result = await db.collection(COLLECTIONS.USERS).add({
      data: {
        openid,
        role: 'admin',
        gameName: 'admin',
        createdAt: now,
        updatedAt: now
      }
    })
    user = {
      _id: result._id,
      openid,
      role: 'admin',
      gameName: 'admin'
    }
  }
  
  return { success: true, user }
}

// 录入用户
async function inputUser(openid, gameName, isAdmin) {
  if (!gameName || !gameName.trim()) {
    return { success: false, message: '游戏昵称不能为空' }
  }
  
  const now = new Date()
  
  if (isAdmin) {
    // 管理员可以录入任意用户
    // 先检查是否已存在同名用户
    const { data: existingUsers } = await db.collection(COLLECTIONS.USERS)
      .where({ gameName: gameName.trim() })
      .get()
    
    if (existingUsers.length > 0) {
      return { success: false, message: '该游戏昵称已被录入' }
    }
    
    // 创建新用户（没有 openid，因为是录入别人）
    await db.collection(COLLECTIONS.USERS).add({
      data: {
        openid: '', // 空 openid 表示是管理员录入的用户
        role: 'user',
        gameName: gameName.trim(),
        createdAt: now,
        updatedAt: now
      }
    })
  } else {
    // 普通用户只能录入自己
    const { data: existingUsers } = await db.collection(COLLECTIONS.USERS)
      .where({ openid })
      .get()
    
    if (existingUsers.length > 0 && existingUsers[0].gameName) {
      return { success: false, message: '您已经录入过啦' }
    }
    
    if (existingUsers.length > 0) {
      // 更新已有用户
      await db.collection(COLLECTIONS.USERS)
        .doc(existingUsers[0]._id)
        .update({
          data: {
            gameName: gameName.trim(),
            updatedAt: now
          }
        })
    } else {
      // 创建新用户
      await db.collection(COLLECTIONS.USERS).add({
        data: {
          openid,
          role: 'user',
          gameName: gameName.trim(),
          createdAt: now,
          updatedAt: now
        }
      })
    }
  }
  
  return { success: true }
}

// 获取花朵列表
async function getFlowers(openid, params) {
  const { searchKeyword, viewFilter, minScore, maxScore, sortBy } = params
  
  // 构建查询条件
  let query = db.collection(COLLECTIONS.FLOWERS)
  
  // 搜索关键词
  if (searchKeyword && searchKeyword.trim()) {
    query = query.where({
      name: db.RegExp({
        regexp: searchKeyword.trim(),
        options: 'i'
      })
    })
  }
  
  // 分数过滤
  if (minScore !== null || maxScore !== null) {
    const scoreCondition = {}
    if (minScore !== null) scoreCondition._gte = minScore
    if (maxScore !== null) scoreCondition._lte = maxScore
    query = query.where({ score: scoreCondition })
  }
  
  // 先获取所有花朵
  const { data: flowers } = await query.get()
  
  // 获取所有用户信息
  const { data: allUsers } = await db.collection(COLLECTIONS.USERS).get()
  const userMap = {}
  allUsers.forEach(u => {
    userMap[u._id] = u.gameName
  })
  
  // 获取当前用户的拥有记录
  const { data: myOwnerships } = await db.collection(COLLECTIONS.OWNERSHIPS)
    .where({ openid })
    .get()
  const myOwnedFlowerIds = new Set(myOwnerships.map(o => o.flowerId))
  
  // 获取所有花朵的拥有记录
  const { data: allOwnerships } = await db.collection(COLLECTIONS.OWNERSHIPS).get()
  
  // 处理花朵数据
  let resultFlowers = flowers.map(flower => {
    // 获取这个花朵的所有拥有者
    const flowerOwnerships = allOwnerships.filter(o => o.flowerId === flower._id)
    const ownerIds = new Set(flowerOwnerships.map(o => o.userId))
    const owners = Array.from(ownerIds).map(id => userMap[id]).filter(Boolean)
    
    return {
      ...flower,
      isOwned: myOwnedFlowerIds.has(flower._id),
      ownerCount: owners.length,
      owners: owners
    }
  })
  
  // 视图过滤
  if (viewFilter === 'owned') {
    resultFlowers = resultFlowers.filter(f => f.isOwned)
  } else if (viewFilter === 'notOwned') {
    resultFlowers = resultFlowers.filter(f => !f.isOwned)
  } else if (viewFilter === 'toGrow') {
    // 待培育：可以根据需要自定义逻辑，这里暂时和未拥有一样
    resultFlowers = resultFlowers.filter(f => !f.isOwned)
  }
  
  // 排序
  if (sortBy === 'scoreDesc') {
    resultFlowers.sort((a, b) => b.score - a.score)
  } else if (sortBy === 'scoreAsc') {
    resultFlowers.sort((a, b) => a.score - b.score)
  } else if (sortBy === 'name') {
    resultFlowers.sort((a, b) => a.name.localeCompare(b.name))
  }
  
  return { success: true, flowers: resultFlowers }
}

// 标记拥有花朵
async function markOwned(openid, flowerId) {
  if (!flowerId) {
    return { success: false, message: '花朵ID不能为空' }
  }
  
  // 获取当前用户信息
  const { data: users } = await db.collection(COLLECTIONS.USERS)
    .where({ openid })
    .get()
  
  if (users.length === 0 || !users[0].gameName) {
    return { success: false, message: '请先录入您的信息' }
  }
  
  const userId = users[0]._id
  
  // 检查是否已经拥有
  const { data: existing } = await db.collection(COLLECTIONS.OWNERSHIPS)
    .where({ openid, flowerId })
    .get()
  
  if (existing.length > 0) {
    return { success: false, message: '您已经拥有这个花朵啦' }
  }
  
  // 添加拥有记录
  const now = new Date()
  await db.collection(COLLECTIONS.OWNERSHIPS).add({
    data: {
      openid,
      userId,
      flowerId,
      createdAt: now
    }
  })
  
  return { success: true }
}

// 添加花朵
async function addFlower(openid, flower) {
  if (!flower || !flower.name || !flower.score || !flower.type || !flower.image) {
    return { success: false, message: '请填写完整的花朵信息' }
  }
  
  const now = new Date()
  const result = await db.collection(COLLECTIONS.FLOWERS).add({
    data: {
      name: flower.name.trim(),
      score: parseInt(flower.score),
      type: flower.type,
      image: flower.image,
      createdBy: openid,
      createdAt: now,
      updatedAt: now
    }
  })
  
  return { success: true, flowerId: result._id }
}
