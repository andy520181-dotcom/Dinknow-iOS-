<template>
  <!-- NOTE: 海报预览弹窗，点击遮罩关闭 -->
  <view v-if="visible" class="poster-overlay" @tap="handleClose">
    <view class="poster-modal" @tap.stop>
      <!-- 标题栏 -->
      <view class="poster-modal-header">
        <text class="poster-modal-title">分享海报</text>
        <view class="poster-modal-close" @tap="handleClose">
          <text class="poster-close-icon">×</text>
        </view>
      </view>

      <!-- 海报预览 / 生成中 -->
      <view class="poster-preview-wrap">
        <view v-if="generating" class="poster-generating">
          <text class="poster-generating-text">海报生成中...</text>
        </view>
        <image
          v-else-if="posterUrl"
          class="poster-preview-image"
          :src="posterUrl"
          mode="widthFix"
          show-menu-by-longpress
        />
        <view v-else class="poster-error">
          <text class="poster-error-text">{{ errorMsg || '生成失败，请重试' }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="poster-actions">
        <button
          class="poster-btn poster-btn--save"
          :disabled="!posterUrl || saving"
          @tap="handleSave"
        >
          <text>{{ saving ? '保存中...' : '保存到相册' }}</text>
        </button>
        <button
          class="poster-btn poster-btn--share"
          open-type="share"
        >
          <text>转发给朋友</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Activity } from '../types'
import { generatePoster } from '../composables/usePoster'

const props = defineProps<{
  visible: boolean
  activity: Activity | null
  dateText: string
  feeText: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const posterUrl = ref('')
const generating = ref(false)
const saving = ref(false)
const errorMsg = ref('')

// NOTE: 每次弹窗打开时重新生成海报
watch(() => props.visible, async (val) => {
  if (!val || !props.activity) return
  posterUrl.value = ''
  errorMsg.value = ''
  generating.value = true
  try {
    posterUrl.value = await generatePoster(props.activity, props.dateText, props.feeText)
  } catch (err: any) {
    errorMsg.value = err?.message || '生成失败'
  } finally {
    generating.value = false
  }
})

function handleClose() {
  emit('close')
}

/** 保存海报到系统相册 */
function handleSave() {
  if (!posterUrl.value) return
  saving.value = true
  wx.saveImageToPhotosAlbum({
    filePath: posterUrl.value,
    success: () => {
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    },
    fail: (err) => {
      // NOTE: 用户未授权相册权限时引导开启
      if (String(err?.errMsg).includes('auth deny') || String(err?.errMsg).includes('authorize')) {
        wx.showModal({
          title: '需要相册权限',
          content: '请在设置中允许访问相册',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm) wx.openSetting({})
          },
        })
      } else {
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    },
    complete: () => {
      saving.value = false
    },
  })
}
</script>

<style lang="scss">
.poster-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 9999;
}

.poster-modal {
  width: 100%;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 0 0 env(safe-area-inset-bottom);
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.poster-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.poster-modal-title {
  font-size: 16px;
  font-weight: 600;
  color: #111;
}

.poster-modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.poster-close-icon {
  font-size: 22px;
  color: #999;
  line-height: 1;
}

.poster-preview-wrap {
  flex: 1;
  overflow: hidden;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}

.poster-preview-image {
  width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.poster-generating,
.poster-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.poster-generating-text,
.poster-error-text {
  font-size: 14px;
  color: #999;
}

.poster-actions {
  display: flex;
  gap: 12px;
  padding: 12px 20px 16px;
}

.poster-btn {
  flex: 1;
  height: 48px;
  border-radius: 24px;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  padding: 0;

  &--save {
    background: #007AFF;
    color: #fff;
  }

  &--share {
    background: #f0f0f0;
    color: #333;
  }

  &[disabled] {
    opacity: 0.5;
  }
}
</style>
