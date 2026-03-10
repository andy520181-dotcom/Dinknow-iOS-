<template>
  <!-- NOTE: 自定义导航栏，替代系统导航栏，消除 hairline 分割线 -->
  <view class="custom-navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
    <view
      class="custom-navbar__title-bar"
      :style="{ height: navBarHeight + 'px' }"
    >
      <!-- NOTE: 子页面返回按钮，与系统返回箭头风格一致 -->
      <view v-if="showBack" class="custom-navbar__back" @tap="goBack">
        <text class="custom-navbar__back-icon">‹</text>
      </view>
      <text v-if="title" class="custom-navbar__title">{{ title }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  title?: string
  /** 是否显示左上角返回箭头，子页面使用 */
  showBack?: boolean
}

defineProps<Props>()

/** 返回上一页 */
function goBack() {
  uni.navigateBack()
}

// NOTE: 状态栏高度，不同设备不同（刘海屏 ~44px，非刘海 ~20px）
const statusBarHeight = ref(20)
// NOTE: 导航栏内容区高度，与微信胶囊对齐
const navBarHeight = ref(44)

onMounted(() => {
  try {
    const sysInfo = uni.getSystemInfoSync()
    statusBarHeight.value = sysInfo.statusBarHeight || 20

    // NOTE: 通过胶囊按钮位置精确计算导航栏高度，确保标题与胶囊垂直居中
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton) {
      // 导航栏高度 = (胶囊底部 - 状态栏高度) + (胶囊顶部 - 状态栏高度)
      // 简化为：胶囊高度 + 上下间距 × 2
      const gap = menuButton.top - statusBarHeight.value
      navBarHeight.value = menuButton.height + gap * 2
    }
  } catch (e) {
    console.warn('CustomNavBar: 获取系统信息失败', e)
  }
})
</script>

<style lang="scss" scoped>
.custom-navbar {
  // NOTE: 透明背景，让页面渐变直接透出，导航栏只是占位 + 标题
  position: relative;
  z-index: 100;
  width: 100%;
}

.custom-navbar__title-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

// NOTE: 返回按钮绝对定位在左侧，不影响标题居中
.custom-navbar__back {
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 8px;
  z-index: 1;
}

.custom-navbar__back-icon {
  font-size: 28px;
  font-weight: 300;
  // NOTE: 深灰色箭头，与发起活动页返回按钮颜色一致
  color: #333333;
  line-height: 1;
}

.custom-navbar__title {
  font-size: 17px;
  font-weight: 600;
  // NOTE: 使用渐变终止色暖白，与品牌棕色背景同色系，高级感更强
  color: #FDF8F5;
  // NOTE: 限制标题宽度，避免与右上角胶囊按钮重叠
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
