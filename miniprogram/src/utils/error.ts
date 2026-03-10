/**
 * 统一错误消息转换工具
 * 将云函数/网络/系统原始错误信息转换为用户友好的中文提示
 */

/**
 * 根据原始错误对象返回友好的中文提示
 * @param error 原始错误（可能是 Error、string、或微信 errMsg 对象）
 * @param fallback 默认兜底文案
 * @returns 用户可读的中文提示
 */
export function friendlyErrorMessage(error: unknown, fallback = '操作失败，请稍后再试'): string {
    const raw = extractRawMessage(error)
    if (!raw) return fallback

    const lower = raw.toLowerCase()

    // NOTE: 网络相关
    if (lower.includes('timeout') || lower.includes('timed out')) {
        return '网络连接超时，请检查网络后重试'
    }
    if (lower.includes('network') || lower.includes('net::') || lower.includes('request:fail')) {
        return '网络连接不太稳定，请检查后重试'
    }
    if (lower.includes('fail to fetch') || lower.includes('load fail') || lower.includes('abort')) {
        return '网络请求失败，请稍后再试'
    }

    // NOTE: 云函数相关
    if (lower.includes('cloud.callfunction:fail') || lower.includes('errcode: -1') || lower.includes('invoke fail')) {
        return '服务器开小差了，请稍后再试'
    }
    if (lower.includes('exceed') || lower.includes('quota') || lower.includes('limit')) {
        return '服务繁忙，请稍后再试'
    }

    // NOTE: 权限/鉴权相关
    if (lower.includes('auth') || lower.includes('unauthorized') || lower.includes('permission') || lower.includes('denied')) {
        return '操作权限不足，请重新登录'
    }

    // NOTE: 存储/文件相关
    if (lower.includes('upload') || lower.includes('file')) {
        return '文件上传失败，请稍后再试'
    }

    // NOTE: 如果原始信息已经是中文（非技术语言），直接展示
    if (/^[\u4e00-\u9fa5]/.test(raw) && raw.length <= 20) {
        return raw
    }

    return fallback
}

/**
 * 从各种类型的 error 对象中提取原始错误文本
 */
function extractRawMessage(error: unknown): string {
    if (!error) return ''
    if (typeof error === 'string') return error
    if (error instanceof Error) return error.message
    const e = error as Record<string, unknown>
    if (typeof e.errMsg === 'string') return e.errMsg
    if (typeof e.message === 'string') return e.message
    if (typeof e.msg === 'string') return e.msg
    return String(error)
}

/**
 * 便捷方法：显示友好错误 Toast
 * @param error 原始错误
 * @param fallback 默认兜底文案
 */
export function showErrorToast(error: unknown, fallback = '操作失败，请稍后再试') {
    const msg = friendlyErrorMessage(error, fallback)
    uni.showToast({ title: msg, icon: 'none', duration: 2500 })
}
