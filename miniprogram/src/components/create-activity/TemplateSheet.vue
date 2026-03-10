<template>
  <!-- NOTE: 历史活动底部半屏抽屉 -->
  <view v-if="visible" class="template-mask" @tap="$emit('close')">
    <view class="template-sheet" @tap.stop>
      <!-- 把手条 -->
      <view class="template-sheet__handle" />

      <!-- 标题行 -->
      <view class="template-sheet__header">
        <text class="template-sheet__title">历史活动</text>
        <view class="template-sheet__close" @tap="$emit('close')">
          <text class="template-sheet__close-icon">✕</text>
        </view>
      </view>

      <!-- 内容区 -->
      <view class="template-sheet__body">
        <!-- 加载中 -->
        <view v-if="loading" class="template-empty">
          <text class="template-empty__text">加载中...</text>
        </view>

        <!-- 空态 -->
        <view v-else-if="activities.length === 0" class="template-empty">
          <text class="template-empty__text">暂无历史活动</text>
          <text class="template-empty__sub">发布第一个活动后，可在此快速复用</text>
        </view>

        <!-- 历史活动列表（最近 5 条） -->
        <view v-else>
          <view
            v-for="act in activities"
            :key="act._id"
            class="template-item"
            @tap="$emit('select', act)"
          >
            <view class="template-item__main">
              <text class="template-item__title">{{ act.title }}</text>
              <text class="template-item__meta">
                {{ (act as any).duprLevel || '' }}{{ (act as any).duprLevel && (act.address || (act as any).venueName) ? ' · ' : '' }}{{ (act as any).venueName || act.address || '' }}
              </text>
            </view>
            <text class="template-item__arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 历史活动模板底部抽屉
 * 展示用户最近发布的活动，点击后回填到发起表单
 */
import type { Activity } from '../../types'

interface Props {
  /** 抽屉显隐 */
  visible: boolean
  /** 加载状态 */
  loading: boolean
  /** 历史活动列表 */
  activities: Activity[]
}

defineProps<Props>()

defineEmits<{
  (e: 'close'): void
  (e: 'select', act: Activity): void
}>()
</script>

<style lang="scss" scoped>
// NOTE: 底部半屏抽屉遮罩层
.template-mask {
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

// NOTE: 抽屉本体
.template-sheet {
  background: $ios-bg-primary;
  border-radius: 20px 20px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  animation: sheetSlideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);

  &__handle {
    width: 36px; height: 4px;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.15);
    margin: 12px auto 4px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 20px 12px;
    border-bottom: 0.5px solid $ios-separator;
  }

  &__title {
    font-size: 16px;
    font-weight: $ios-font-weight-semibold;
    color: $ios-text-primary;
  }

  &__close {
    width: 28px; height: 28px;
    border-radius: 14px;
    background: $ios-bg-secondary;
    display: flex; align-items: center; justify-content: center;
    &:active { opacity: 0.6; }
  }

  &__close-icon {
    font-size: 12px;
    color: $ios-text-secondary;
    line-height: 1;
  }

  &__body {
    padding: 8px 0 12px;
    max-height: 50vh;
    overflow-y: auto;
  }
}
@keyframes sheetSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

// NOTE: 空态提示
.template-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 20px;

  &__icon { font-size: 32px; line-height: 1; }
  &__text { font-size: 16px; color: $ios-text-secondary; font-weight: $ios-font-weight-medium; }
  &__sub  { font-size: 12px; color: $ios-text-tertiary; text-align: center; }
}

// NOTE: 历史活动列表条目
.template-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.04);
  transition: background 0.12s ease;

  &:last-child { border-bottom: none; }
  &:active { background: $ios-bg-secondary; }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  &__title {
    font-size: 16px;
    font-weight: $ios-font-weight-semibold;
    color: $ios-text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 12px;
    color: $ios-text-secondary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__arrow {
    font-size: 20px;
    color: $ios-text-tertiary;
    margin-left: 10px;
    flex-shrink: 0;
  }
}
</style>
