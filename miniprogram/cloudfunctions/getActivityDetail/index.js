const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { activityId } = event || {}
  if (!activityId) return { activity: null }

  try {
    // 获取活动信息
    const actRes = await db.collection('activities').doc(activityId).get()
    if (!actRes.data || !actRes.data._id) {
      return { activity: null }
    }
    const activity = actRes.data

    // 统计报名人数
    let currentCount = 0
    let participants = []
    try {
      const countRes = await db.collection('registrations').where({ activityId, status: 'joined' }).count()
      currentCount = countRes.total || 0

      if (currentCount > 0) {
        const regRes = await db.collection('registrations')
          .where({ activityId, status: 'joined' })
          .orderBy('joinedAt', 'asc')
          .limit(17)
          .get()

        if (regRes.data && regRes.data.length > 0) {
          const openids = regRes.data.map(r => r.userId).filter(Boolean)
          if (openids.length > 0) {
            const usersRes = await db.collection('users')
              .where({ openid: db.command.in(openids) })
              .get()

            const userMap = {}
            if (usersRes.data) {
              usersRes.data.forEach(u => {
                // NOTE: 直接使用 cloud:// 原始 URL，<image> 原生支持，不做 getTempFileURL 转换
                userMap[u.openid] = {
                  userId: u.openid,
                  avatarUrl: u.avatarUrl || '',
                  nickName: u.nickName,
                  gender: u.gender,
                  duprLevel: u.duprLevel,
                  region: u.region,
                  signature: u.signature
                }
              })
            }
            participants = regRes.data.map(r => userMap[r.userId] || { userId: r.userId, avatarUrl: '', nickName: '' })
          }
        }
      }
    } catch (e) {
      console.error('获取报名信息失败:', e)
    }

    // 从 users 表拉取发起人最新头像与昵称
    let hostAvatar = activity.hostAvatar || null
    let hostName = activity.hostName || null
    let hostGender = null
    let hostDuprLevel = null
    let hostRegion = null
    let hostSignature = null
    if (activity.hostId) {
      try {
        const hostRes = await db.collection('users').where({ openid: activity.hostId }).get()
        if (hostRes.data && hostRes.data.length > 0) {
          const host = hostRes.data[0]
          // NOTE: 直接返回 cloud:// 原始 URL，无需 getTempFileURL 转换
          // 微信 <image> 原生支持 cloud:// 协议，URL 永不变化，彻底消除头像闪烁
          hostAvatar = host.avatarUrl || hostAvatar
          hostName = host.nickName || hostName
          hostGender = host.gender
          hostDuprLevel = host.duprLevel
          hostRegion = host.region
          hostSignature = host.signature
        }
      } catch (e) {
        console.error('获取发起人信息失败:', e)
      }
    }

    // NOTE: 备注图片直接返回 cloud:// 原始 fileID，不做 getTempFileURL 转换
    // 微信 <image> 原生支持 cloud:// 协议展示，URL 稳定不变
    const remarkImages = Array.isArray(activity.images) ? activity.images : []

    return {
      activity: {
        ...activity,
        images: remarkImages.length > 0 ? remarkImages : undefined,
        currentCount,
        participants,
        hostAvatar,
        hostName,
        hostGender,
        hostDuprLevel,
        hostRegion,
        hostSignature
      }
    }
  } catch (e) {
    console.error('getActivityDetail', e)
    return { activity: null }
  }
}
