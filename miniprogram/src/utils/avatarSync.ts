/**
 * 头像同步：个人页修改头像后，活动列表/详情中的当前用户头像同步更新
 * 与个人页、广场页、发起活动页共用同一套「当前用户头像」来源（profile 缓存）
 *
 * NOTE: 已删除 resolveActivityAvatarUrls —— 云函数现在直接返回 cloud:// 原始 URL，
 * 微信 <image> 原生支持 cloud:// 协议，无需前端转换为临时 https URL。
 */
import type { Activity } from '../types'

const PROFILE_CACHE_KEY = 'profile_user_cache'

export interface CurrentUserCache {
  openid: string
  avatarUrl: string
}

/** 从本地 profile 缓存读取当前用户 openid 与头像（个人页登录/更新头像时写入） */
export function getCurrentUserFromCache(): CurrentUserCache | null {
  try {
    const raw = uni.getStorageSync(PROFILE_CACHE_KEY)
    if (!raw || typeof raw !== 'object') return null
    const openid = (raw as any).openid
    const avatarUrl = (raw as any).avatarUrl
    if (openid && avatarUrl) return { openid, avatarUrl }
  } catch (_) { }
  return null
}

/**
 * 将当前用户的最新头像合并进活动数据（发起人或报名人之一为当前用户时，用缓存头像覆盖）
 * NOTE: 不再限制 "只有 http 才覆盖"，因为 cloud:// 和 https:// 均被 <image> 稳定支持。
 */
export function mergeCurrentUserAvatar<T extends Activity>(
  activity: T,
  current: CurrentUserCache | null
): T {
  if (!current || !activity || !current.avatarUrl) return activity
  const out = { ...activity } as T
  if (activity.hostId === current.openid) {
    out.hostAvatar = current.avatarUrl
  }
  if (Array.isArray(activity.participants)) {
    out.participants = activity.participants.map((p) => {
      if (p.userId === current.openid) {
        return { ...p, avatarUrl: current.avatarUrl }
      }
      return { ...p }
    })
  }
  return out
}
