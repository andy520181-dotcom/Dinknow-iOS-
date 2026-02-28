<template>
  <view class="edit-field-page">
    <!-- NOTE: 外层容器负责 padding-top 安全区，内层 row 独立 44px 居中 -->
    <view class="edit-field-nav">
      <view class="edit-field-nav-row">
        <view class="edit-field-nav-cancel" @tap="onCancel">
          <text class="edit-field-nav-cancel-text">取消</text>
        </view>
        <text class="edit-field-nav-title">{{ pageTitle }}</text>
        <view
          class="edit-field-nav-done"
          :class="{ 'edit-field-nav-done--disabled': !inputValue.trim() }"
          @tap="onDone"
        >
          <text class="edit-field-nav-done-text">完成</text>
        </view>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="edit-field-body">
      <view class="edit-field-input-card">
        <input
          v-if="fieldType === 'nickname'"
          class="edit-field-input"
          :value="inputValue"
          type="text"
          :placeholder="placeholder"
          :maxlength="maxLen"
          focus
          @input="onInput"
        />
        <textarea
          v-else
          class="edit-field-textarea"
          :value="inputValue"
          :placeholder="placeholder"
          :maxlength="maxLen"
          focus
          @input="onInput"
        />
        <!-- 字数提示 -->
        <text class="edit-field-count">{{ inputValue.length }}/{{ maxLen }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// NOTE: 通过页面参数决定编辑的字段类型（nickname / signature）
const fieldType = ref<'nickname' | 'signature'>('nickname')
const inputValue = ref('')

const pageTitle = computed(() => {
  return fieldType.value === 'nickname' ? '设置昵称' : '编辑球风'
})

const placeholder = computed(() => {
  return fieldType.value === 'nickname' ? '请输入昵称' : '请填写球风，如进攻型、防守型等'
})

const maxLen = computed(() => {
  return fieldType.value === 'nickname' ? 20 : 80
})

onMounted(() => {
  // NOTE: 接收上一页传来的参数：type（字段类型）和 value（当前值）
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options ?? {}
  fieldType.value = (options.type === 'signature' ? 'signature' : 'nickname')
  inputValue.value = decodeURIComponent(options.value ?? '')
})

function onInput(e: any) {
  inputValue.value = e?.detail?.value ?? ''
}

function onCancel() {
  uni.navigateBack()
}

function onDone() {
  if (!inputValue.value.trim()) return
  // NOTE: 通过 eventBus 通知上一页保存结果，key 与字段类型对应
  uni.$emit('profileFieldSaved', {
    type: fieldType.value,
    value: inputValue.value.trim()
  })
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.edit-field-page {
  min-height: 100vh;
  background: $ios-bg-secondary;
  display: flex;
  flex-direction: column;
}

// NOTE: 外层导航栏只负责 padding-top 安全区高度
.edit-field-nav {
  padding-top: env(safe-area-inset-top);
  background: #ffffff;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
}

// NOTE: 内层 row 独立 44px，内容居中显示在刘海屏下方
.edit-field-nav-row {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $ios-spacing-md;
}

.edit-field-nav-cancel {
  min-width: 60px;
}

.edit-field-nav-cancel-text {
  font-size: 16px;
  color: $ios-text-primary;
}

.edit-field-nav-title {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  color: $ios-text-primary;
}

.edit-field-nav-done {
  min-width: 60px;
  height: 30px;
  background: $ios-blue;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
}

.edit-field-nav-done--disabled {
  background: $ios-text-tertiary;
}

.edit-field-nav-done-text {
  font-size: 15px;
  color: #ffffff;
  font-weight: $ios-font-weight-medium;
}

.edit-field-body {
  padding: $ios-spacing-md 0;
}

.edit-field-input-card {
  background: #ffffff;
  padding: $ios-spacing-md $ios-spacing-lg;
  position: relative;
}

.edit-field-input {
  width: 100%;
  font-size: 16px;
  color: $ios-text-primary;
  min-height: 44px;
}

.edit-field-textarea {
  width: 100%;
  font-size: 16px;
  color: $ios-text-primary;
  min-height: 120px;
}

.edit-field-count {
  font-size: 13px;
  color: $ios-text-tertiary;
  display: block;
  text-align: right;
  margin-top: $ios-spacing-xs;
}
</style>
