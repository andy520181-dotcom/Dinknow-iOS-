<template>
  <view class="profile-page">
    <!-- NOTE: 登录状态检查中，显示空白背景，避免已登录用户知觉登录页闪烁 -->
    <view v-if="profileChecking" class="profile-loading" />
    <!-- NOTE: 自定义全屏登录页，内联 style 确保渐变生效（绕过 scoped SCSS 编译问题） -->
    <view
      v-else-if="!isLoggedIn"
      class="login-page"
      style="background: #FDF8F5;"
    >

      <!-- NOTE: 品牌区块：Logo + 标题聚合居中，占据上半屏，视觉聚焦 -->
      <view class="login-brand">
        <view class="login-logo-circle">
          <image class="login-logo-img" src="/static/icons/login-avatar.png" mode="aspectFit" />
        </view>
        <text class="login-brand-title">欢迎使用Dinknow</text>
        <text class="login-brand-subtitle">让我们一起匹克球</text>
      </view>

      <!-- 底部按钮 + 协议区 -->
      <view class="login-bottom">
        <!-- NOTE: 授权登录，微信 getPhoneNumber 触发器，样式完全自定义 -->
        <button
          class="login-primary-btn"
          :class="{ 'login-primary-btn--disabled': !agreedToTerms }"
          :open-type="agreedToTerms ? 'getPhoneNumber' : ''"
          :loading="saving"
          @getphonenumber="onGetPhoneNumber"
          @tap="onLoginBtnTap"
        >
          <text class="login-primary-text">立即登录</text>
        </button>

        <!-- 取消登录：跳转广场页以游客身份浏览 -->
        <view class="login-cancel-btn" @tap="handleLoginCancel">
          <text class="login-cancel-text">取消登录</text>
        </view>

        <!-- 协议勾选行 -->
        <view class="login-terms-row">
          <view class="login-terms-cb-wrap" @tap="toggleAgreedToTerms">
            <view
              class="login-terms-checkbox"
              :class="{ 'login-terms-checkbox--checked': agreedToTerms }"
            >
              <text v-if="agreedToTerms" class="login-terms-check-icon">✓</text>
            </view>
          </view>
          <text class="login-terms-desc">我已阅读并同意<text class="login-terms-link" @tap="openAgreement">《用户协议》</text>和<text class="login-terms-link" @tap="openPrivacy">《隐私政策》</text></text>
        </view>
      </view>

    </view>
    <view v-else class="profile-scroll">
      <view class="profile-body">

        <!-- ── 顶部居中头像区 ── -->
        <view class="profile-hero">
          <!-- NOTE: 右上角「编辑资料」标签，独立可点击跳转设置页 -->
          <view class="profile-edit-badge" @tap.stop="goToSettings">
              <text class="profile-edit-badge-text">编辑资料</text>
          </view>
          <view class="profile-avatar-wrap">
            <view class="profile-avatar-circle">
              <image
                v-if="resolvedAvatarUrl"
                class="profile-avatar"
                :src="resolvedAvatarUrl"
                mode="aspectFill"
              />
              <view v-else class="profile-avatar profile-avatar--placeholder">
                <text class="profile-avatar-icon">👤</text>
              </view>
            </view>
          </view>
          <text class="profile-hero-name">{{ nickName || '匹克球友' }}</text>
          <view class="profile-hero-dupr">
            <text class="profile-hero-dupr-text">{{ duprLevel || '设置 DUPR 水平' }}</text>
          </view>
        </view>

        <!-- ── 场次统计：双列并排卡片 ── -->
        <view class="stat-grid">
          <view class="stat-card" @tap="goToMyActivities('joined')">
            <text class="stat-count">{{ myJoined.length }}</text>
            <text class="stat-label">我参加的</text>
          </view>
          <view class="stat-card" @tap="goToMyActivities('created')">
            <text class="stat-count">{{ myCreated.length }}</text>
            <text class="stat-label">我发起的</text>
          </view>
        </view>

        <!-- ── 活动日历 ── -->
        <ActivityCalendar
          :joined-activities="myJoined"
          :created-activities="myCreated"
        />

        <!-- ── 退出登录按钮 ── -->
        <view class="logout-btn" @tap="handleLogout">
          <text class="logout-btn-text">退出登录</text>
        </view>

      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { login, getProfile, bindPhone } from '../../services/user'
import { clearCloudUrlCache, getTempFileURLs } from '../../services/cloud'
import { getUserActivities } from '../../services/activity'
import type { User, Activity } from '../../types'
import ActivityCalendar from '../../components/ActivityCalendar.vue'

// NOTE: 自动读取微信后台版本号，正式版返回真实版本，开发/体验版返回空字符串
const appVersion = (() => {
  try {
    // #ifdef MP-WEIXIN
    const info = (wx as any).getAccountInfoSync()
    const v = info?.miniProgram?.version
    return v ? `Dinknow v${v}` : 'Dinknow'
    // #endif
  } catch {
    return 'Dinknow'
  }
  return 'Dinknow'
})()

const user = ref<User | null>(null)
const nickName = ref('')
const avatarUrl = ref('')
const duprLevel = ref('')

// NOTE: profile 页头像 cloud:// → https:// 缓存映射
const profileCloudUrlMap = ref<Record<string, string>>({})

// NOTE: 经过缓存解析的头像 URL，同一 cloud:// 永远返回同一 https:// 字符串
const resolvedAvatarUrl = computed(() => {
  const url = avatarUrl.value
  if (!url) return ''
  if (url.startsWith('https://') || url.startsWith('http://')) return url
  const cached = profileCloudUrlMap.value[url]
  if (cached && (cached.startsWith('https://') || cached.startsWith('http://'))) return cached
  return ''
})

watch(avatarUrl, async (val: string) => {
  if (val && val.startsWith('cloud://') && !profileCloudUrlMap.value[val]) {
    try {
      const urlMap = await getTempFileURLs([val])
      const v = urlMap[val]
      if (v && (v.startsWith('https://') || v.startsWith('http://'))) {
        profileCloudUrlMap.value = { ...profileCloudUrlMap.value, [val]: v }
      }
    } catch {}
  }
}, { immediate: true })

const myCreated = ref<Activity[]>([])
const myJoined = ref<Activity[]>([])

const saving = ref(false)

// NOTE: 使用独立的 is_logged_in 布尔标记判断登录态
const _isLoggedIn = uni.getStorageSync('is_logged_in') === true

const isLoggedIn = ref(!!_isLoggedIn)
// NOTE: profileChecking 仅在「未主动退出 + 未知登录态」时为 true（空白遮罩）。
// 已有 is_logged_in=true → 立即视为已登录，profileChecking=false，直接渲染个人页。
// 主动退出或 is_logged_in=false → 直接渲染登录页。
// 首次安装（is_logged_in 不存在）→ profileChecking=true，等网络验证后揭开遮罩。
const profileChecking = ref(false) // NOTE: is_logged_in 标记已能同步确定登录态，无需過渡遮罩
const agreedToTerms = ref(false)
/** 切换协议同意状态，避免模板内直接 ref 赋值触发 uni-app crash */
function toggleAgreedToTerms() { agreedToTerms.value = !agreedToTerms.value }


/** 点击登录按钮时若未勾选协议，给出提示 */
function onLoginBtnTap() {
  if (!agreedToTerms.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
  }
}

function openAgreement() {
  uni.navigateTo({ url: '/pages/user-agreement/index' })
}

function openPrivacy() {
  uni.navigateTo({ url: '/pages/privacy-policy/index' })
}

/** 取消登录：切换到广场页，以游客身份浏览 */
function handleLoginCancel() {
  uni.switchTab({ url: '/pages/index/index' })
}

// NOTE: 检查登录状态：直接读 is_logged_in 标记，同步确定登录态，无需任何网络请求
async function checkLoginStatus() {
  function setProfileTitle(t: string) {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    if (cur && (cur as any).route?.includes('profile')) {
      uni.setNavigationBarTitle({ title: t })
    }
  }

  // NOTE: is_logged_in=true → 已登录，直接从缓存填充页面数据并显示个人页
  if (uni.getStorageSync('is_logged_in') === true) {
    const cachedProfile = uni.getStorageSync('cached_profile')
    isLoggedIn.value = true
    setProfileTitle('个人中心')
    if (cachedProfile) {
      user.value = cachedProfile
      nickName.value = cachedProfile.nickName || ''
      avatarUrl.value = cachedProfile.avatarUrl || ''
      duprLevel.value = cachedProfile.duprLevel || ''
    }
    loadProfileAndActivities()
    return
  }

  // NOTE: 其他情况（首次安装 / 清除缓存 / 主动退出）→ 直接显示登录页，无需任何验证
  isLoggedIn.value = false
  setProfileTitle('登录')
}

/**
 * 微信手机号一键登录回调
 * NOTE: getPhoneNumber 返回 code，由云函数 bindPhone 调用微信 API 解密获取手机号明文
 */
async function onGetPhoneNumber(e: any) {
  if (e?.detail?.errMsg !== 'getPhoneNumber:ok') {
    uni.showToast({ title: '需要手机号才能登录', icon: 'none' })
    return
  }
  const code = e?.detail?.code
  if (!code) {
    uni.showToast({ title: '获取失败，请重试', icon: 'none' })
    return
  }
  saving.value = true
  try {
    uni.showLoading({ title: '登录中...' })
    const res = await bindPhone(code)
    uni.hideLoading()
    if (res?.success) {
      // NOTE: 登录成功写入 is_logged_in=true，下次打开小程序直接走缓存路径，无需任何验证
      uni.removeStorageSync('explicitly_logged_out')
      uni.setStorageSync('is_logged_in', true)
      // NOTE: 写入最小 cached_profile，确保下次页面初始化能读到 profile 数据
      const minProfile = { phone: res.phone || 'bound', openid: res.openid || '', nickName: '', avatarUrl: '' }
      try { uni.setStorageSync('cached_profile', minProfile) } catch {}
      await loadProfileAndActivities()
      isLoggedIn.value = true
      uni.setNavigationBarTitle({ title: '个人中心' })
      uni.showToast({ title: '登录成功', icon: 'success' })
    } else {
      uni.showToast({ title: res?.message || '登录失败，请重试', icon: 'none' })
    }
  } catch (err) {
    uni.hideLoading()
    console.error('手机号登录失败:', err)
    uni.showToast({ title: '登录失败，请重试', icon: 'none' })
  } finally {
    saving.value = false
  }
}


async function loadProfileAndActivities() {
  try {
    const loginRes = await login()
    const openid = loginRes?.openid
    if (openid) {
      const profile = await getProfile(openid)
      if (profile) {
        user.value = profile
        nickName.value = profile.nickName || ''
        avatarUrl.value = profile.avatarUrl || ''
        duprLevel.value = profile.duprLevel || ''
        // NOTE: 缓存 profile 到本地，下次进入时可立即跳过白屏
        try { uni.setStorageSync('cached_profile', profile) } catch {}
      }
    }
    const activities = await getUserActivities()
    myCreated.value = Array.isArray(activities.created) ? activities.created : []
    myJoined.value = Array.isArray(activities.joined) ? activities.joined : []
    // NOTE: 缓存用户活动列表，供活动详情页的报名时间冲突检测使用（读本地缓存，无需额外网络请求）
    try { uni.setStorageSync('cached_user_activities', { created: myCreated.value, joined: myJoined.value }) } catch {}
  } catch (e) {
    console.error('加载个人信息失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// NOTE: 轻量刷新活动场次（onShow 专用，只更新计数，不重新拉取 profile）
async function refreshActivities() {
  try {
    const activities = await getUserActivities()
    myCreated.value = Array.isArray(activities.created) ? activities.created : []
    myJoined.value = Array.isArray(activities.joined) ? activities.joined : []
    // NOTE: 同步更新冲突检测缓存
    try { uni.setStorageSync('cached_user_activities', { created: myCreated.value, joined: myJoined.value }) } catch {}
  } catch (e) {
    console.error('刷新活动场次失败', e)
  }
}

/** 跳转到个人设置页 */
function goToSettings() {
  uni.navigateTo({ url: '/pages/profile-settings/index' })
}

function goToMyActivities(type: 'joined' | 'created') {
  uni.navigateTo({
    url: `/pages/my-activities/index?type=${type}`
  })
}

// NOTE: 退出登录：清除本地缓存，小程序回到登录状态
function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出登录？',
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        // NOTE: clearStorage 之后再写标记
        uni.setStorageSync('explicitly_logged_out', true)
        uni.setStorageSync('is_logged_in', false)
        clearCloudUrlCache()
        isLoggedIn.value = false
        nickName.value = ''
        avatarUrl.value = ''
        duprLevel.value = ''
        myJoined.value = []
        myCreated.value = []
        agreedToTerms.value = false
        uni.setNavigationBarTitle({ title: '登录' })
      }
    }
  })
}

onMounted(() => {
  // NOTE: 先检查登录状态，已登录则自动加载资料
  checkLoginStatus()
})

// NOTE: onShow 返回个人页时：刷新活动数据（报名/退出/创建/删除后实时同步）
// 以及从设置页返回后同步最新 profile 昵称/头像
onShow(() => {
  if (!isLoggedIn.value) {
    checkLoginStatus()
    return
  }
  // NOTE: 从设置页返回时，重新读取缓存 profile 以刷新头像/昵称/dupr 展示
  const cachedProfile = uni.getStorageSync('cached_profile')
  if (cachedProfile) {
    nickName.value = cachedProfile.nickName || nickName.value
    avatarUrl.value = cachedProfile.avatarUrl || avatarUrl.value
    duprLevel.value = cachedProfile.duprLevel || duprLevel.value
  }
  refreshActivities()
})
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  // NOTE: 顶部渐变与系统导航栏 #7C4E3A 无缝衔接，profile-hero 的渐变 header 自然延伸其中
  background: linear-gradient(
    to bottom,
    #7C4E3A 0%,
    #C9856A 18%,
    rgba(253, 248, 245, 0.55) 36%,
    #FDF8F5 46%
  );
  display: flex;
  flex-direction: column;
  position: relative;
}

// ---- 自定义登录页 ----
.login-page {
  // NOTE: 不用 position:absolute，WeChat 小程序中父无 position:relative 时绝对定位失效
  // 改为 flex 子元素，自动撑满 profile-page，背景色可正常渲染
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  // NOTE: 与全局统一
  background: $ios-bg-secondary;
  // NOTE: 水平边距不在这里设，而是各子区域自己设，避免微信 button 忽略父 padding
  padding: 60px 0 52px;
  box-sizing: border-box;
}

// NOTE: 品牌区块：Logo + 标题聚合居中，flex:1 占满上半屏，视觉聚焦
.login-brand {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  // NOTE: center 让品牌整体居于上半屏偏中位置
  justify-content: center;
  gap: 0;
}

.login-brand-title {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: $ios-text-primary;
  margin-top: 20px;
  text-align: center;
}

.login-brand-subtitle {
  display: block;
  font-size: 12px;
  color: $ios-text-tertiary;
  margin-top: 6px;
  text-align: center;
}

// NOTE: 图片自带蓝色圆形背景，overflow:hidden 裁切成圆形展示
.login-logo-circle {
  width: 88px;
  height: 88px;
  border-radius: 44px;
  background: transparent;
  overflow: hidden;
  // 精致阴影
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.login-logo-img {
  width: 100%;
  height: 100%;
}

// 底部按钮区 - 固定在底部
.login-bottom {
  display: flex;
  flex-direction: column;
  gap: 12px;
  // NOTE: 水平 padding 在此处设，button width:100% 则基于此内容宽度计算，解决微信 button 宽度问题
  padding: 0 24px;
  box-sizing: border-box;
}

// NOTE: 微信 getPhoneNumber 触发按钒，外观完全自定义
// 选中后与发新活动「点击发布」按钒相同蓝色（$ios-blue）
.login-primary-btn {
  width: 100%;
  height: 52px;
  background: $brand-primary;
  // NOTE: 与活动卡片 ios-section 圆角参数一致（$ios-radius-lg = 16px）
  border-radius: $ios-radius-lg;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  box-shadow: 0 4px 20px rgba(124, 78, 58, 0.30);
  &::after { border: none; }

  &--disabled {
    background: #8e8e93;
    box-shadow: none;
    opacity: 0.8;
  }
}

.login-primary-text {
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 1px;
}

// 取消按钮：半透明白底，轻边框
.login-cancel-btn {
  width: 100%;
  height: 52px;
  background: rgba(255, 255, 255, 0.55);
  // NOTE: 与活动卡片圆角一致
  border-radius: $ios-radius-lg;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-cancel-text {
  font-size: 16px;
  color: $ios-text-secondary;
}

// 协议勾选行：两层 flex 确保垂直居中
.login-terms-row {
  display: flex;
  flex-direction: row;
  // NOTE: center 让勾选框+协议文字整体居中（不靠左）
  justify-content: center;
  align-items: stretch;
  gap: 8px;
  margin-top: 4px;
  min-height: 22px;
}

// checkbox 的外层 view：height 继承 stretch，内部 flex center
.login-terms-cb-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 18px;
}

.login-terms-checkbox {
  width: 18px;
  height: 18px;
  min-width: 18px;
  border-radius: 50%;
  border: 1.5px solid #a0a0c0;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;

  &--checked {
    background: $brand-primary;
    border-color: $brand-primary;
  }
}

.login-terms-check-icon {
  font-size: 10px;
  color: #ffffff;
  font-weight: 700;
  line-height: 1;
}

// NOTE: 单根 text 嵌套链接，WeChat 小程序中最稳定的垂直居中写法
.login-terms-desc {
  font-size: 12px;
  color: $ios-text-tertiary;
  line-height: 18px;
  align-self: center;
}

.login-terms-link {
  font-size: 12px;
  color: $ios-blue;
  line-height: 1.5;
}

.profile-scroll {
  flex: 1;
}

.profile-body {
  padding: 0 0 $ios-spacing-lg;
}

// ---- 卡片基础（参考图：圆角白色卡片，左右带间距）----
.ios-section {
  background: #ffffff;
  border-radius: 14px;
  margin: 0 16px $ios-spacing-md;
  overflow: hidden;
}

// ---- 头像区：居中垂直排列，整页使用标准灰背景 ----
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  // NOTE: 品牌渐变 header，从可可棕到玫棕，底部圆角与内容区自然过渡
  padding: 48px 16px 28px;
  background: $brand-gradient;
  border-radius: 0 0 24px 24px;
  margin-bottom: 12px;
  position: relative;
}




.profile-hero-name {
  font-size: 17px;
  font-weight: $ios-font-weight-semibold;
  // NOTE: 渐变背景上使用白色文字，对比度符合无障碍标准
  color: #ffffff;
  margin-top: 12px;
}

.profile-hero-dupr {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.profile-hero-dupr-icon {
  width: 14px;
  height: 14px;
}

.profile-hero-dupr-text {
  font-size: 12px;
  // NOTE: 渐变背景上降低不透明度作为次级文字区别于昵称
  color: rgba(255, 255, 255, 0.80);
  font-weight: $ios-font-weight-regular;
}

// NOTE: 头像 wrap 相对定位，作为编辑标签绝对定位的锚点
.profile-avatar-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

// NOTE: 「编辑资料 ›」胶囊，绝对定位在 profile-hero 右上角
.profile-edit-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 20px;
  padding: 4px 10px;
  white-space: nowrap;
}

.profile-edit-badge-text {
  font-size: 12px;
  color: $ios-text-tertiary;
  letter-spacing: 0.3px;
}

// NOTE: 圆圈容器，overflow:hidden 裁切头像为圆形
.profile-avatar-circle {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  // NOTE: 重置微信 button 默认样式，防止 padding/margin 破坏圆形裁切
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  box-sizing: border-box;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: block;
}

// 去掉微信 button 点击态的边框
.profile-avatar-circle::after {
  border: none;
}

.profile-avatar {
  width: 80px;
  height: 80px;
}

.profile-avatar--placeholder {
  width: 80px;
  height: 80px;
  // NOTE: 卻除占位背景，让渐变背景直接透出
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar-icon {
  font-size: 40px;
}

// NOTE: 编辑图标容器，浅蓝色圆形背景与页面蓝色渐变协调
.profile-edit-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 26px;
  height: 26px;
  // NOTE: 编辑小圆改为品牌棕色，与渐变头部协调
  background: $brand-primary;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-edit-dot-icon {
  width: 16px;
  height: 16px;
}

.profile-username {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  // NOTE: 白色文字，在蓝色渐变背景上清晰可读
  color: #ffffff;
}

// NOTE: DUPR 行横排容器：图标 + 文字对齐
.profile-dupr-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

// NOTE: 头像卡片中 DUPR 图标，按原始颜色显示
.profile-dupr-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

// NOTE: DUPR 水平副标题，半透明白色，视觉层级低于昵称
.profile-dupr-label {
  font-size: 12px;
  color: #ffffff;
}

// ---- 信息列表 ----
.ios-cell {
  min-height: 60px;
  padding: 0 $ios-spacing-lg;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.ios-cell:last-child {
  border-bottom-width: 0;
}

.ios-cell__label {
  font-size: 16px;
  color: $ios-text-primary;
  flex-shrink: 0;
  width: 88px;
}

.ios-cell__value {
  flex: 1;
  font-size: 16px;
  color: $ios-text-secondary;
  text-align: right;
  min-width: 0;
}

.ios-cell__value--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ios-cell__chevron {
  font-size: 16px;
  color: $ios-text-tertiary;
  margin-left: $ios-spacing-xs;
}

// NOTE: DUPR 内嵌 picker 文字样式，与发起活动页保持一致
.ios-picker-text {
  font-size: 16px;
  color: $ios-text-primary;
}

.ios-cell__placeholder {
  font-size: 16px;
  color: $ios-text-tertiary;
}

.ios-cell__value--right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

// ---- 场次统计卡片 ----
.ios-activities-card {
  display: flex;
  flex-direction: column;
}

.ios-activity-tile {
  min-height: 60px;
  padding: 0 $ios-spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.ios-activity-tile:last-child {
  border-bottom-width: 0;
}

.ios-activity-tile-title {
  font-size: 16px;
  color: $ios-text-primary;
}

// NOTE: 图标 + 标题横排容器（我参加的 / 我发起的行）
.ios-activity-tile-left {
  display: flex;
  align-items: center;
}

// NOTE: 与发起活动页图标完全一致（20x20，右边距6px）
.ios-cell__row-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-right: 6px;
}

.ios-activity-count-row {
  display: flex;
  align-items: baseline;
}

.ios-activity-count {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  color: $ios-text-secondary;
}

.ios-activity-unit {
  font-size: 16px;
  color: $ios-text-secondary;
}

// ---- 编辑弹窗 ----
.edit-modal-mask {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}

.edit-modal,
.edit-picker-modal {
  width: 100%;
  background: #ffffff;
  border-top-left-radius: $ios-radius-lg;
  border-top-right-radius: $ios-radius-lg;
  padding-bottom: env(safe-area-inset-bottom);
}

.edit-modal-header {
  padding: $ios-spacing-md $ios-spacing-lg;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.edit-modal-title {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
}

.edit-modal-close {
  padding: 4px 8px;
}

.edit-modal-body {
  padding: 0 $ios-spacing-lg $ios-spacing-md;
}

.edit-modal-input,
.edit-modal-textarea {
  width: 100%;
  font-size: 16px;
  color: $ios-text-primary;
  padding: $ios-spacing-sm;
  border-radius: $ios-radius-md;
  background: $ios-bg-tertiary;
  box-sizing: border-box;
}

.edit-modal-textarea {
  min-height: 80px;
}

.edit-modal-btn {
  margin: 0 $ios-spacing-lg $ios-spacing-md;
  height: 44px;
  border-radius: 999px;
  background: $brand-accent;
  color: #ffffff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-picker-list {
  max-height: 260px;
  padding: 0 $ios-spacing-lg $ios-spacing-md;
  overflow-y: scroll;
}

.edit-picker-item {
  padding: $ios-spacing-md 0;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);
  font-size: 16px;
  color: $ios-text-primary;
}

.edit-picker-item:last-child {
  border-bottom-width: 0;
}


// ---- Action Sheet: 单块白色面板展示 ----------
.action-sheet-mask {
  position: fixed;
  left: 0; right: 0; top: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  z-index: 9999;
  animation: maskFadeIn 0.25s ease-out;
}
@keyframes maskFadeIn {
  from { background: transparent; }
  to   { background: rgba(0, 0, 0, 0.45); }
}

// NOTE: 白色单块面板，顶部圆角，底部贴边（遮住 tab bar）
.action-sheet {
  background: #ffffff;
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom);
  animation: sheetSlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.action-sheet-item {
  height: 57px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { background: rgba(0, 0, 0, 0.04); }
}

// NOTE: 取消按钮独立模块，上方用 8px 间距与选项区隔开
.action-sheet-item--cancel {
  margin-top: 8px;
  background: #f2f2f7;
  border-top: none;
}

.action-sheet-item-text {
  font-size: 16px;
  color: $ios-text-primary;
}

// NOTE: 取消选项上方加精细分隔线与普通选项区分
.action-sheet-item-text--cancel {
  color: $ios-text-secondary;
}

.action-sheet-sep {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.04);
}

// NOTE: 登录状态检查中的空白遮罩，背景色与页面一致，用户无感知
// ── 双列统计卡 ──────────────────────────────────────────
.stat-grid {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  margin-bottom: 12px;
}

.stat-card {
  flex: 1;
  background: #ffffff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 0 16px;

  &:active { opacity: 0.75; }
}

.stat-count {
  font-size: 32px;
  font-weight: $ios-font-weight-semibold;
  color: $ios-blue;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: $ios-text-secondary;
  margin-top: 6px;
  font-weight: $ios-font-weight-regular;
}

// ── 分区标题（基本资料 / 运动档案）────────────────────────
.profile-section-title {
  font-size: 12px;
  color: $ios-text-tertiary;
  font-weight: $ios-font-weight-regular;
  padding: 0 16px 8px;
}

// ── 退出登录按钮 ──────────────────────────────────────────
.logout-btn {
  margin: 12px 16px 0;
  background: #ffffff;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  &:active { opacity: 0.7; }
}

.logout-btn-text {
  font-size: 16px;
  color: #333333;
  font-weight: $ios-font-weight-medium;
}

// ── 底部：联系客服 + 版本号 ────────────────────────────────
.app-footer-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding-bottom: 32px;
  margin-top: 8px;
}

.contact-btn {
  background: transparent !important;
  display: inline;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 0;
  overflow: visible;
  line-height: 1;
  min-height: 0;
  height: auto;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.2);

  &::after { display: none; }
  &:active { opacity: 0.5; }
}

.app-footer-dot {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.2);
}

.app-version {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.2);
  line-height: 1;
}

.profile-loading {
  min-height: 100vh;
  background: $ios-bg-secondary;
}

// ---- 登录界面 ----
.login-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
  display: flex;
  flex-direction: column;
  // NOTE: 左右 padding 设为 0，由 ios-section 的 margin: 0 16px 统一控制左右边距
  padding: 0 0 $ios-spacing-xl;
  box-sizing: border-box;
  padding-top: calc(#{$ios-spacing-xl} + 30px + env(safe-area-inset-top));
}

.login-page-title {
  font-size: 24px;
  color: $ios-text-primary;
  margin-bottom: 6px;
  // NOTE: 标题缩进与卡片左右边距对齐
  padding: 0 16px;
}

.login-page-subtitle {
  font-size: 12px;
  color: $ios-text-secondary;
  margin-bottom: 100px;
  padding: 0 16px;
}

// NOTE: 登录表单使用与主界面信息卡片相同的 ios-section，CSS 复用已定义的类名
.login-form-section {
  margin-bottom: $ios-spacing-lg;
}

// NOTE: 头像行 - 与其他 ios-cell 一致，右侧额外留出圆形头像空间
.login-cell--avatar {
  align-items: center;
}

// NOTE: 头像右对齐包裹，与主界面 ios-cell__value 布局完全一致
.login-avatar-value {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

// NOTE: 圆形头像选择按钮，必须参考 profile-avatar-circle、但尺寸芥小以适配单行別
.login-row-avatar-btn {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  padding: 0;
  background: transparent;
  border: none;
  box-sizing: border-box;
  display: block;
  flex-shrink: 0;
  &::after { border: none; }
}

// NOTE: view 包裹头像按钮并设 margin-left:auto，view 不受微信 button 默认样式影响
.login-avatar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.login-row-avatar {
  width: 48px;
  height: 48px;
  display: block;
}

// NOTE: 圆形占位：浅灰圆形背景 + 球拍图标居中
.login-row-avatar--placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

// NOTE: 默认头像使用球拍水印图，灰色透明状态提示「待选择」
.login-row-avatar-default {
  width: 36px;
  height: 36px;
  opacity: 0.35;
}

.login-row-avatar-icon {
  font-size: 24px;
}

// NOTE: 与主界面 profile-edit-badge 完全一致 - 下半圆白色半透明覆盖
.login-row-avatar-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 18px;
  background: rgba(100, 100, 108, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-row-avatar-badge-text {
  font-size: 10px;
  color: #ffffff;
}

// ios-cell-separator 在登录表单的分隔线
.ios-cell-separator {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.08);
  margin-left: $ios-spacing-lg;
}

// NOTE: 昵称输入框靠右显示，与 ios-cell__input--right 效果一致但不依赖跨页 scoped CSS
.login-nickname-right {
  flex: 1;
  text-align: right;
  font-size: 16px;
  color: $ios-text-primary;
  background: transparent;
  border: none;
}

.login-submit-btn {
  // NOTE: 左右 margin 16px，与卡片边距保持一致
  margin: $ios-spacing-xs 16px 0;
  height: 54px;
  background: $brand-accent;
  border-radius: $ios-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { opacity: 0.85; }
}

.login-submit-text {
  font-size: 16px;
  font-weight: $ios-font-weight-semibold;
  color: #ffffff;
}
</style>
