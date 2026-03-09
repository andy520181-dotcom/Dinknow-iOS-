<template>
  <view class="edit-page">
    <!-- 取消 / 完成 -->
    <view class="edit-actions">
      <view class="edit-action-btn" @tap="onCancel">
        <text class="edit-action-text edit-action-text--cancel">取消</text>
      </view>
      <view
        class="edit-action-btn edit-action-btn--done"
        :class="{ 'edit-action-btn--done-disabled': !isValid }"
        @tap="isValid ? onDone() : undefined"
      >
        <text class="edit-action-text edit-action-text--done">完成</text>
      </view>
    </view>

    <view class="edit-body">

      <!-- 手机号 -->
      <view
        class="type-row"
        :class="{ 'type-row--active': contactType === 'phone' }"
        @tap="selectType('phone')"
      >
        <view class="check-circle" :class="{ 'check-circle--on': contactType === 'phone' }" />
        <text class="type-label">手机号</text>
        <view class="contact-inline" @tap.stop>
          <input
            class="contact-input"
            type="number"
            placeholder="请输入手机号"
            placeholder-class="contact-placeholder"
            :value="phoneValue"
            :disabled="contactType !== 'phone'"
            :maxlength="11"
            @input="onPhoneInput"
            :focus="contactType === 'phone'"
          />
        </view>
      </view>

      <!-- 12px 间距 -->
      <view class="row-gap" />

      <!-- 微信二维码：单行布局，相机图标/缩略图靠右，点击直接上传 -->
      <view
        class="type-row"
        :class="{ 'type-row--active': contactType === 'wechat' }"
        @tap="selectType('wechat')"
      >
        <view class="check-circle" :class="{ 'check-circle--on': contactType === 'wechat' }" />
        <text class="type-label">微信二维码</text>

        <!-- NOTE: 右侧区域：未上传显示相机图标，已上传显示缩略图+删除 -->
        <view class="qr-inline" @tap.stop="contactType === 'wechat' ? pickOrReplace() : selectType('wechat')">
          <!-- 已上传：缩略图 + × 删除 -->
          <view v-if="wechatQrPath" class="qr-thumb-wrap">
            <!-- NOTE: 点击缩略图全屏预览；tap.stop 防止冒泡到外层 pickOrReplace -->
            <image
              class="qr-thumb"
              :class="{ 'qr-thumb--loaded': qrLoaded }"
              :src="wechatQrPath"
              mode="aspectFill"
              @load="qrLoaded = true"
              @tap.stop="previewQr"
            />
            <view class="qr-del-btn" @tap.stop="removeQr">
              <text class="qr-del-icon">×</text>
            </view>
          </view>
          <!-- 未上传：相机图标 + 浅灰背景框，与备注栏上传按钮风格一致 -->
          <view v-else class="qr-add-btn">
            <image class="qr-camera-icon" src="/static/icons/xiangji.png" mode="aspectFit" />
          </view>
        </view>
      </view>

      <!-- NOTE: 🔒 隐私说明 -->
      <view class="privacy-hint">
        <text class="privacy-hint-text">🔒 仅对报名成功的参与者展示</text>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { callCloudFunction } from '../../services/cloud'

// NOTE: 微信原生 API，uni-app 环境有效，TS 类型声明避免 lint 报错
declare const wx: any

const contactType = ref<'phone' | 'wechat' | ''>('')
const phoneValue = ref('')
// NOTE: 微信二维码图片临时路径或已上传的 https/cloud URL
const wechatQrPath = ref('')
// NOTE: 图片加载完成标志，控制淡入动画
const qrLoaded = ref(false)

const isValid = computed(() => {
  if (contactType.value === 'phone') return phoneValue.value.trim().length > 0
  if (contactType.value === 'wechat') return wechatQrPath.value.length > 0
  return false
})

function selectType(type: 'phone' | 'wechat') {
  contactType.value = type
  // NOTE: 切换类型时清空另一栏，避免两栏同时有值
  if (type === 'phone') wechatQrPath.value = ''
  else phoneValue.value = ''
}

function onPhoneInput(e: any) {
  phoneValue.value = e?.detail?.value ?? ''
}

// NOTE: 选图后立即上传到 COS（CDN 永久 URL），避免临时路径失效
// 降级：COS 失败时使用 wx.cloud.uploadFile 兜底
function pickQrImage() {
  // #ifdef MP-WEIXIN
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempPath = res.tempFilePaths[0]
      if (!tempPath) return
      // NOTE: 不做本地预览，直接上传后一次性设置永久 URL，避免 src 切换导致图片闪跳
      qrLoaded.value = false
      uni.showLoading({ title: '上传中...' })
      try {
        const cosKey = `contact-qr/${Date.now()}.jpg`
        const cosRes: any = await callCloudFunction('uploadToCOS', { fileName: cosKey, fileType: 'image/jpeg' })
        if (cosRes?.success && cosRes.uploadUrl) {
          // NOTE: 直接读取临时文件字节流 PUT 到 COS 预签名 URL
          await new Promise<void>((resolve, reject) => {
            uni.request({
              url: cosRes.uploadUrl,
              method: 'PUT',
              data: uni.getFileSystemManager().readFileSync(tempPath),
              header: { 'Content-Type': 'image/jpeg' },
              success: (r: any) => {
                if (r.statusCode >= 200 && r.statusCode < 300) resolve()
                else reject(new Error(`COS PUT 失败: ${r.statusCode}`))
              },
              fail: reject
            })
          })
          // NOTE: 存 CDN 永久 URL，提交时直接使用，无需重传
          wechatQrPath.value = cosRes.cdnUrl as string
        } else {
          throw new Error('uploadToCOS 未返回预签名 URL，降级到云存储')
        }
      } catch (cosErr) {
        console.warn('COS 上传失败，降级 wx.cloud.uploadFile:', cosErr)
        try {
          const uploadRes = await new Promise<any>((resolve, reject) => {
            wx.cloud.uploadFile({
              cloudPath: `contact-qr/${Date.now()}.jpg`,
              filePath: tempPath,
              success: resolve,
              fail: reject
            })
          })
          if (uploadRes?.fileID) {
            wechatQrPath.value = uploadRes.fileID
          } else {
            throw new Error('wx.cloud 上传无 fileID')
          }
        } catch (e) {
          console.error('二维码上传全部失败:', e)
          uni.showToast({ title: '上传失败，请重试', icon: 'none' })
          wechatQrPath.value = ''
        }
      } finally {
        uni.hideLoading()
      }
    }
  })
  // #endif
}

function pickOrReplace() {
  pickQrImage()
}

function removeQr() {
  wechatQrPath.value = ''
  qrLoaded.value = false // NOTE: 重置加载状态，下次上传新图时重新淡入
}

// NOTE: 全屏预览已上传的微信二维码，支持长按保存
function previewQr() {
  if (!wechatQrPath.value) return
  uni.previewImage({ urls: [wechatQrPath.value], current: wechatQrPath.value })
}

function onDone() {
  if (contactType.value === 'phone') {
    uni.setStorageSync('editing_activity_contact_type', 'phone')
    uni.setStorageSync('editing_activity_contact_value', phoneValue.value.trim())
    uni.removeStorageSync('editing_activity_contact_wechat_qr')
  } else {
    uni.setStorageSync('editing_activity_contact_type', 'wechat')
    uni.setStorageSync('editing_activity_contact_value', '')
    // NOTE: 二维码图片路径单独存储，create-activity 提交时上传 COS
    uni.setStorageSync('editing_activity_contact_wechat_qr', wechatQrPath.value)
  }
  uni.navigateBack()
}

function onCancel() {
  uni.navigateBack()
}

onMounted(() => {
  const cachedType = uni.getStorageSync('editing_activity_contact_type')
  if (cachedType === 'phone' || cachedType === 'wechat') contactType.value = cachedType

  if (cachedType === 'phone') {
    const v = uni.getStorageSync('editing_activity_contact_value')
    if (typeof v === 'string') phoneValue.value = v
  } else if (cachedType === 'wechat') {
    const qr = uni.getStorageSync('editing_activity_contact_wechat_qr')
    if (typeof qr === 'string') wechatQrPath.value = qr
  }
})
</script>

<style lang="scss" scoped>
.edit-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
  display: flex;
  flex-direction: column;
}

// ── 顶部操作栏 ────────────────────────────────────────────
.edit-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $ios-spacing-sm $ios-spacing-lg;
  background: #ffffff;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.edit-action-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 4px;

  &--done {
    background: $brand-primary;
    border-radius: 8px;
    padding: 6px 16px;
    &-disabled { background: $ios-text-tertiary; }
  }
}

.edit-action-text {
  font-size: 16px;
  &--cancel { color: $ios-text-primary; }
  &--done   { color: #ffffff; font-weight: $ios-font-weight-medium; }
}

// ── 内容区 ────────────────────────────────────────────────
.edit-body {
  padding: $ios-spacing-md 0;
  display: flex;
  flex-direction: column;
}

.row-gap {
  height: 12px;
  flex-shrink: 0;
}

// ── 选项行 ────────────────────────────────────────────────
.type-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 60px;
  padding: 0 $ios-spacing-lg;
  background: #ffffff;
  gap: 10px;

  &:active { opacity: 0.75; }

  &--active { background: rgba(10, 132, 255, 0.08); }

  // NOTE: 微信二维码行纵向排列（标题行 + 图片区）
  &--wechat {
    flex-direction: column;
    align-items: stretch;
    min-height: 60px;
    padding-top: 0;
    padding-bottom: $ios-spacing-md;
    gap: 0;
  }
}

// NOTE: 微信行的标题行横排
.wechat-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  min-height: 60px;
  gap: 10px;
}

// ── 勾选圆圈 ──────────────────────────────────────────────
.check-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  position: relative;
  transition: all 0.15s ease;
  background: transparent;

  &--on {
    border-color: $brand-primary;
    background: $brand-primary;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 5px;
      height: 9px;
      border-right: 2px solid #ffffff;
      border-bottom: 2px solid #ffffff;
      transform: translate(-50%, -60%) rotate(45deg);
    }
  }
}

// NOTE: 主标签，16px medium
.type-label {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  color: $ios-text-primary;
  flex-shrink: 0;
  width: 80px;
}

// ── 手机行内输入 ──────────────────────────────────────────
.contact-inline {
  flex: 1;
  display: flex;
  align-items: center;
}

// NOTE: 输入内容，16px regular blue
.contact-input {
  flex: 1;
  font-size: 16px;
  font-weight: 400;
  color: $brand-primary;
  text-align: right;
}

.contact-placeholder {
  font-size: 16px;
  font-weight: 400;
  color: $ios-text-tertiary;
}

// ── 微信二维码行内图标区域 ───────────────────────────────
.qr-inline {
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

// NOTE: 未上传时显示的浅灰背景框，参考 edit-remark 的 remark-add-btn 风格
.qr-add-btn {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: $ios-bg-secondary;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active { opacity: 0.6; }
}

.qr-camera-icon {
  width: 22px;
  height: 22px;
  opacity: 0.45;
}

// NOTE: 已上传缩略图展示小正方图
.qr-thumb-wrap {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

// NOTE: 默认透明，@load 后 opacity:1 淡入，与 ActivityCard 头像动画保持一致
.qr-thumb {
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.25s ease;

  &--loaded { opacity: 1; }
}

.qr-del-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-del-icon {
  font-size: 11px;
  color: #ffffff;
  line-height: 1;
}

// ── 隐私提示 ──────────────────────────────────────────────
.privacy-hint {
  margin-top: $ios-spacing-sm;
  padding: 0 $ios-spacing-lg;
}

.privacy-hint-text {
  font-size: 12px;
  font-weight: 400;
  color: $ios-text-tertiary;
}
</style>
