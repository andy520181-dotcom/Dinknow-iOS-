/**
 * 内容安全检测云函数
 * 封装微信官方 msgSecCheck（文字）和 mediaCheckAsync（图片）API
 * NOTE: 微信小程序平台强制要求 UGC 场景必须接入内容安全检测
 */
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 文字内容安全检测
 * @param {string} content 待检测的文字内容
 * @param {string} openid 用户 openid（用于追踪违规用户）
 * @returns {{ safe: boolean, label?: string }} 检测结果
 */
async function checkText(content, openid) {
    if (!content || !content.trim()) return { safe: true }

    try {
        const result = await cloud.openapi.security.msgSecCheck({
            openid: openid,
            scene: 2, // NOTE: scene=2 表示评论场景，适用于 UGC 文字
            version: 2, // NOTE: 使用 v2 版本，支持异步检测和更精准的识别
            content: content.trim()
        })

        console.log('[contentCheck] 文字检测结果:', JSON.stringify(result))

        // NOTE: result.result.suggest: 'pass'=通过, 'review'=需人工审核, 'risky'=违规
        // result.result.label: 违规类型标签
        if (result.result && result.result.suggest === 'pass') {
            return { safe: true }
        }

        return {
            safe: false,
            label: result.result?.label || 'unknown'
        }
    } catch (err) {
        console.error('[contentCheck] 文字检测异常:', err)
        // NOTE: 检测接口异常时放行，避免阻塞正常业务
        // 但记录日志以便排查
        return { safe: true, error: true }
    }
}

/**
 * 图片内容安全检测（异步）
 * @param {string} mediaUrl 云文件 ID 或图片 URL
 * @param {string} openid 用户 openid
 * @returns {{ safe: boolean, traceId?: string }} 检测结果
 */
async function checkImage(mediaUrl, openid) {
    if (!mediaUrl) return { safe: true }

    try {
        const result = await cloud.openapi.security.mediaCheckAsync({
            mediaUrl: mediaUrl,
            mediaType: 2, // NOTE: 2=图片
            version: 2,
            scene: 2, // 评论场景
            openid: openid
        })

        console.log('[contentCheck] 图片检测提交:', JSON.stringify(result))

        // NOTE: mediaCheckAsync 是异步的，提交后会通过消息推送返回结果
        // 这里只确认提交成功，后续需配置消息推送回调处理
        return { safe: true, traceId: result.traceId }
    } catch (err) {
        console.error('[contentCheck] 图片检测异常:', err)
        return { safe: true, error: true }
    }
}

/**
 * 批量检测多个文字字段
 * NOTE: 将多个字段合并为一段文本进行检测，减少 API 调用次数
 * @param {Object} fields 字段对象，如 { title: '...', description: '...' }
 * @param {string} openid 用户 openid
 * @returns {{ safe: boolean, label?: string }}
 */
async function checkTextFields(fields, openid) {
    // 合并所有非空字段为一段文本，用空格分隔
    const combined = Object.values(fields)
        .filter(v => v && String(v).trim())
        .map(v => String(v).trim())
        .join(' ')

    if (!combined) return { safe: true }

    return checkText(combined, openid)
}

// 云函数入口 —— 也可单独调用进行内容检测
exports.main = async (event) => {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    const { type, content, fields, mediaUrl } = event || {}

    if (type === 'text' && content) {
        return checkText(content, openid)
    }

    if (type === 'textFields' && fields) {
        return checkTextFields(fields, openid)
    }

    if (type === 'image' && mediaUrl) {
        return checkImage(mediaUrl, openid)
    }

    return { safe: true, message: '无内容需检测' }
}

// 导出工具函数供其他云函数内联调用
exports.checkText = checkText
exports.checkImage = checkImage
exports.checkTextFields = checkTextFields
