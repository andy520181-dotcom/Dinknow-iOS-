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

      <!-- AA 均摊 -->
      <view
        class="type-row"
        :class="{ 'type-row--active': feeType === 'aa' }"
        @tap="selectType('aa')"
      >
        <!-- NOTE: 勾选圆在最左侧，初始空心灰圆，选中后蓝色实心+对勾 -->
        <view class="check-circle" :class="{ 'check-circle--on': feeType === 'aa' }" />
        <text class="type-label">AA</text>
        <!-- NOTE: 说明文案 margin-left:auto 推到最右 -->
        <text class="type-hint">参与者平摊场地费</text>
      </view>

      <!-- 12px 间距 -->
      <view class="row-gap" />

      <!-- 金额 -->
      <view
        class="type-row"
        :class="{ 'type-row--active': feeType === 'custom' }"
        @tap="selectType('custom')"
      >
        <view class="check-circle" :class="{ 'check-circle--on': feeType === 'custom' }" />
        <text class="type-label">金额</text>
        <!-- NOTE: 始终显示 X元/人，数字支持编辑（仅选中后输入框可聚焦） -->
        <view class="amount-inline" @tap.stop>
          <input
            class="amount-input"
            type="digit"
            placeholder="0"
            placeholder-class="amount-placeholder"
            :value="feeAmount"
            :disabled="feeType !== 'custom'"
            @input="onAmountInput"
            :focus="feeType === 'custom'"
          />
          <text class="amount-unit">元/人</text>
        </view>
      </view>

    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// NOTE: 初始空字符串，两个选项都不预选
const feeType = ref<'aa' | 'custom' | ''>('')
const feeAmount = ref('')

const isValid = computed(() => {
  if (feeType.value === 'aa') return true
  if (feeType.value === 'custom') return feeAmount.value.trim().length > 0 && Number(feeAmount.value) >= 0
  return false
})

function selectType(type: 'aa' | 'custom') {
  feeType.value = type
  if (type === 'aa') feeAmount.value = ''
}

function onAmountInput(e: any) {
  feeAmount.value = e?.detail?.value ?? ''
}

function onDone() {
  uni.setStorageSync('editing_activity_fee_type', feeType.value)
  uni.setStorageSync('editing_activity_fee_amount', feeType.value === 'aa' ? '' : feeAmount.value)
  uni.navigateBack()
}

function onCancel() {
  uni.navigateBack()
}

onMounted(() => {
  // NOTE: 只有明确存储了 'aa' 或 'custom' 时才回填，空字符串保持不选中
  const cachedType = uni.getStorageSync('editing_activity_fee_type')
  if (cachedType === 'aa' || cachedType === 'custom') feeType.value = cachedType

  const cachedAmount = uni.getStorageSync('editing_activity_fee_amount')
  if (typeof cachedAmount === 'string') feeAmount.value = cachedAmount
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
    background: $ios-blue;
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

// NOTE: 两行之间 12px 规范间距
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
  border-radius: 14px;
  // NOTE: 未选中时白色卡片背景，在灰色页面背景上突出显示
  background: #ffffff;
  gap: 10px;

  &:active { opacity: 0.75; }

  // NOTE: 选中时浅蓝背景
  &--active {
    background: rgba(10, 132, 255, 0.08);
  }
}

// ── 勾选圆圈（左侧）──────────────────────────────────────
// NOTE: 空心灰圆（未选），选中后蓝色实心 + 对勾垂直居中
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
    border-color: $ios-blue;
    background: $ios-blue;

    // NOTE: top/left 50% + translate 精准居中，Y 轴 -60% 补偿对勾视觉重心
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

// NOTE: 主标签）16px medium—与主表单各栏标签保持一致
.type-label {
  font-size: 16px;
  font-weight: $ios-font-weight-medium;
  color: $ios-text-primary;
  flex-shrink: 0;
}

// NOTE: 说明文案，14px regular tertiary—辅助信息不与标签争耗读者注意力
.type-hint {
  font-size: 16px;
  font-weight: 400;
  color: $ios-text-tertiary;
  margin-left: auto;
}

// ── 金额行内输入 ──────────────────────────────────────────
.amount-inline {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

// NOTE: 蓝色大号数字，突出视觉权重
.amount-input {
  font-size: 22px;
  font-weight: 700;
  color: $ios-blue;
  min-width: 48px;
  max-width: 120px;
  text-align: right;
}

// NOTE: placeholder，20px regular tertiary—属于辅助文字，不加粗
.amount-placeholder {
  font-size: 20px;
  font-weight: 400;
  color: $ios-text-tertiary;
}

// NOTE: 单位文字，14px regular secondary
.amount-unit {
  font-size: 16px;
  font-weight: 400;
  color: $ios-text-secondary;
  flex-shrink: 0;
}
</style>
