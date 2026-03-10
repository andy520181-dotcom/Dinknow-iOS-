<template>
  <view class="about-page">
    <CustomNavBar title="关于我们" :showBack="true" backColor="#333333" />

    <view class="about-body">

      <!-- NOTE: 品牌区：Logo + 名称 + 版本号居中 -->
      <view class="about-brand">
        <view class="about-logo-wrap">
          <image class="about-logo" src="/static/icons/login-avatar.png" mode="aspectFit" />
        </view>
        <text class="about-app-name">Dinkin</text>
        <text class="about-version">v{{ appVersion }}</text>
      </view>

      <!-- NOTE: 信息卡片区 -->
      <view class="ios-section">
        <view class="ios-cell" @tap="openAgreement('user')">
          <text class="ios-cell__label">用户协议</text>
          <text class="ios-cell__chevron">›</text>
        </view>
        <view class="ios-cell" @tap="openAgreement('privacy')">
          <text class="ios-cell__label">隐私政策</text>
          <text class="ios-cell__chevron">›</text>
        </view>
      </view>

      <!-- NOTE: 备案号底部居中展示，合规要求 -->
      <view class="about-footer">
        <text class="about-icp">粤ICP备2026022143号-1X</text>
        <text class="about-copyright">© 2026 Dinkin. All rights reserved.</text>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CustomNavBar from '../../components/CustomNavBar.vue'

const appVersion = ref('dev')

/**
 * 跳转协议页
 * @param type 'user' = 用户协议  'privacy' = 隐私政策
 */
function openAgreement(type: 'user' | 'privacy') {
  const url = type === 'user'
    ? '/pages/user-agreement/index'
    : '/pages/privacy-policy/index'
  uni.navigateTo({ url })
}

onMounted(() => {
  const info = uni.getAccountInfoSync?.()
  appVersion.value = info?.miniProgram?.version || 'dev'
})
</script>

<style lang="scss" scoped>
.about-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
}

.about-body {
  padding-top: 20px;
}

// ── 品牌区 ──
.about-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0 36px;
}

.about-logo-wrap {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.about-logo {
  width: 100%;
  height: 100%;
}

.about-app-name {
  font-size: 20px;
  font-weight: 600;
  color: $ios-text-primary;
  margin-top: 14px;
}

.about-version {
  font-size: 13px;
  color: $ios-text-tertiary;
  margin-top: 4px;
}

// ── 信息卡片 ──
.ios-section {
  margin: 0 16px;
  border-radius: $ios-radius-lg;
  background: #ffffff;
  overflow: hidden;
}

.ios-cell {
  display: flex;
  align-items: center;
  min-height: 52px;
  padding: 0 $ios-spacing-lg;
  // NOTE: 底边分隔线
  &:not(:last-child) {
    border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  }
}

.ios-cell__label {
  flex: 1;
  font-size: 16px;
  color: $ios-text-primary;
}

.ios-cell__chevron {
  font-size: 18px;
  color: rgba(60, 60, 67, 0.18);
  margin-left: 4px;
}

// ── 底部备案信息 ──
.about-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px 32px;
  gap: 6px;
}

.about-icp {
  font-size: 12px;
  color: $ios-text-tertiary;
}

.about-copyright {
  font-size: 11px;
  color: rgba(60, 60, 67, 0.18);
}
</style>
