<template>
  <!-- NOTE: 个人资料弹层，点击参与者头像时弹出 -->
  <view v-if="visible" class="profile-modal-overlay" @tap="$emit('close')">
    <view class="profile-modal" @tap.stop>
      <view class="profile-modal-header">
        <text class="profile-modal-title">个人资料</text>
        <view class="profile-modal-close" @tap="$emit('close')">
          <text class="close-icon">×</text>
        </view>
      </view>
      <view class="profile-modal-content" :key="'profile-' + (user?.openid || '') + '-' + (user?.region ?? '') + '-' + (user?.signature ?? '')">
        <template v-if="user">
          <view class="profile-avatar-section">
            <!-- NOTE: 点击头像调起微信内置大图预览 -->
            <image
              v-if="user.avatarUrl"
              :src="resolvedAvatarUrl"
              class="profile-modal-avatar"
              mode="aspectFill"
              @tap="$emit('preview-avatar')"
            />
            <view v-else class="profile-modal-avatar-placeholder">
              <text class="avatar-placeholder-icon-large">👤</text>
            </view>
          </view>
          <view class="profile-info-section">
            <view class="profile-info-item">
              <text class="profile-info-label">昵称</text>
              <text class="profile-info-value">{{ user.nickName || '匹克球友' }}</text>
            </view>
            <view class="profile-info-item">
              <text class="profile-info-label">性别</text>
              <text class="profile-info-value">{{ genderText }}</text>
            </view>
            <view class="profile-info-item">
              <text class="profile-info-label">地区</text>
              <text class="profile-info-value">{{ regionText }}</text>
            </view>
            <view class="profile-info-item">
              <text class="profile-info-label">DUPR 水平</text>
              <text class="profile-info-value">{{ duprText }}</text>
            </view>
            <view class="profile-info-item">
              <text class="profile-info-label">球风</text>
              <text class="profile-info-value">{{ signatureText }}</text>
            </view>
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { User } from '../../types'
import { getDuprDisplayText } from '../../utils/activity'

interface Props {
  /** 弹窗显隐 */
  visible: boolean
  /** 要展示的用户数据 */
  user: User | null
  /** 已解析的头像 URL（父组件负责 cloud:// 转换） */
  resolvedAvatarUrl?: string
}

const props = defineProps<Props>()

defineEmits<{
  (e: 'close'): void
  (e: 'preview-avatar'): void
}>()

const GENDER_MAP: Record<number, string> = { 0: '保密', 1: '男', 2: '女' }

const genderText = computed(() => {
  if (!props.user) return ''
  return GENDER_MAP[props.user.gender ?? 0] || '保密'
})

const duprText = computed(() => getDuprDisplayText(props.user?.duprLevel))

const regionText = computed(() => {
  const r = (props.user as any)?.region
  return r && String(r).trim() ? String(r).trim() : '未设置'
})

const signatureText = computed(() => {
  const s = (props.user as any)?.signature
  return s && String(s).trim() ? String(s).trim() : '未设置'
})
</script>

<style lang="scss" scoped>
.profile-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: $ios-spacing-lg;
}

.profile-modal {
  width: 100%;
  max-width: 400px;
  background: $ios-bg-primary;
  border-radius: $ios-radius-lg;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.profile-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $ios-spacing-lg;
  border-bottom: 0.5px solid $ios-separator;
}

.profile-modal-title {
  font-size: 16px;
  font-weight: $ios-font-weight-semibold;
  color: $ios-text-primary;
}

.profile-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  
  &:active {
    opacity: 0.7;
  }
}

.close-icon {
  font-size: 24px;
  color: $ios-text-tertiary;
  line-height: 1;
}

.profile-modal-content {
  padding: $ios-spacing-lg;
}

.profile-avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: $ios-spacing-lg;
}

.profile-modal-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: $ios-bg-tertiary;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.profile-modal-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: $ios-bg-tertiary;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder-icon-large {
  font-size: 28px;
  opacity: 0.4;
}

.profile-info-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-info-label {
  font-size: 12px;
  color: $ios-text-tertiary;
  font-weight: $ios-font-weight-medium;
}

.profile-info-value {
  font-size: 16px;
  color: $ios-text-primary;
  font-weight: $ios-font-weight-regular;
}

.profile-loading {
  text-align: center;
  padding: $ios-spacing-xl;
  color: $ios-text-tertiary;
  font-size: 16px;
}
</style>
