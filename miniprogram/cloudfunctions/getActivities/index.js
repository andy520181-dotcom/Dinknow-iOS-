const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { keyword, latitude, longitude } = event || {}

  try {
    let query = db.collection('activities')
    if (keyword && String(keyword).trim()) {
      query = query.where({
        title: db.RegExp({ regexp: String(keyword).trim(), options: 'i' })
      })
    }
    const { data } = await query.orderBy('createdAt', 'desc').limit(100).get()
    const list = Array.isArray(data) ? data : []

    const withCount = []
    for (const a of list) {
      let currentCount = 0
      let participants = []
      let hostAvatar = null
      let hostName = null

      try {
        // 统计报名人数
        const countRes = await db.collection('registrations').where({ activityId: a._id, status: 'joined' }).count()
        currentCount = countRes.total || 0

        // 获取已报名用户信息（最多17个）
        if (currentCount > 0) {
          const regRes = await db.collection('registrations')
            .where({ activityId: a._id, status: 'joined' })
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
                  // NOTE: 直接使用 cloud:// 或 https:// 原始 URL，<image> 原生支持 cloud://，无需转换
                  userMap[u.openid] = { userId: u.openid, avatarUrl: u.avatarUrl || '', nickName: u.nickName }
                })
              }
              participants = regRes.data.map(r => userMap[r.userId] || { userId: r.userId, avatarUrl: '', nickName: '' })
            }
          }
        }

        // 获取发起人最新头像和昵称
        if (a.hostId) {
          try {
            const hostRes = await db.collection('users').where({ openid: a.hostId }).get()
            if (hostRes.data && hostRes.data.length > 0) {
              const host = hostRes.data[0]
              // NOTE: 直接返回 cloud:// 原始 URL，不做 getTempFileURL 转换；
              // 微信 <image> 原生支持 cloud:// 协议，URL 稳定不变，从根本上消除因新旧 URL 字符串差异导致的闪烁
              hostAvatar = host.avatarUrl || null
              hostName = host.nickName || null
            }
          } catch (e) {
            console.error('获取创建者信息失败:', e)
          }
        }
      } catch (e) {
        console.error('获取报名信息失败:', e)
      }

      withCount.push({
        ...a,
        currentCount,
        participants,
        hostAvatar: hostAvatar !== null ? hostAvatar : (a.hostAvatar || null),
        hostName: hostName || a.hostName || null
      })
    }
    return { list: withCount }
  } catch (e) {
    console.error('getActivities', e)
    return { list: [] }
  }
}
