const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// NOTE: 活动取消通知模板（删除活动等同取消）
const TMPL_CANCEL_ACT = 'aiot1Xyg2C0SOU8vDww1hCop-VGNgHgHM5WP1yR5D30'

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { success: false, message: '未登录' }

  const { activityId } = event || {}
  if (!activityId) return { success: false, message: '缺少活动ID' }

  try {
    // 检查活动是否存在且是当前用户发起的
    const actRes = await db.collection('activities').doc(activityId).get()
    if (!actRes.data || !actRes.data._id) {
      return { success: false, message: '活动不存在' }
    }
    const activity = actRes.data

    // 验证是否是活动发起人
    if (activity.hostId !== openid) {
      return { success: false, message: '无权删除此活动' }
    }

    // 查询已报名用户
    const regRes = await db.collection('registrations').where({ activityId, status: 'joined' }).get()
    const participants = (regRes.data || []).filter(r => r.userId !== openid)

    // NOTE: 删除前先推送「活动取消通知」给所有报名者
    if (participants.length > 0) {
      // 获取发起人昵称（name4 字段）
      let hostName = '发起人'
      try {
        const hostRes = await db.collection('users').where({ openid }).get()
        hostName = (hostRes.data?.[0]?.nickName || hostRes.data?.[0]?.nickname || '发起人').slice(0, 10)
      } catch (_) { }

      const actTitle = (activity.title || '').slice(0, 20)
      const actDateStr = (activity.startDate || '').slice(0, 20)
      const actVenue = (activity.venueName || activity.address || '—').slice(0, 20)

      await Promise.all(participants.map(r =>
        cloud.callFunction({
          name: 'sendSubscribeMsg',
          data: {
            touser: r.userId,
            templateId: TMPL_CANCEL_ACT,
            page: 'pages/index/index',
            data: {
              thing1: { value: actTitle },
              date2: { value: actDateStr },
              thing3: { value: actVenue },
              name4: { value: hostName },
              thing11: { value: '活动已取消，期待下次见' }
            }
          }
        }).catch(e => console.error('[deleteActivity] 推送取消通知失败:', r.userId, e))
      ))
    }

    // 删除所有报名记录
    if (regRes.data && regRes.data.length > 0) {
      await db.collection('registrations').where({ activityId }).remove()
    }

    // 删除活动
    await db.collection('activities').doc(activityId).remove()

    return { success: true, message: '删除成功' }
  } catch (e) {
    console.error('deleteActivity', e)
    return { success: false, message: '删除失败' }
  }
}

