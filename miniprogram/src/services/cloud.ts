import { CLOUD_ENV } from '../constants'

let cloudInitialized = false
let initPromise: Promise<void> | null = null

/**
 * 初始化云开发（只初始化一次，避免重复调用）
 */
export function initCloud() {
  // 如果已经初始化，直接返回
  if (cloudInitialized) {
    return Promise.resolve()
  }

  // 如果正在初始化，返回同一个 Promise
  if (initPromise) {
    return initPromise
  }

  // 创建初始化 Promise
  initPromise = new Promise<void>((resolve, reject) => {
    try {
      // #ifdef MP-WEIXIN
      if (typeof wx === 'undefined') {
        const error = new Error('wx 对象不存在')
        console.error('云开发初始化失败:', error)
        cloudInitialized = true
        reject(error)
        return
      }

      if (!wx.cloud) {
        const error = new Error('wx.cloud 不存在')
        console.error('云开发初始化失败:', error)
        cloudInitialized = true
        reject(error)
        return
      }

      // 初始化云开发
      wx.cloud.init({
        env: CLOUD_ENV,
        traceUser: true
      })

      // 验证初始化是否成功
      if (wx.cloud && wx.cloud.uploadFile) {
        cloudInitialized = true
        console.log('云开发初始化成功')
        resolve()
      } else {
        const error = new Error('云开发初始化后，uploadFile 方法不存在')
        console.error('云开发初始化失败:', error)
        cloudInitialized = true
        reject(error)
      }
      // #endif

      // #ifndef MP-WEIXIN
      cloudInitialized = true
      resolve()
      // #endif
    } catch (error: any) {
      console.error('云开发初始化失败:', error?.message || 'Unknown error', error)
      cloudInitialized = true // 即使失败也标记为已初始化，避免重复尝试
      reject(error)
    }
  })

  return initPromise
}

/**
 * 调用云函数（统一入口）
 */
export async function callCloudFunction(name: string, data?: any): Promise<any> {
  // 确保云开发已初始化
  await initCloud()

  try {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.cloud) {
      const res = await wx.cloud.callFunction({ name, data })
      const result = (res as any).result
      // 部分环境下云函数报错时仍返回 200，result 内带 errCode
      if (result && typeof result.errCode === 'number' && result.errCode !== 0) {
        const errMsg = result.errMsg || result.message || `错误码: ${result.errCode}`
        console.error(`云函数 ${name} 返回错误:`, result.errCode, errMsg)
        const e = new Error(errMsg) as Error & { errCode?: number }
        e.errCode = result.errCode
        throw e
      }
      return result
    }
    throw new Error('云开发未初始化')
    // #endif

    // #ifndef MP-WEIXIN
    throw new Error('云开发仅在微信小程序中可用')
    // #endif
  } catch (error: any) {
    console.error(`云函数 ${name} 调用失败:`, error?.errCode, error?.errMsg || error?.message, error)
    throw error
  }
}

/**
 * 将云存储 fileID 转换为可用的图片 URL
 * 如果已经是 http/https URL，直接返回
 * 如果是 cloud:// 格式，返回原值（微信小程序支持直接使用）
 * 如果需要临时 URL，可以使用 getTempFileURL
 */
export function getCloudImageUrl(fileID: string | null | undefined): string {
  if (!fileID) return ''

  // 如果已经是 http/https URL，直接返回
  if (fileID.startsWith('http://') || fileID.startsWith('https://')) {
    return fileID
  }

  // 如果是 cloud:// 格式，直接返回（微信小程序支持）
  if (fileID.startsWith('cloud://')) {
    return fileID
  }

  // 其他情况，返回原值
  return fileID
}

/**
 * NOTE: 全局 cloud:// → https 临时 URL 缓存。
 * 模块单例，整个小程序生命周期内共享。
 * 同一个 fileID 只解析一次，后续直接返回缓存值，
 * 从根本上避免每次刷新产生新字符串导致 <image> 重载闪烁。
 */
const cloudUrlCache = new Map<string, string>()

/**
 * 批量获取云存储文件的临时下载 URL（带全局缓存）
 * 已缓存的 fileID 直接返回，不发网络请求，彻底防止图片闪烁。
 */
export async function getTempFileURLs(fileIDs: string[]): Promise<Record<string, string>> {
  await initCloud()

  if (!fileIDs || fileIDs.length === 0) return {}

  // NOTE: 从全局缓存中直接取出已解析的 URL，未命中的才需要请求
  const result: Record<string, string> = {}
  const uncached: string[] = []
  for (const id of fileIDs) {
    const cached = cloudUrlCache.get(id)
    if (cached) {
      result[id] = cached
    } else {
      uncached.push(id)
    }
  }

  // 所有 ID 均命中缓存，直接返回
  if (uncached.length === 0) return result

  try {
    // #ifdef MP-WEIXIN
    if (typeof wx !== 'undefined' && wx.cloud && wx.cloud.getTempFileURL) {
      const res = await wx.cloud.getTempFileURL({ fileList: uncached })
      if (res.fileList) {
        res.fileList.forEach((item: any) => {
          // NOTE: 只缓存真正解析为 http(s) 的 URL；失败时回退用原 fileID，但不写入缓存（下次仍可重试）
          if (item.tempFileURL && String(item.tempFileURL).startsWith('http')) {
            cloudUrlCache.set(item.fileID, item.tempFileURL)
            result[item.fileID] = item.tempFileURL
          } else {
            result[item.fileID] = item.fileID
          }
        })
      }
      return result
    }
    // #endif

    // 非微信环境：原样返回
    uncached.forEach(id => { result[id] = id })
    return result
  } catch (error: any) {
    console.error('获取临时文件 URL 失败:', error)
    uncached.forEach(id => { result[id] = id })
    return result
  }
}

/**
 * 清除全局 cloud URL 缓存（用于用户退出登录等场景）
 */
export function clearCloudUrlCache(): void {
  cloudUrlCache.clear()
}

/**
 * 将已知的 cloud:// → http 映射批量注入全局缓存。
 * 用于活动详情页拿到云函数解析的 temp URL 后主动写入，
 * 下次前端调用 getTempFileURLs 时直接命中缓存，避免重复请求和 URL 字符串变化。
 */
export function prefillCloudUrlCache(entries: Record<string, string>): void {
  for (const [fileId, url] of Object.entries(entries)) {
    // NOTE: 只缓存合法的 cloud:// → http 映射，防止脏数据写入
    if (fileId.startsWith('cloud://') && url.startsWith('http')) {
      cloudUrlCache.set(fileId, url)
    }
  }
}

/**
 * 查询全局缓存中某个 cloud:// ID 对应的已解析 http URL，未命中返回 null
 */
export function getCachedUrl(fileId: string): string | null {
  return cloudUrlCache.get(fileId) ?? null
}
