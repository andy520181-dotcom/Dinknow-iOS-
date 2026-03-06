const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// NOTE: 直接返回 cloud:// 原始 URL，不做 getTempFileURL 转换；
// 微信 <image> 原生支持 cloud:// 协议，URL 永远稳定，从根本上消除 URL 变化引起的头像闪烁
async function attachActivityDetails(activities) {
  if (!Array.isArray(activities) || activities.length === 0) return activities
  const result = []
  for (const a of activities) {
    let currentCount = 0
    let participants = []
    let hostAvatar = null
    let hostName = null

    try {
      const countRes = await db.collection('registrations').where({ activityId: a._id, status: 'joined' }).count()
      currentCount = countRes.total || 0

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
                userMap[u.openid] = { userId: u.openid, avatarUrl: u.avatarUrl || '', nickName: u.nickName }
              })
            }
            participants = regRes.data.map(r => userMap[r.userId] || { userId: r.userId, avatarUrl: '', nickName: '' })
          }
        }
      }

      if (a.hostId) {
        try {
          const hostRes = await db.collection('users').where({ openid: a.hostId }).get()
          if (hostRes.data && hostRes.data.length > 0) {
            const host = hostRes.data[0]
            hostAvatar = host.avatarUrl || null
            hostName = host.nickName || null
          }
        } catch (e) {
          console.error('getUserActivities host', a._id, e)
        }
      }
    } catch (e) {
      console.error('getUserActivities details', a._id, e)
    }

    result.push({
      ...a,
      currentCount,
      participants,
      hostAvatar: hostAvatar !== null ? hostAvatar : (a.hostAvatar || null),
      hostName: hostName || a.hostName || null
    })
  }
  return result
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  if (!openid) return { created: [], joined: [] }

  try {
    const [createdRes, regRes] = await Promise.all([
      db.collection('activities').where({ hostId: openid }).orderBy('createdAt', 'desc').limit(50).get(),
      db.collection('registrations').where({ userId: openid, status: 'joined' }).orderBy('joinedAt', 'desc').limit(50).get()
    ])
    const createdRaw = createdRes.data || []
    const regs = regRes.data || []
    const activityIds = [...new Set(regs.map(r => r.activityId))]

    let joined = []
    if (activityIds.length > 0) {
      const joinedRes = await db.collection('activities').where({
        _id: db.command.in(activityIds)
      }).get()
      const map = (joinedRes.data || []).reduce((acc, a) => { acc[a._id] = a; return acc }, {})
      joined = regs.map(r => map[r.activityId]).filter(Boolean)
    }

    const created = await attachActivityDetails(createdRaw)
    const joinedWithDetails = await attachActivityDetails(joined)
    return { created, joined: joinedWithDetails }
  } catch (e) {
    console.error('getUserActivities', e)
    return { created: [], joined: [] }
  }
}
