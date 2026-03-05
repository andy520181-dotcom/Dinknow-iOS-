const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { success: false, message: '未登录' }

  const { nickName, avatarUrl, gender, duprLevel, age, signature, region } = event || {}

  const updateData = {
    nickName: nickName != null ? String(nickName) : undefined,
    avatarUrl: avatarUrl != null ? String(avatarUrl) : undefined,
    gender: gender != null ? Number(gender) : undefined,
    duprLevel: duprLevel != null ? String(duprLevel) : undefined,
    age: age != null ? Number(age) : undefined,
    signature: signature != null ? String(signature).trim() : undefined,
    region: region != null ? String(region).trim() : undefined,
    updatedAt: Date.now()
  }
  Object.keys(updateData).forEach(k => updateData[k] === undefined && delete updateData[k])

  // NOTE: 内容安全检测 —— 检测昵称和签名是否包含违规内容
  try {
    const textToCheck = [updateData.nickName, updateData.signature]
      .filter(v => v && String(v).trim())
      .map(v => String(v).trim())
      .join(' ')

    if (textToCheck) {
      const checkResult = await cloud.openapi.security.msgSecCheck({
        openid: openid,
        scene: 2,
        version: 2,
        content: textToCheck
      })
      console.log('[updateProfile] 内容检测结果:', JSON.stringify(checkResult))

      if (checkResult.result && checkResult.result.suggest !== 'pass') {
        console.warn('[updateProfile] 内容违规，已拦截:', checkResult.result)
        return {
          success: false,
          contentRisk: true,
          message: '内容包含违规信息，请修改后重试'
        }
      }
    }
  } catch (checkErr) {
    // HACK: 检测接口异常时放行，避免阻塞正常业务
    console.error('[updateProfile] 内容检测异常（已放行）:', checkErr)
  }


  try {
    const exist = await db.collection('users').where({ openid }).get()
    if (exist.data && exist.data.length > 0) {
      await db.collection('users').doc(exist.data[0]._id).update({ data: updateData })
    } else {
      await db.collection('users').add({
        data: {
          openid,
          nickName: updateData.nickName || '匹克球友',
          avatarUrl: updateData.avatarUrl || '',
          gender: updateData.gender ?? 0,
          duprLevel: updateData.duprLevel !== undefined && updateData.duprLevel !== '' ? updateData.duprLevel : '',
          createdAt: Date.now(),
          ...updateData
        }
      })
    }
    return { success: true }
  } catch (e) {
    console.error('updateProfile', e)
    return { success: false, message: '保存失败' }
  }
}
