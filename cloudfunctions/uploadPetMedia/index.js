const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const { fileID, action } = event
  
  try {
    if (action === 'upload') {
      return {
        success: true,
        fileID: fileID
      }
    }
    
    if (action === 'getTempUrl') {
      const result = await cloud.getTempFileURL({
        fileList: [fileID]
      })
      return {
        success: true,
        tempFileURL: result.fileList[0].tempFileURL
      }
    }
    
    return {
      success: false,
      error: '未知操作'
    }
  } catch (err) {
    console.error('云函数执行失败:', err)
    return {
      success: false,
      error: err.message
    }
  }
}
