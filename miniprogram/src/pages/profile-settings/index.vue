<template>
  <view class="settings-page">
    <scroll-view scroll-y class="settings-scroll">
      <view class="settings-body">

        <!-- ── 基本资料 ── -->
        <view class="ios-section">
          <!-- 头像：放第一行，点击调起微信选头像 -->
          <view class="ios-cell ios-cell--avatar">
            <image class="ios-cell__row-icon" src="/static/icons/touxiang.png" mode="aspectFit" />
            <text class="ios-cell__label">头像</text>
            <view class="ios-cell__value ios-cell__value--right avatar-preview-wrap">
              <button
                class="avatar-preview-btn"
                open-type="chooseAvatar"
                @chooseavatar="onChooseAvatar"
              >
                <image
                  v-if="resolvedAvatarUrl"
                  class="avatar-preview"
                  :src="resolvedAvatarUrl"
                  mode="aspectFill"
                />
                <view v-else class="avatar-preview avatar-preview--placeholder">
                  <image class="avatar-placeholder-img" src="/static/icons/avatar-placeholder.png" mode="aspectFit" />
                </view>
              </button>
            </view>
            <text class="ios-cell__chevron">›</text>
          </view>

          <!-- 昵称 -->
          <view class="ios-cell" @tap="openNicknameEdit">
            <image class="ios-cell__row-icon" src="/static/icons/nicheng.png" mode="aspectFit" />
            <text class="ios-cell__label">昵称</text>
            <text :class="nickName ? 'ios-cell__value' : 'ios-cell__value ios-cell__placeholder'">
              {{ nickName || '请输入' }}
            </text>
            <text class="ios-cell__chevron">›</text>
          </view>

          <!-- 性别 -->
          <view class="ios-cell" @tap="openGenderEdit">
            <image class="ios-cell__row-icon" src="/static/icons/xingbie.png" mode="aspectFit" />
            <text class="ios-cell__label">性别</text>
            <text :class="genderSet ? 'ios-cell__value' : 'ios-cell__value ios-cell__placeholder'">
              {{ genderText }}
            </text>
            <text class="ios-cell__chevron">›</text>
          </view>

          <!-- 地区 -->
          <view class="ios-cell" @tap="openRegionEdit">
            <image class="ios-cell__row-icon" src="/static/icons/diqu.png" mode="aspectFit" />
            <text class="ios-cell__label">地区</text>
            <text :class="region ? 'ios-cell__value' : 'ios-cell__value ios-cell__placeholder'">
              {{ region || '请选择' }}
            </text>
            <text class="ios-cell__chevron">›</text>
          </view>

          <!-- DUPR 水平 -->
          <view class="ios-cell ios-cell--tap">
            <image class="ios-cell__row-icon" src="/static/icons/dupr.png" mode="aspectFit" />
            <text class="ios-cell__label">DUPR 水平</text>
            <view class="ios-cell__value ios-cell__value--right">
              <picker
                mode="selector"
                :range="duprOptions"
                :value="duprIndex"
                @change="onDuprChange"
              >
                <text :class="duprLevel ? 'ios-picker-text' : 'ios-cell__placeholder'">
                  {{ duprLevel || '请选择' }}
                </text>
              </picker>
            </view>
            <text class="ios-cell__chevron">›</text>
          </view>

          <!-- 球风 -->
          <view class="ios-cell" @tap="openSignatureEdit">
            <image class="ios-cell__row-icon" src="/static/icons/qiufeng.png" mode="aspectFit" />
            <text class="ios-cell__label">球风</text>
            <text :class="signature ? 'ios-cell__value ios-cell__value--ellipsis' : 'ios-cell__value ios-cell__value--ellipsis ios-cell__placeholder'">
              {{ signature || '请填写' }}
            </text>
            <text class="ios-cell__chevron">›</text>
          </view>
        </view>

        <!-- ── 关于 Dinkin ── -->
        <view class="ios-section">
          <!-- 用户协议 -->
          <view class="ios-cell" @tap="openAgreement('user')">
            <image class="ios-cell__row-icon" src="/static/icons/yonghuxieyi.png" mode="aspectFit" />
            <text class="ios-cell__label">用户协议</text>
            <text class="ios-cell__chevron">›</text>
          </view>
          <!-- 隐私政策 -->
          <view class="ios-cell" @tap="openAgreement('privacy')">
            <image class="ios-cell__row-icon" src="/static/icons/yinsizhengce.png" mode="aspectFit" />
            <text class="ios-cell__label">隐私政策</text>
            <text class="ios-cell__chevron">›</text>
          </view>
          <!-- NOTE: 联系客服使用微信原生 open-type=contact -->
          <view class="ios-cell">
            <image class="ios-cell__row-icon" src="/static/icons/kefu.png" mode="aspectFit" />
            <text class="ios-cell__label">联系客服</text>
            <button class="contact-btn" open-type="contact">联系</button>
            <text class="ios-cell__chevron">›</text>
          </view>
          <!-- 当前版本：无交互，仅展示 -->
          <view class="ios-cell">
            <image class="ios-cell__row-icon" src="/static/icons/guanyubanben.png" mode="aspectFit" />
            <text class="ios-cell__label">当前版本</text>
            <text class="ios-cell__value">v{{ appVersion }}</text>
          </view>
        </view>

        <!-- ── 退出登录按钮 ── -->
        <view class="logout-btn" @tap="handleLogout">
          <text class="logout-btn-text">退出登录</text>
        </view>

      </view>
    </scroll-view>

    <!-- ── 性别选择 Action Sheet ── -->
    <view v-if="showPickerModal" class="action-sheet-mask" @tap="closePickerModal">
      <view class="action-sheet" @tap.stop>
        <template v-for="(item, index) in currentPickerOptions" :key="item">
          <view class="action-sheet-item" @tap="selectPickerOption(item)">
            <text class="action-sheet-item-text">{{ item }}</text>
          </view>
          <view v-if="index < currentPickerOptions.length - 1" class="action-sheet-sep" />
        </template>
        <view class="action-sheet-item action-sheet-item--cancel" @tap="closePickerModal">
          <text class="action-sheet-item-text action-sheet-item-text--cancel">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { login, getProfile, updateProfile } from '../../services/user'
import { getTempFileURLs, callCloudFunction, clearCloudUrlCache } from '../../services/cloud'
import { showErrorToast } from '../../utils/error'
import type { User } from '../../types'

const genderOptions = ['保密', '男', '女']
const duprOptions = ['初级 1.0-2.5', '中级 3.0-3.5', '高级 4.0-4.5', '专业级 5.0+']

// NOTE: 版本号从微信 accountInfo 读取，仅小程序环境可用
const appVersion = ref('')
try {
  // #ifdef MP-WEIXIN
  const info = wx.getAccountInfoSync()
  appVersion.value = info?.miniProgram?.version || 'dev'
  // #endif
} catch {
  appVersion.value = 'dev'
}

const user = ref<User | null>(null)
const nickName = ref('')
const avatarUrl = ref('')
const gender = ref<0 | 1 | 2>(0)
const genderSet = ref(false)
const duprLevel = ref('')
const region = ref('')
const signature = ref('')
const saving = ref(false)

// NOTE: 头像 cloud:// → https:// 解析缓存（与个人页逻辑一致）
const cloudUrlMap = ref<Record<string, string>>({})

const resolvedAvatarUrl = computed(() => {
  const url = avatarUrl.value
  if (!url) return ''
  if (url.startsWith('https://') || url.startsWith('http://')) return url
  const cached = cloudUrlMap.value[url]
  if (cached && (cached.startsWith('https://') || cached.startsWith('http://'))) return cached
  // NOTE: cloud:// 未解析期间直接返回原始 URL，小程序 image 组件原生支持 cloud://，避免闪烁
  if (url.startsWith('cloud://')) return url
  return ''
})

watch(avatarUrl, async (val: string) => {
  if (val && val.startsWith('cloud://') && !cloudUrlMap.value[val]) {
    try {
      const urlMap = await getTempFileURLs([val])
      const v = urlMap[val]
      if (v && (v.startsWith('https://') || v.startsWith('http://'))) {
        cloudUrlMap.value = { ...cloudUrlMap.value, [val]: v }
      }
    } catch {}
  }
}, { immediate: true })

const duprIndex = computed(() => {
  if (!duprLevel.value) return 0
  const idx = duprOptions.indexOf(duprLevel.value)
  return idx >= 0 ? idx : 0
})

const genderText = computed(() => genderSet.value ? (genderOptions[gender.value] || '保密') : '请选择')

// 选项弹窗
const showPickerModal = ref(false)
const pickerType = ref<'gender'>('gender')
const currentPickerOptions = ref<string[]>([])

async function loadProfile() {
  try {
    // 先从缓存快速填充
    const cached = uni.getStorageSync('cached_profile')
    if (cached) {
      user.value = cached
      nickName.value = cached.nickName || ''
      avatarUrl.value = cached.avatarUrl || ''
      if (typeof cached.gender === 'number' && cached.gender > 0) {
        gender.value = cached.gender as 0 | 1 | 2
        genderSet.value = true
      }
      duprLevel.value = cached.duprLevel || ''
      region.value = cached.region || ''
      signature.value = cached.signature || ''
    }
    // 再网络刷新
    const loginRes = await login()
    const openid = loginRes?.openid
    if (openid) {
      const profile = await getProfile(openid)
      if (profile) {
        user.value = profile
        nickName.value = profile.nickName || ''
        avatarUrl.value = profile.avatarUrl || ''
        if (typeof profile.gender === 'number' && profile.gender > 0) {
          gender.value = profile.gender as 0 | 1 | 2
          genderSet.value = true
        }
        duprLevel.value = profile.duprLevel || ''
        region.value = (profile as any).region || ''
        signature.value = (profile as any).signature || ''
        try { uni.setStorageSync('cached_profile', profile) } catch {}
      }
    }
  } catch (e) {
    console.error('加载设置页 profile 失败', e)
  }
}

async function saveProfile() {
  saving.value = true
  try {
    const result = await updateProfile({
      nickName: nickName.value.trim() || '匹克球友',
      avatarUrl: avatarUrl.value || user.value?.avatarUrl,
      gender: gender.value,
      duprLevel: duprLevel.value || '',
      region: region.value || '',
      signature: signature.value || ''
    } as any)
    if (result?.success === false) {
      uni.showToast({ title: result.message || '保存失败', icon: 'none' })
      return
    }
    // NOTE: 保存后同步更新缓存，确保个人页 onShow 刷新时读到最新数据
    try {
      const cached = uni.getStorageSync('cached_profile') || {}
      uni.setStorageSync('cached_profile', {
        ...cached,
        nickName: nickName.value,
        avatarUrl: avatarUrl.value,
        gender: gender.value,
        duprLevel: duprLevel.value,
        region: region.value,
        signature: signature.value
      })
    } catch {}
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (error: any) {
    showErrorToast(error, '保存失败，请稍后再试')
  } finally {
    saving.value = false
  }
}

// NOTE: 微信 open-type=chooseAvatar 头像上传，优先 COS，降级云开发
async function onChooseAvatar(e: any) {
  const tempPath = e?.detail?.avatarUrl
  if (!tempPath) return
  uni.showLoading({ title: '上传中...' })
  try {
    // #ifdef MP-WEIXIN
    const openid = user.value?.openid || 'unknown'
    const cosKey = `avatars/${openid}_${Date.now()}.jpg`
    let uploaded = false
    try {
      const cosRes: any = await callCloudFunction('uploadToCOS', { fileName: cosKey, fileType: 'image/jpeg' })
      if (cosRes?.success && cosRes.uploadUrl) {
        await new Promise<void>((resolve, reject) => {
          uni.request({
            url: cosRes.uploadUrl,
            method: 'PUT',
            data: uni.getFileSystemManager().readFileSync(tempPath),
            header: { 'Content-Type': 'image/jpeg' },
            success: (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300) resolve()
              else reject(new Error(`COS PUT 失败: ${res.statusCode}`))
            },
            fail: reject
          })
        })
        avatarUrl.value = cosRes.cdnUrl
        uploaded = true
      }
    } catch (cosErr) {
      console.warn('[settings onChooseAvatar] COS 失败，降级到 wx.cloud:', cosErr)
    }
    if (!uploaded) {
      const cloudPath = `avatars/${Date.now()}-wechat.jpg`
      const uploadRes = await (wx as any).cloud.uploadFile({ cloudPath, filePath: tempPath })
      avatarUrl.value = uploadRes.fileID
    }
    await saveProfile()
    // #endif
  } catch (err) {
    console.error('头像上传失败:', err)
    uni.showToast({ title: '上传失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function openNicknameEdit() {
  uni.navigateTo({
    url: `/pages/edit-text-field/index?type=nickname&value=${encodeURIComponent(nickName.value)}`
  })
}

function openSignatureEdit() {
  uni.navigateTo({
    url: `/pages/edit-text-field/index?type=signature&value=${encodeURIComponent(signature.value)}`
  })
}

function openGenderEdit() {
  pickerType.value = 'gender'
  currentPickerOptions.value = genderOptions
  showPickerModal.value = true
}

function openRegionEdit() {
  uni.navigateTo({
    url: `/pages/city-select/index?from=profile&currentCity=${encodeURIComponent(region.value || '')}`
  })
}

function onDuprChange(e: any) {
  const idx = Number(e?.detail?.value ?? 0)
  duprLevel.value = duprOptions[idx] ?? ''
  saveProfile()
}

async function selectPickerOption(value: string) {
  if (pickerType.value === 'gender') {
    const idx = genderOptions.indexOf(value)
    gender.value = (idx >= 0 ? idx : 0) as 0 | 1 | 2
    genderSet.value = true
  }
  showPickerModal.value = false
  await saveProfile()
}

function closePickerModal() {
  showPickerModal.value = false
}

/**
 * 跳转到协议页，复用项目内已有的本地协议页面（与登录页逻辑一致）
 * @param type 'user' = 用户协议  'privacy' = 隐私政策
 */
function openAgreement(type: 'user' | 'privacy') {
  const url = type === 'user'
    ? '/pages/user-agreement/index'
    : '/pages/privacy-policy/index'
  uni.navigateTo({ url })
}


onMounted(() => {
  loadProfile()
  // NOTE: 接收 edit-text-field 页保存的昵称/球风事件
  uni.$on('profileFieldSaved', async (data: { type: string; value: string }) => {
    if (data.type === 'nickname') nickName.value = data.value
    else if (data.type === 'signature') signature.value = data.value
    await saveProfile()
  })
})

// NOTE: 从城市选择页返回，同步地区数据
onShow(() => {
  const saved = uni.getStorageSync('profile_region')
  if (saved) {
    region.value = saved
    uni.removeStorageSync('profile_region')
    saveProfile()
  }
})

// NOTE: 退出登录：清除本地缓存，跳转回个人页触发登录状态刷新
function handleLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确认退出登录？',
    confirmText: '退出',
    confirmColor: '#FF3B30',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.setStorageSync('explicitly_logged_out', true)
        uni.setStorageSync('is_logged_in', false)
        clearCloudUrlCache()
        // NOTE: reLaunch 到个人页，页面完全刷新后会显示登录视图
        uni.reLaunch({ url: '/pages/profile/index' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.settings-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
}

.settings-scroll {
  height: 100vh;
}

.settings-body {
  padding-top: 16px;
  padding-bottom: 40px;
}

// NOTE: 复用个人页 ios-section 全局变量样式，确保视觉一致
.ios-section {
  margin: 0 16px 16px;
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.ios-cell {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  // NOTE: 全部单元格统一为 60px，与发起活动页一致
  min-height: 60px;
  box-sizing: border-box;

  &:last-child {
    border-bottom: none;
  }

  // NOTE: 头像行与其他行同为 60px，语义保留以便后续单独斉高
  &--avatar {
    min-height: 60px;
  }
}

.ios-cell__row-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
  flex-shrink: 0;
  // NOTE: 所有行图标统一半透明效果，与 iOS 系统规范一致
  opacity: 0.75;
}

.ios-cell__label {
  // NOTE: 表单规范：标签/值/标题统一 16px + $ios-text-primary
  font-size: 16px;
  color: $ios-text-primary;
  flex: 1;
}

.ios-cell__value {
  // NOTE: 与发起活动页尺寸一致：16px / 深色主文字
  font-size: 16px;
  color: $ios-text-primary;
  max-width: 50%;
  text-align: right;

  &--right {
    display: flex;
    justify-content: flex-end;
  }

  &--ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.ios-cell__placeholder {
  color: #c7c7cc;
}

.ios-cell__chevron {
  font-size: 18px;
  color: #c7c7cc;
  margin-left: 6px;
  flex-shrink: 0;
}

.ios-picker-text {
  // NOTE: 与 ios-cell__value 和发起活动页保持一致
  font-size: 16px;
  color: $ios-text-primary;
}

// ── 头像预览 ──
.avatar-preview-wrap {
  max-width: unset;
}

.avatar-preview-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  &::after { display: none; }
}

.avatar-preview {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;

  &--placeholder {
    background: #e5e5ea;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.avatar-placeholder-img {
  width: 22px;
  height: 22px;
  opacity: 0.5;
}

// ── 性别 Action Sheet ──
.action-sheet-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.action-sheet {
  width: 100%;
  background: #F5F5F7;
  border-radius: 16px 16px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 0px);
  overflow: hidden;
}

.action-sheet-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  background: #ffffff;
  margin: 0 16px;

  &--cancel {
    background: #ffffff;
    border-radius: 16px;
    margin: 8px 16px 8px;
  }
}

.action-sheet-item-text {
  font-size: 16px;
  color: $ios-text-primary;

  &--cancel {
    color: #8e8e93;
  }
}

.action-sheet-sep {
  height: 0.5px;
  background: rgba(0, 0, 0, 0.08);
  margin: 0 16px;
}

// NOTE: 联系客服按鈕：完全重置微信 button 默认样式，字体与 ios-cell__value 保持一致
.contact-btn {
  background: transparent !important;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 0;
  overflow: visible;
  min-height: 0;
  height: auto;
  // NOTE: 微信 button 默认色权重高，必须加 !important 才能生效；颜色与其他已填写栏值一致
  font-size: 16px !important;
  font-weight: 400 !important;
  color: $ios-text-primary !important;
  line-height: 1.4;
  text-align: right;
  display: flex;
  align-items: center;

  &::after { display: none; }
  &:active { opacity: 0.5; }
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

</style>
