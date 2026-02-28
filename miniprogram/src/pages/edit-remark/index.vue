<template>
  <view class="remark-page">
    <!-- NOTE: 外层 padding-top 安全区，内层 row 44px 独立居中 -->
    <view class="remark-nav">
      <view class="remark-nav-row">
        <view class="remark-nav-cancel" @tap="onCancel">
          <text class="remark-nav-cancel-text">取消</text>
        </view>
        <text class="remark-nav-title">备注</text>
        <view class="remark-nav-done" @tap="onDone">
          <text class="remark-nav-done-text">完成</text>
        </view>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="remark-body">
      <view class="remark-input-card">
        <textarea
          class="remark-textarea"
          placeholder="选填，如注意事项、装备要求等"
          :value="content"
          :maxlength="1000"
          focus
          @input="onInput"
        />
        <text class="remark-count">{{ content.length }}/1000</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const content = ref('')

function onInput(e: any) {
  content.value = e?.detail?.value ?? ''
}

function onDone() {
  // NOTE: 将备注保存到 storage，返回后由发起活动页 onShow 读取同步
  uni.setStorageSync('editing_activity_remark', content.value)
  uni.navigateBack()
}

function onCancel() {
  uni.navigateBack()
}

onMounted(() => {
  // 读取发起活动页传入的当前备注内容，回填到输入框
  const cached = uni.getStorageSync('editing_activity_remark')
  if (typeof cached === 'string') {
    content.value = cached
  }
})
</script>

<style lang="scss" scoped>
.remark-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
  display: flex;
  flex-direction: column;
}

// NOTE: 外层导航栏只负责 padding-top 安全区高度
.remark-nav {
  padding-top: env(safe-area-inset-top);
  background: #ffffff;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

// NOTE: 内层 row 独立 44px，内容居中显示在刘海屏下方
.remark-nav-row {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $ios-spacing-md;
}

.remark-nav-cancel {
  min-width: 60px;
}

.remark-nav-cancel-text {
  font-size: 16px;
  color: $ios-text-primary;
}

.remark-nav-title {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  color: $ios-text-primary;
}

.remark-nav-done {
  min-width: 60px;
  height: 30px;
  background: $ios-blue;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
}

.remark-nav-done-text {
  font-size: 15px;
  color: #ffffff;
  font-weight: $ios-font-weight-medium;
}

.remark-body {
  padding: $ios-spacing-md 0;
}

.remark-input-card {
  background: #ffffff;
  padding: $ios-spacing-md $ios-spacing-lg;
}

.remark-textarea {
  width: 100%;
  font-size: 16px;
  color: $ios-text-primary;
  min-height: 160px;
  line-height: 1.6;
}

.remark-count {
  font-size: 13px;
  color: $ios-text-tertiary;
  display: block;
  text-align: right;
  margin-top: $ios-spacing-xs;
}
</style>
