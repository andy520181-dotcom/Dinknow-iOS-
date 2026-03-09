/**
 * usePoster - 活动分享海报生成逻辑
 *
 * 官方推荐方案：
 *  1. 在页面模板放一个隐藏 <canvas canvas-id="posterCanvas">
 *  2. 用 uni.createCanvasContext('posterCanvas', componentInstance) 获取 2D 上下文
 *  3. 绘制完毕后调用 context.draw(false, callback) 触发渲染
 *  4. 在回调中调用 uni.canvasToTempFilePath({ canvasId: 'posterCanvas' }, componentInstance)
 *
 * NOTE: 独立 composable，不修改 activity-detail 任何现有业务逻辑。
 */

import type { Activity } from '../types'

const CANVAS_ID = 'posterCanvas'
// 海报逻辑宽高（单位 rpx → 内部换算为 px）
const W = 375   // px，对应 750rpx canvas 实际渲染宽度
const H = 600   // px

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
    // NOTE: uni.createCanvasContext 是官方 2D Canvas 操作入口，兼容性最广
    const ctx = uni.createCanvasContext(CANVAS_ID, instance)

    // ── 白色背景 ──
    ctx.setFillStyle('#FFFFFF')
    ctx.fillRect(0, 0, W, H)

    // ── 顶部蓝色渐变条 ──
    const gradient = ctx.createLinearGradient(0, 0, W, 0)
    gradient.addColorStop(0, '#007AFF')
    gradient.addColorStop(1, '#0056CC')
    ctx.setFillStyle(gradient)
    ctx.fillRect(0, 0, W, 80)

    // ── App 名称 ──
    ctx.setFillStyle('#FFFFFF')
    ctx.setFontSize(20)
    ctx.setTextBaseline('middle')
    ctx.fillText('Dinknow', 20, 40)

    // ── 活动标题 ──
    ctx.setFillStyle('#111111')
    ctx.setFontSize(18)
    ctx.setTextBaseline('top')
    ctx.fillText(activity.title || '活动', 20, 100)

    // ── 信息行（不使用 emoji，用文字替代） ──
    ctx.setFontSize(13)
    ctx.setFillStyle('#555555')
    ctx.fillText('时间: ' + dateText, 20, 138)
    ctx.fillText('地点: ' + (activity.address || '待定'), 20, 162)
    ctx.fillText('费用: ' + feeText, 20, 186)

    // ── 分割线 ──
    ctx.setStrokeStyle('#EEEEEE')
    ctx.setLineWidth(0.5)
    ctx.beginPath()
    ctx.moveTo(20, 216)
    ctx.lineTo(W - 20, 216)
    ctx.stroke()

    // ── 发起人 ──
    ctx.setFontSize(13)
    ctx.setFillStyle('#111111')
    ctx.fillText('发起人: ' + (activity.hostName || '—'), 20, 232)

    // ── 尝试加载并绘制封面图 ──
    const coverUrl = (activity as any).coverImage || (activity as any).images?.[0]
    if (coverUrl) {
        try {
            const drawableUrl = await getDrawableUrl(coverUrl)
            ctx.drawImage(drawableUrl, 0, 270, W, 220)
        } catch {
            // 封面加载失败，跳过
        }
    }

    // ── 底部品牌条 ──
    ctx.setFillStyle('#F5F5F5')
    ctx.fillRect(0, H - 70, W, 70)
    ctx.setFillStyle('#007AFF')
    ctx.setFontSize(13)
    ctx.fillText('扫码参加活动', 20, H - 48)
    ctx.setFillStyle('#999999')
    ctx.setFontSize(11)
    ctx.fillText('Dinknow · 匹克球活动平台', 20, H - 24)

    // ── 触发 Canvas 渲染，完成后导出 ──
    return new Promise((resolve, reject) => {
        ctx.draw(false, () => {
            uni.canvasToTempFilePath({
                canvasId: CANVAS_ID,
                fileType: 'jpg',
                quality: 0.92,
                success: (res: any) => resolve(res.tempFilePath),
                fail: (err: any) => reject(err),
            }, instance)
        })
    })
}

/** 海报所用 canvasId 常量，供模板绑定 */
export { CANVAS_ID }
