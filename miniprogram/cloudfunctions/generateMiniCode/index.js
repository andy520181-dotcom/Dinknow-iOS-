const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 生成小程序码（wxacode.getUnlimited）
 * @param {string} event.scene  - 场景值，一般传活动ID
 * @param {string} event.page   - 落地页路径（可选，默认活动详情页）
 * @returns {{ fileID: string }} 小程序码的云存储 fileID
 *
 * NOTE: getUnlimited 生成的码数量无限制，scene 参数最长 32 字符。
 * 小程序需要已发布正式版才能生成指向正式版的码。
 */
exports.main = async (event) => {
    const scene = event.scene || ''
    // NOTE: page 留空则默认指向小程序首页，避免 invalid page 报错
    const page = event.page || ''

    try {
        // NOTE: page 传入活动详情页路径，扫码直达对应活动
        const result = await cloud.openapi.wxacode.getUnlimited({
            scene,
            page: page || undefined,
            width: 280,
            // NOTE: 开发阶段用 trial（体验版）；正式发布后改回 release
            envVersion: 'trial',
            isHyaline: true
        })

        if (!result.buffer) {
            return { success: false, error: 'empty buffer' }
        }

        // 上传到云存储，路径按 scene 哈希，相同活动复用同一码
        const cloudPath = `qrcodes/${scene || 'default'}_${Date.now()}.png`
        const upload = await cloud.uploadFile({
            cloudPath,
            fileContent: result.buffer
        })

        return { success: true, fileID: upload.fileID }
    } catch (err) {
        console.error('[generateMiniCode] error:', err)
        return { success: false, error: err.message || String(err) }
    }
}
