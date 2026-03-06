/**
 * uploadToCOS 云函数
 * 生成 COS 预签名上传 URL，有效期 15 分钟，供小程序直传文件到 COS
 * 返回 { uploadUrl, cdnUrl } 后，小程序用 wx.uploadFile 直传 uploadUrl
 */
const COS = require('cos-nodejs-sdk-v5')

// NOTE: 从云函数环境变量读取 COS 配置，不硬编码密钥
const SECRET_ID = process.env.COS_SECRET_ID
const SECRET_KEY = process.env.COS_SECRET_KEY
const BUCKET = process.env.COS_BUCKET
const REGION = process.env.COS_REGION
const CDN_HOST = process.env.COS_CDN_HOST // e.g. https://dinknow-xxxx.file.myqcloud.com

exports.main = async (event) => {
    const { fileName, fileType } = event || {}

    if (!fileName) {
        return { success: false, message: '缺少 fileName 参数' }
    }

    if (!SECRET_ID || !SECRET_KEY || !BUCKET || !REGION || !CDN_HOST) {
        console.error('[uploadToCOS] 环境变量未配置')
        return { success: false, message: 'COS 环境变量未配置，请联系管理员' }
    }

    const cos = new COS({
        SecretId: SECRET_ID,
        SecretKey: SECRET_KEY,
    })

    // NOTE: 文件存储路径：avatars/ 或 activity-remarks/，按业务类型分类
    const cosKey = fileName // 前端负责构造完整路径，如 "avatars/userid_timestamp.jpg"

    try {
        // NOTE: 生成预签名 PUT URL，小程序直接用 wx.uploadFile 对此 URL 发 PUT 请求上传
        const uploadUrl = await new Promise((resolve, reject) => {
            cos.getObjectUrl(
                {
                    Bucket: BUCKET,
                    Region: REGION,
                    Key: cosKey,
                    Method: 'PUT',
                    Expires: 900, // 15 分钟有效期
                    Sign: true,
                    Headers: fileType ? { 'Content-Type': fileType } : {},
                },
                (err, data) => {
                    if (err) reject(err)
                    else resolve(data.Url)
                }
            )
        })

        // NOTE: CDN 访问 URL 永久有效，存入数据库替代 cloud:// 格式
        const cdnUrl = `${CDN_HOST}/${cosKey}`

        return { success: true, uploadUrl, cdnUrl }
    } catch (err) {
        console.error('[uploadToCOS] 生成预签名 URL 失败:', err)
        return { success: false, message: '生成上传链接失败，请重试' }
    }
}
