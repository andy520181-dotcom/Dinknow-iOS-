const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

/**
 * 生成小程序码（wxacode.getUnlimited）
 * @param {string} event.scene  - 场景值，一般传活动ID
 * @param {string} event.page   - 落地页路径（可选，默认活动详情页）
 * @returns {{ fileID: string, params: object }} 小程序码的云存储 fileID + 调试参数
 *
 * NOTE: getUnlimited 生成的码数量无限制，scene 参数最长 32 字符。
 */
exports.main = async (event) => {
    const scene = event.scene || ''
    const page = event.page || 'pages/activity-detail/index'

    // NOTE: cloud.openapi 底层走 HTTP API，参数名使用 snake_case
    const apiParams = {
        scene,
        page,
        width: 280,
        env_version: 'trial',
        // IMPORTANT: check_path=false 跳过验证，允许未发布页面
        check_path: false,
        is_hyaline: true
    }

    console.log('[generateMiniCode] 调用参数:', JSON.stringify(apiParams))

    try {
        const result = await cloud.openapi.wxacode.getUnlimited(apiParams)

        if (!result.buffer) {
            return { success: false, error: 'empty buffer', params: apiParams }
        }

        // 上传到云存储
        const cloudPath = `qrcodes/${scene || 'default'}_${Date.now()}.png`
        const upload = await cloud.uploadFile({
            cloudPath,
            fileContent: result.buffer
        })

        return { success: true, fileID: upload.fileID, params: apiParams }
    } catch (err) {
        console.error('[generateMiniCode] error:', err)
        return { success: false, error: err.message || String(err), params: apiParams }
    }
}
