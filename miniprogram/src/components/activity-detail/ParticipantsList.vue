<template>
  <!-- NOTE: 匹克球搭子头像列表 -->
  <view class="participants-section">
    <text class="section-title">匹克球搭子</text>
    <view class="participants-list">
      <!-- 已报名用户头像 -->
      <view
        v-for="(item, idx) in participants"
        :key="item.userId || idx"
        class="participant-item"
        :class="{ 'participant-item--leaving': item.leaving }"
        @tap="$emit('open-profile', item.userId)"
      >
        <view class="participant-avatar-container">
          <!-- NOTE: key 绑定 userId 而非 avatarUrl，避免 URL 变化时节点销毁重建导致闪烁 -->
          <!-- NOTE: 与发起人头像同策略：灰色容器占位，@load 后淡入，防止头像突然弹出 -->
          <view class="participant-avatar-wrap-large">
            <image
              :src="item.resolvedAvatarUrl || ''"
              class="participant-avatar-inner"
              :class="{ 'participant-avatar-inner--loaded': loadedAvatars.has(item.userId) }"
              mode="aspectFill"
              @load="$emit('avatar-loaded', item.userId)"
            />
          </view>
        </view>
        <text class="participant-name-large">{{ item.nickName || '匹克球友' }}</text>
      </view>

      <!-- NOTE: "+" 占位圆：未满额且未结束时显示，不限人数 -->
      <view v-if="showAddSlot" class="participant-item">
        <view class="participant-add-slot-large">
          <text class="participant-add-text-large">+</text>
        </view>
        <text class="participant-name-large"></text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * 搭子列表子组件
 * 展示活动参与者头像网格 + "空位" 占位
 */

interface ParticipantDisplay {
  userId: string
  nickName?: string
  avatarUrl?: string
  resolvedAvatarUrl?: string
  isHost?: boolean
  leaving?: boolean
}

interface Props {
  /** 要展示的参与者列表（已含 resolvedAvatarUrl） */
  participants: ParticipantDisplay[]
  /** 是否显示 + 占位圆 */
  showAddSlot: boolean
  /** 已加载完成的头像 userId 集合 */
  loadedAvatars: Set<string>
}

defineProps<Props>()

defineEmits<{
  (e: 'open-profile', userId: string): void
  (e: 'avatar-loaded', userId: string): void
}>()
</script>

<style lang="scss" scoped>
.participants-section {
  background: $ios-bg-primary;
  border-radius: $ios-radius-lg;
  padding: $ios-spacing-lg;
  margin-bottom: $ios-spacing-md;
  overflow: hidden;
}

.section-title {
  font-size: 16px;
  color: $ios-text-primary;
  margin-bottom: 16px;
  display: block;
}

// NOTE: 固定 5 列网格，用 rpx 保证不同屏幕等比缩放
.participants-list {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  justify-items: center;
  gap: 24rpx;
}

.participant-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 80px;
  cursor: pointer;
  animation: avatarFadeIn 0.8s ease;

  &:active {
    opacity: 0.7;
  }

  &--leaving {
    animation: avatarFadeOut 0.8s ease forwards;
    pointer-events: none;
  }
}

@keyframes avatarFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes avatarFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

.participant-avatar-container {
  position: relative;
  margin-bottom: 8px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
}

.participant-avatar-wrap-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #E5E5EA;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.participant-avatar-inner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: block;
  opacity: 0;
  transition: opacity 0.25s ease;

  &--loaded {
    opacity: 1;
  }
}

.participant-avatar-placeholder-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: $ios-bg-tertiary;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-placeholder-icon {
  font-size: 24px;
  opacity: 0.4;
}

.participant-add-slot-large {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px dashed rgba(0, 0, 0, 0.22);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.participant-add-text-large {
  position: relative;
  z-index: 1;
  font-size: 24px;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.35);
  line-height: 1;
}

.participant-overflow-slot-large {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: $ios-bg-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.participant-overflow-text-large {
  font-size: 12px;
  font-weight: 600;
  color: $ios-text-secondary;
  line-height: 1;
}

.host-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 22px;
  background: rgba(100, 100, 108, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ffffff;
  white-space: nowrap;
}

.participant-name-large {
  font-size: 12px;
  color: $ios-text-primary;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.participant-item--overflow {
  cursor: default;
  pointer-events: none;
}
.participant-avatar-container--overflow {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid $ios-separator;
  background: $ios-bg-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
}
.participant-overflow-text {
  font-size: 12px;
  font-weight: 600;
  color: $ios-text-secondary;
}
.participant-name-large--overflow {
  color: $ios-text-tertiary;
}
</style>
