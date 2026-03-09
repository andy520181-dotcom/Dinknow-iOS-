/**
 * usePoster - 活动分享海报生成逻辑（v2 品牌风格）
 *
 * 设计规范：
 *  - 画布 1080×1920px（手机全屏高清比例）
 *  - 品牌棕渐变背景，无蓝条
 *  - 活动信息为白色圆角卡片 + 轻阴影
 *  - 底部品牌色文字 + 动态小程序码
 *
 * NOTE: 独立 composable，不修改 activity-detail 任何业务逻辑。
 */

import type { Activity } from '../types'
import { callCloudFunction } from '../services/cloud'

const CANVAS_ID = 'posterCanvas'
// NOTE: 1080×1920 为海报物理像素，canvas 坐标按此绘制
const W = 1080
const H = 1920

// 品牌色
const BRAND_PRIMARY = '#7C4E3A'
const BRAND_LIGHT = '#C9856A'
const WARM_WHITE = '#FDF8F5'

/**
 * 将 cloud:// URL 转换为可绘制的临时路径
 */
function getDrawableUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        if (!url) { reject(new Error('empty url')); return }
        if (url.startsWith('cloud://')) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ; (wx as any).getImageInfo({
                src: url,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                success: (res: any) => resolve(res.path),
                fail: reject,
            })
        } else {
            resolve(url)
        }
    })
}

/**
 * 在 canvas 上绘制圆角矩形路径（用于卡片）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
}

/**
 * 文字自动换行绘制
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    let line = ''
    let currentY = y
    for (let i = 0; i < text.length; i++) {
        const testLine = line + text[i]
        // NOTE: measureText 在小程序 canvas 中精度有限，按字符估算宽度
        const metrics = ctx.measureText(testLine)
        if (metrics && metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, x, currentY)
            line = text[i]
            currentY += lineHeight
        } else {
            line = testLine
        }
    }
    ctx.fillText(line, x, currentY)
    return currentY + lineHeight
}

/**
 * 核心：在页面 canvas 上绘制海报，导出临时文件路径
 * @param activity   活动数据
 * @param dateText   格式化日期时间
 * @param feeText    格式化费用
 * @param instance   页面/组件实例（getCurrentInstance()?.proxy）
 */
export async function generatePoster(
    activity: Activity,
    dateText: string,
    feeText: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instance: any
): Promise<string> {
    const ctx = uni.createCanvasContext(CANVAS_ID, instance)

    // ══════════════════════════════════════════
    // 1. 整体背景：品牌棕渐变 → 暖白
    // ══════════════════════════════════════════
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H)
    bgGradient.addColorStop(0, BRAND_PRIMARY)
    bgGradient.addColorStop(0.22, BRAND_LIGHT)
    bgGradient.addColorStop(0.38, WARM_WHITE)
    bgGradient.addColorStop(1, '#FFFFFF')
    ctx.setFillStyle(bgGradient)
    ctx.fillRect(0, 0, W, H)

    // ══════════════════════════════════════════
    // 2. 顶部品牌名
    // ══════════════════════════════════════════
    ctx.setFillStyle(WARM_WHITE)
    ctx.setFontSize(56)
    ctx.setTextAlign('center')
    ctx.setTextBaseline('middle')
    ctx.fillText('Dinknow', W / 2, 120)

    // NOTE: 副标题
    ctx.setFontSize(28)
    ctx.setFillStyle('rgba(253, 248, 245, 0.75)')
    ctx.fillText('匹克球活动平台', W / 2, 180)

    // ══════════════════════════════════════════
    // 3. 活动信息卡片（白色圆角 + 阴影）
    // ══════════════════════════════════════════
    const cardX = 60
    const cardY = 280
    const cardW = W - 120
    const cardH = 980
    const cardR = 32

    // NOTE: 用多层半透明矩形模拟阴影（canvas 2d 不支持 boxShadow）
    ctx.setFillStyle('rgba(0, 0, 0, 0.04)')
    roundRect(ctx, cardX + 6, cardY + 8, cardW, cardH, cardR)
    ctx.fill()
    ctx.setFillStyle('rgba(0, 0, 0, 0.03)')
    roundRect(ctx, cardX + 3, cardY + 4, cardW, cardH, cardR)
    ctx.fill()

    // 白色卡片本体
    ctx.setFillStyle('#FFFFFF')
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR)
    ctx.fill()

    // ── 卡片内容 ──
    const px = cardX + 56 // 卡片内左边距
    const contentW = cardW - 112 // 内容区宽度
    ctx.setTextAlign('left')
    ctx.setTextBaseline('top')

    // 活动标题（粗体大字）
    ctx.setFillStyle('#1a1a1a')
    ctx.setFontSize(48)
    let nextY = drawWrappedText(ctx, activity.title || '活动', px, cardY + 56, contentW, 64)

    // 分割线
    nextY += 16
    ctx.setStrokeStyle('#f0f0f0')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(px, nextY)
    ctx.lineTo(px + contentW, nextY)
    ctx.stroke()
    nextY += 32

    // 信息行
    const infoItems = [
        { label: '时间', value: dateText },
        { label: '地点', value: activity.venueName || activity.address || '待定' },
        { label: '费用', value: feeText },
        { label: '人数', value: `${(activity as any).participants?.length || 0} / ${activity.maxParticipants || '不限'}` },
        { label: '发起人', value: activity.hostName || '匹克球友' },
    ]

    for (const item of infoItems) {
        // 标签
        ctx.setFontSize(32)
        ctx.setFillStyle('#999999')
        ctx.fillText(item.label, px, nextY)

        // 值
        ctx.setFillStyle('#333333')
        ctx.setFontSize(34)
        // NOTE: 标签宽度固定 160px，值从标签右侧开始
        const valueX = px + 170
        const valueMaxW = contentW - 170
        nextY = drawWrappedText(ctx, item.value, valueX, nextY, valueMaxW, 46)
        nextY += 20
    }

    // ══════════════════════════════════════════
    // 4. 底部区域：品牌色文字 + 小程序码
    // ══════════════════════════════════════════
    const bottomY = H - 240

    // 「扫码参加活动」文字
    ctx.setFillStyle(BRAND_PRIMARY)
    ctx.setFontSize(36)
    ctx.setTextAlign('left')
    ctx.fillText('扫码参加活动', 80, bottomY)

    // 品牌名
    ctx.setFillStyle('#999999')
    ctx.setFontSize(28)
    ctx.fillText('Dinknow · 匹克球活动平台', 80, bottomY + 56)

    // ── 动态小程序码 ──
    const qrSize = 180
    const qrX = W - 80 - qrSize
    const qrY = bottomY - 20

    try {
        // NOTE: 调用云函数生成动态小程序码
        const codeRes: any = await callCloudFunction('generateMiniCode', {
            scene: (activity as any)._id || '',
            page: 'pages/activity-detail/index'
        })
        if (codeRes?.success && codeRes.fileID) {
            const qrPath = await getDrawableUrl(codeRes.fileID)
            ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize)
        }
    } catch (e) {
        // NOTE: 二维码生成失败不影响海报其他内容，静默跳过
        console.warn('[usePoster] 小程序码生成失败:', e)
        // 绘制一个占位圆角框
        ctx.setStrokeStyle('#e0e0e0')
        ctx.setLineWidth(2)
        roundRect(ctx, qrX, qrY, qrSize, qrSize, 16)
        ctx.stroke()
        ctx.setFillStyle('#cccccc')
        ctx.setFontSize(22)
        ctx.setTextAlign('center')
        ctx.fillText('小程序码', qrX + qrSize / 2, qrY + qrSize / 2 - 10)
    }

    // ══════════════════════════════════════════
    // 5. 导出高清图片
    // ══════════════════════════════════════════
    return new Promise((resolve, reject) => {
        ctx.draw(false, () => {
            // NOTE: destWidth/destHeight 确保导出图片为 1080×1920 物理像素
            uni.canvasToTempFilePath({
                canvasId: CANVAS_ID,
                destWidth: W,
                destHeight: H,
                fileType: 'jpg',
                quality: 0.92,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                success: (res: any) => resolve(res.tempFilePath),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fail: (err: any) => reject(err),
            }, instance)
        })
    })
}

/** 海报所用 canvasId 常量，供模板绑定 */
export { CANVAS_ID }
