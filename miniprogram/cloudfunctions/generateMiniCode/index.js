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
    const page = event.page || 'pages/activity-detail/index'

    try {
        const result = await cloud.openapi.wxacode.getUnlimited({
            scene,
            page,
            width: 280,
            // NOTE: 设为 release 生成正式版码；开发期间可改为 develop / trial
            envVersion: 'release',
            isHyaline: true // 透明背景
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
