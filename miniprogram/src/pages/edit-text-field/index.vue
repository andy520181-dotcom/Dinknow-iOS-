<template>
  <view class="edit-field-page">
    <!-- NOTE: 原生导航栏显示页面标题，取消/完成按钮在导航栏下方独立一行，避免被微信胶囊按钮遮挡 -->
    <view class="edit-field-actions">
      <view class="edit-field-action-btn" @tap="onCancel">
        <text class="edit-field-action-text edit-field-action-text--cancel">取消</text>
      </view>
      <view
        class="edit-field-action-btn edit-field-action-btn--done"
        :class="{ 'edit-field-action-btn--disabled': !inputValue.trim() }"
        @tap="onDone"
      >
        <text class="edit-field-action-text edit-field-action-text--done">完成</text>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="edit-field-body">
      <view class="edit-field-input-card">
        <!-- NOTE: 昵称用 type="nickname"（键盘弹出微信昵称），球风用 type="text"（纯文本输入） -->
        <input
          class="edit-field-input"
          :value="inputValue"
          :type="fieldType === 'nickname' ? 'nickname' : 'text'"
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

// NOTE: 通过页面参数决定编辑的字段类型（nickname / signature / title）
const fieldType = ref<'nickname' | 'signature' | 'title'>('nickname')
const inputValue = ref('')

const pageTitle = computed(() => {
  if (fieldType.value === 'title') return '编辑标题'
  return fieldType.value === 'nickname' ? '设置昵称' : '编辑球风'
})

const placeholder = computed(() => {
  if (fieldType.value === 'title') return '请输入活动标题'
  return fieldType.value === 'nickname' ? '请输入昵称' : '请填写球风，如进攻型、防守型等'
})

const maxLen = computed(() => {
  // NOTE: 标题、昵称、球风统一 20 字限制
  return 20
})

onMounted(() => {
  // NOTE: 接收上一页传来的参数：type（字段类型）和 value（当前值）
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage?.options ?? {}
  fieldType.value = (['signature', 'title'].includes(options.type) ? options.type : 'nickname') as any
  inputValue.value = decodeURIComponent(options.value ?? '')

  // NOTE: 动态设置原生导航栏标题
  uni.setNavigationBarTitle({ title: pageTitle.value })
})

function onInput(e: any) {
  inputValue.value = e?.detail?.value ?? ''
}

function onCancel() {
  uni.navigateBack()
}

function onDone() {
  if (!inputValue.value.trim()) return

  if (fieldType.value === 'title') {
    // NOTE: 活动标题通过 Storage 回传给发起活动页，与费用/备注模式一致
    uni.setStorageSync('editing_activity_title', inputValue.value.trim())
  } else {
    // NOTE: 昵称/球风通过 eventBus 通知个人设置页
    uni.$emit('profileFieldSaved', {
      type: fieldType.value,
      value: inputValue.value.trim()
    })
  }
  uni.navigateBack()
}
</script>

<style lang="scss" scoped>
.edit-field-page {
  min-height: 100vh;
  background: #FDF8F5;
  display: flex;
  flex-direction: column;
}

// NOTE: 取消/完成按钮行，紧贴原生导航栏下方，两端对齐
.edit-field-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $ios-spacing-sm $ios-spacing-lg;
  background: #ffffff;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.edit-field-action-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 4px;

  &--done {
    background: $brand-primary;
    border-radius: 8px;
    padding: 6px 16px;

    &.edit-field-action-btn--disabled {
      background: $ios-text-tertiary;
    }
  }
}

.edit-field-action-text {
  font-size: 16px;

  &--cancel {
    color: $ios-text-primary;
  }

  &--done {
    color: #ffffff;
    font-weight: $ios-font-weight-medium;
  }
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
  font-size: 12px;
  color: $ios-text-tertiary;
  display: block;
  text-align: right;
  margin-top: $ios-spacing-xs;
}
</style>
