const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 活动即将开始提醒 — 定时触发云函数
 *
 * 每 30 分钟执行一次，扫描 30~90 分钟内即将开始的活动，
 * 向发起人和所有参与者推送「活动开始通知」
 *
 * 防重复：推送成功后在 activity 文档上打标 reminded: true
 */

// NOTE: 微信后台配置的「活动开始通知」模板
const TMPL_ACTIVITY_START = 'EqXTvFrQTTRP6vjDMk1GQw-T7-yjC6CrPTFfCXKlwPU'

exports.main = async () => {
    const now = Date.now()
    // NOTE: 扫描窗口：30 分钟 ~ 90 分钟后开始的活动
    // 30 分钟缓冲避免定时器漂移导致遗漏
    const windowStart = new Date(now + 30 * 60 * 1000)
    const windowEnd = new Date(now + 90 * 60 * 1000)

    console.log('[activityReminder] 扫描窗口:', windowStart.toISOString(), '~', windowEnd.toISOString())

    try {
        // 1. 查询所有 active 且未提醒的活动
        const actRes = await db.collection('activities')
            .where({
                status: 'active',
                reminded: _.neq(true)  // 未提醒过
            })
            .limit(100)
            .get()

        const activities = actRes.data || []
        console.log(`[activityReminder] 查询到 ${activities.length} 个未提醒活动`)

        let sentCount = 0

        for (const act of activities) {
            // 2. 解析活动开始时间
            const startStr = `${act.startDate} ${act.startTime}`
            const actStartTime = parseDateTime(act.startDate, act.startTime)

            if (!actStartTime) {
                console.warn('[activityReminder] 无法解析时间:', act._id, startStr)
                continue
            }

            // 3. 判断是否在扫描窗口内
            if (actStartTime < windowStart || actStartTime > windowEnd) {
                continue
            }

            console.log(`[activityReminder] 活动 ${act._id}「${act.title}」在窗口内，准备推送`)

            // 4. 查询该活动的所有参与者
            const regRes = await db.collection('registrations')
                .where({ activityId: act._id, status: 'joined' })
                .get()

            const participantIds = (regRes.data || []).map(r => r.userId)

            // 5. 发起人也要通知（合并去重）
            const allUserIds = [...new Set([act.hostId, ...participantIds])]

            // 6. 构造通知数据
            const dateTimeStr = [act.startDate, act.startTime].filter(Boolean).join(' ').slice(0, 20)
            const venueStr = (act.venueName || act.address || '—').slice(0, 20)
            const hostNameStr = (act.hostName || '匹克球友').slice(0, 20)
            const titleStr = (act.title || '').slice(0, 20)
            const notifyPage = `pages/activity-detail/index?id=${act._id}`

            const msgData = {
                thing4: { value: titleStr },                    // 活动名称
                thing2: { value: '您报名的活动即将开始' },         // 活动内容
                name1: { value: hostNameStr },                   // 活动发起
                date5: { value: dateTimeStr },                   // 活动时间
                thing6: { value: venueStr }                      // 活动地点
            }

            // 7. 逐个发送通知（忽略单个失败，不影响其他用户）
            const sends = allUserIds.map(uid =>
                cloud.callFunction({
                    name: 'sendSubscribeMsg',
                    data: {
                        touser: uid,
                        templateId: TMPL_ACTIVITY_START,
                        page: notifyPage,
                        data: msgData
                    }
                }).catch(e => {
                    console.warn(`[activityReminder] 推送失败 user=${uid}:`, e.errCode || e.message)
                })
            )
            await Promise.all(sends)

            // 8. 标记已提醒，防止下次重复推送
            await db.collection('activities').doc(act._id).update({
                data: { reminded: true }
            })

            sentCount++
            console.log(`[activityReminder] 活动 ${act._id} 推送完成，共 ${allUserIds.length} 人`)
        }

        console.log(`[activityReminder] 本次共推送 ${sentCount} 个活动`)
        return { success: true, sentCount }

    } catch (e) {
        console.error('[activityReminder] 执行失败:', e)
        return { success: false, message: e.message }
    }
}

/**
 * 解析日期 + 时间字符串为 Date 对象
 * @param dateStr "2026-03-10" 格式
 * @param timeStr "14:00" 或 "14:00-16:00" 格式（取开始时间）
 * @returns Date | null
 */
function parseDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null
    try {
        // NOTE: timeStr 可能包含结束时间（如 "14:00-16:00"），只取开始部分
        const startTimePart = String(timeStr).split('-')[0].trim()
        const combined = `${dateStr}T${startTimePart}:00+08:00`
        const d = new Date(combined)
        return isNaN(d.getTime()) ? null : d
    } catch {
        return null
    }
}
