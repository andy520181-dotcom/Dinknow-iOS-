/**
 * SWR 缓存工具 — Stale-While-Revalidate
 *
 * 策略：先读本地缓存秒开页面，同时后台静默请求最新数据。
 * 如果网络请求成功，更新页面 + 写入新缓存。
 * 如果网络请求失败但有缓存，用户仍能看到旧数据。
 */

// NOTE: 缓存条目结构
interface CacheEntry<T> {
    data: T
    /** 写入时间戳 */
    ts: number
}

/** 缓存 key 前缀，避免与业务 Storage key 冲突 */
const PREFIX = 'swr_'

/**
 * 读取缓存
 * @param key 缓存 key
 * @param maxAge 最大有效期（毫秒），0 = 不校验有效期
 * @returns 缓存数据，不存在或已过期返回 null
 */
export function readCache<T>(key: string, maxAge = 0): T | null {
    try {
        const raw = uni.getStorageSync(PREFIX + key)
        if (!raw || !raw.data) return null
        // NOTE: maxAge > 0 时检查是否过期
        if (maxAge > 0 && Date.now() - (raw.ts || 0) > maxAge) return null
        return raw.data as T
    } catch {
        return null
    }
}

/**
 * 写入缓存
 * @param key 缓存 key
 * @param data 要缓存的数据
 */
export function writeCache<T>(key: string, data: T): void {
    try {
        const entry: CacheEntry<T> = { data, ts: Date.now() }
        uni.setStorageSync(PREFIX + key, entry)
    } catch (e) {
        // NOTE: Storage 满时静默失败，不影响业务
        console.warn('[SWR] 缓存写入失败:', e)
    }
}

/**
 * 清除指定缓存
 * @param key 缓存 key
 */
export function clearCache(key: string): void {
    try {
        uni.removeStorageSync(PREFIX + key)
    } catch {
        // 静默
    }
}

/**
 * 清除所有 SWR 缓存（用于登出场景）
 */
export function clearAllCache(): void {
    try {
        const res = uni.getStorageInfoSync()
        const keys = res.keys || []
        for (const k of keys) {
            if (k.startsWith(PREFIX)) {
                uni.removeStorageSync(k)
            }
        }
    } catch {
        // 静默
    }
}
