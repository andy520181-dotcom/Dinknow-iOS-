/**
 * usePoster - 活动分享海报生成逻辑（v2 品牌风格）
 *
 * 设计规范：
 *  - 画布 1080×1920px（手机全屏高清比例）
 *  - 品牌棕渐变顶部，暖白色主体
 *  - 活动信息为白色圆角卡片 + 轻阴影，高度自适应内容
 *  - 底部品牌色文字 + 动态小程序码
 */

import type { Activity } from '../types'
import { callCloudFunction } from '../services/cloud'

const CANVAS_ID = 'posterCanvas'
const W = 1080
const H = 1920

// NOTE: 二维码 fileID 缓存，同一活动只生成一次
const qrCodeCache = new Map<string, string>()

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
 * 在 canvas 上绘制圆角矩形路径
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
 * 文字自动换行绘制，返回最终 Y 坐标
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawWrappedText(ctx: any, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    let line = ''
    let currentY = y
    for (let i = 0; i < text.length; i++) {
        const testLine = line + text[i]
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
    // NOTE: 18色标平滑渐变，与页面背景一致
    const bgGradient = ctx.createLinearGradient(0, 0, 0, H)
    bgGradient.addColorStop(0, '#7C4E3A')
    bgGradient.addColorStop(0.03, '#855B48')
    bgGradient.addColorStop(0.06, '#8F6756')
    bgGradient.addColorStop(0.09, '#987464')
    bgGradient.addColorStop(0.12, '#A18072')
    bgGradient.addColorStop(0.15, '#AB8D80')
    bgGradient.addColorStop(0.18, '#B49A8F')
    bgGradient.addColorStop(0.21, '#BEA69D')
    bgGradient.addColorStop(0.24, '#C7B3AB')
    bgGradient.addColorStop(0.27, '#D0C0B9')
    bgGradient.addColorStop(0.30, '#DACCC7')
    bgGradient.addColorStop(0.33, '#E3D9D5')
    bgGradient.addColorStop(0.36, '#ECE5E3')
    bgGradient.addColorStop(0.39, '#F2EDEB')
    bgGradient.addColorStop(0.42, '#F6F2F1')
    bgGradient.addColorStop(0.46, '#FAF7F6')
    bgGradient.addColorStop(0.50, '#FDFCFB')
    bgGradient.addColorStop(0.55, '#FFFFFF')
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
    ctx.fillText('Dinknow', W / 2, 110)

    ctx.setFontSize(28)
    ctx.setFillStyle('rgba(253, 248, 245, 0.75)')
    ctx.fillText('匹克球搭子社区', W / 2, 170)

    // ══════════════════════════════════════════
    // 3. 先计算卡片内容高度，再绘制卡片
    // ══════════════════════════════════════════
    const cardX = 60
    const cardY = 360
    const cardW = W - 120
    const cardR = 32
    const px = cardX + 56
    const contentW = cardW - 112

    // NOTE: 信息行数据
    const infoItems = [
        { label: '时间', value: dateText },
        { label: '地点', value: activity.venueName || activity.address || '待定' },
        { label: '费用', value: feeText },
        // NOTE: currentCount 统计的是 registrations 表（不含发起人），需 +1 计入发起人
        { label: '人数', value: `${(activity.currentCount ?? (activity as any).participants?.length ?? 0) + 1} / ${activity.maxParticipants || '不限'}` },
        { label: '发起人', value: activity.hostName || '匹克球友' },
    ]

    // NOTE: 预估卡片内容高度 — 加大间距保持呼吸感
    const titleLineH = 72
    const titleText = activity.title || '活动'
    const charsPerLine = Math.floor(contentW / 48)
    const titleLines = Math.ceil(titleText.length / charsPerLine)
    const titleHeight = titleLines * titleLineH

    // 卡片固定高度 1400px
    const cardH = 1200

    // ── 白色卡片（无阴影） ──
    ctx.setFillStyle('#FFFFFF')
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR)
    ctx.fill()
    // 极浅灰边框
    ctx.setStrokeStyle('#e8e8e8')
    ctx.setLineWidth(2)
    roundRect(ctx, cardX, cardY, cardW, cardH, cardR)
    ctx.stroke()

    // ── 绘制卡片内容 ──
    ctx.setTextAlign('left')
    ctx.setTextBaseline('top')

    // 活动标题
    ctx.setFillStyle('#1a1a1a')
    ctx.setFontSize(48)
    let nextY = drawWrappedText(ctx, titleText, px, cardY + 96, contentW, titleLineH)

    // 分割线
    nextY += 36
    ctx.setStrokeStyle('#f0f0f0')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(px, nextY)
    ctx.lineTo(px + contentW, nextY)
    ctx.stroke()
    nextY += 56

    // 信息行（加大间距保持呼吸感）
    for (const item of infoItems) {
        ctx.setFontSize(34)
        ctx.setFillStyle('#999999')
        ctx.fillText(item.label, px, nextY)

        ctx.setFillStyle('#333333')
        ctx.setFontSize(36)
        const valueX = px + 180
        const valueMaxW = contentW - 180
        nextY = drawWrappedText(ctx, item.value, valueX, nextY, valueMaxW, 56)
        nextY += 64
    }

    // ══════════════════════════════════════════
    // 4. 底部区域：固定在画布左下角
    // ══════════════════════════════════════════
    // NOTE: 底部信息固定在画布底部，不跟随卡片浮动
    const bottomY = H - 220

    // 「扫码参加活动」— 左下角（无装饰线）
    ctx.setFillStyle(BRAND_PRIMARY)
    ctx.setFontSize(40)
    ctx.setTextAlign('left')
    ctx.fillText('扫码参加活动', 80, bottomY + 20)

    // 品牌说明
    ctx.setFillStyle('#999999')
    ctx.setFontSize(28)
    ctx.fillText('Dinknow · 匹克球搭子社区', 80, bottomY + 80)

    // ══════════════════════════════════════════
    // 5. 动态小程序码（右下角，与文字同排）
    // ══════════════════════════════════════════
    const qrSize = 200
    const qrX = W - 80 - qrSize
    const qrY = bottomY - 10

    let qrDrawn = false
    const activityId = (activity as any)._id || ''
    try {
        // NOTE: 优先从缓存取二维码 fileID，避免重复调用云函数
        let fileID = qrCodeCache.get(activityId)
        if (!fileID) {
            console.log('[usePoster] 缓存未命中，生成小程序码, activityId:', activityId)
            const codeRes: any = await callCloudFunction('generateMiniCode', {
                scene: activityId,
                page: 'pages/activity-detail/index'
            })
            if (codeRes?.success && codeRes.fileID) {
                fileID = codeRes.fileID
                qrCodeCache.set(activityId, fileID!)
            } else {
                console.warn('[usePoster] 云函数返回 success=false:', codeRes)
            }
        } else {
            console.log('[usePoster] 缓存命中，跳过云函数调用')
        }
        if (fileID) {
            const qrPath = await getDrawableUrl(fileID)
            ctx.drawImage(qrPath, qrX, qrY, qrSize, qrSize)
            qrDrawn = true
        }
    } catch (e) {
        console.error('[usePoster] 小程序码生成异常:', e)
    }

    // NOTE: 降级占位：始终绘制占位框（不依赖 try-catch，drawImage 静默失败时也能兜底）
    if (!qrDrawn) {
        console.log('[usePoster] 使用占位框替代二维码')
        // 浅灰圆角占位框
        ctx.setFillStyle('#f5f5f5')
        roundRect(ctx, qrX, qrY, qrSize, qrSize, 16)
        ctx.fill()
        ctx.setStrokeStyle(BRAND_LIGHT)
        ctx.setLineWidth(2)
        roundRect(ctx, qrX, qrY, qrSize, qrSize, 16)
        ctx.stroke()
        ctx.setFillStyle(BRAND_PRIMARY)
        ctx.setFontSize(24)
        ctx.setTextAlign('center')
        ctx.setTextBaseline('middle')
        ctx.fillText('小程序码', qrX + qrSize / 2, qrY + qrSize / 2)
        ctx.setTextAlign('left')
        ctx.setTextBaseline('top')
    }

    // NOTE: 已删除底部“长按图片保存”提示文案，保持简洁

    // ══════════════════════════════════════════
    // 7. 导出高清图片
    // ══════════════════════════════════════════
    return new Promise((resolve, reject) => {
        ctx.draw(false, () => {
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

export { CANVAS_ID }
