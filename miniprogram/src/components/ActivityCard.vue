<template>
  <view class="activity-card" :class="{ 'activity-card--ended': isEnded }">

    <!-- ── 第一行：发起人头像 + 活动信息 ── -->
    <view class="card-header">
      <!-- 发起人头像 + 昵称（纵向排列） -->
      <view class="host-avatar-col">
        <view class="host-avatar-wrap">
          <image
            v-if="hostAvatarUrl"
            :src="hostAvatarUrl"
            class="host-avatar-img"
            mode="aspectFill"
          />
          <view v-else class="host-avatar-placeholder">
            <text class="host-avatar-icon">👤</text>
          </view>
        </view>
        <text class="host-nickname">{{ activity.hostName || '微信用户' }}</text>
      </view>

      <!-- 活动信息块（右） -->
      <view class="card-info-block">
        <!-- 标题（标题文字 + 右侧发布时间） -->
        <view class="card-title-row">
          <text class="card-title">{{ activity.title }}</text>
          <!-- NOTE: 发布时间置于标题右侧，低视觉权重 -->
          <text v-if="publishedAgo" class="card-published-badge">{{ publishedAgo }}</text>
        </view>

        <!-- 时间 + 地点行 -->
        <view class="info-row info-row--nowrap">
          <view class="info-chunk">
            <image class="info-icon-img" src="/static/icons/shijian-2.png" mode="aspectFit" />
            <text class="info-text">{{ dateTimeFull }}</text>
          </view>
          <text class="info-sep">·</text>
          <view class="info-chunk info-chunk--venue">
            <image class="info-icon-img" src="/static/icons/zhiyuandidian4.png" mode="aspectFit" />
            <text class="info-text info-text--ellipsis">{{ activity.venueName || activity.address || '—' }}</text>
          </view>
        </view>

        <!-- DUPR + 人数 + 费用行 -->
        <view class="info-row">
          <view class="info-chunk">
            <image class="info-icon-img" src="/static/icons/pikeqiu-2.png" mode="aspectFit" />
            <text class="info-text">{{ duprLevel || '—' }}</text>
          </view>
          <text class="info-sep">·</text>
          <view class="info-chunk">
            <image class="info-icon-img" src="/static/icons/renshu-2.png" mode="aspectFit" />
            <text class="info-text">{{ activity.maxParticipants }}人</text>
          </view>
          <text class="info-sep">·</text>
          <view class="info-chunk">
            <image class="info-icon-img" src="/static/icons/feiyongdanju.png" mode="aspectFit" />
            <text class="info-text">{{ feeText }}</text>
          </view>
          <!-- NOTE: 距离标签置于信息块右下角（分割线上方），与报名决策场景更贴近 -->
          <text v-if="props.distanceKm != null" class="card-distance-badge">📍 {{ props.distanceKm }}km</text>
        </view>
      </view>

      <!-- NOTE: 右上角：发起人显示三点菜单（编辑/删除/分享），非发起人显示分享按钮 -->
      <view class="card-top-right">
        <slot name="topRight">
          <!-- 发起人：三点菜单 -->
          <view v-if="props.isOwner" class="share-btn" @tap.stop="showOwnerMenu">
            <text class="share-btn-dots">⋯</text>
          </view>
          <!-- 参加者：退出菜单 -->
          <view v-else-if="props.showLeave" class="share-btn" @tap.stop="showJoinedMenu">
            <text class="share-btn-dots">⋯</text>
          </view>
          <!-- 其他：直接分享 -->
          <button
            v-else
            class="share-btn"
            :class="{ 'share-btn--disabled': isEnded || isFull }"
            :disabled="isEnded || isFull"
            open-type="share"
            @tap="onShareTap"
          >
            <text class="share-btn-dots">⋯</text>
          </button>
        </slot>
      </view>
    </view>

    <!-- 分割线 -->
    <view class="card-divider" />

    <!-- ── 报名人员头像网格 + 报名按钮 ── -->
    <view class="card-footer">
      <!-- 报名人员头像网格：5列，最多3行（15个），超出+N -->
      <view class="participants-grid">
        <view
          v-for="(p, idx) in displayedParticipants"
          :key="p.userId || idx"
          class="participant-item"
        >
          <view class="participant-avatar-wrap">
            <image
              v-if="p.avatarUrl && String(p.avatarUrl).trim()"
              :src="String(p.avatarUrl)"
              class="participant-avatar-img"
              mode="aspectFill"
            />
            <view v-else class="participant-avatar-placeholder">
              <text class="participant-avatar-icon">👤</text>
            </view>
          </view>
          <text class="participant-nickname">{{ p.nickName || '球友' }}</text>
        </view>

        <!-- "+" 占位圆：Dinknow 品牌文字叠底，+ 号叠加前景 -->
        <view v-if="showAddSlot && !overflowCount" class="participant-item">
          <view class="participant-add-slot">
            <text class="participant-add-text">+</text>
          </view>
          <text class="participant-nickname"></text>
        </view>

        <!-- 超出15个时显示 +N -->
        <view v-if="overflowCount > 0" class="participant-item">
          <view class="participant-overflow-slot">
            <text class="participant-overflow-text">+{{ overflowCount }}</text>
          </view>
          <text class="participant-nickname"></text>
        </view>
      </view>

      <!-- 报名按钮：右对齐；发起人自己不显示 -->
      <slot name="footer">
        <button
          v-if="!props.isOwner"
          class="join-btn"
          :class="{ 'join-btn--disabled': isEnded || isFull }"
          :disabled="isEnded || isFull"
          @tap="handleJoinClick"
        >
          <text class="join-text-in-btn">{{ joinButtonText }}</text>
        </button>
      </slot>
    </view>

  </view>
</template>

<script setup lang="ts">
import type { Activity } from '../types'
import { isActivityEnded, isActivityInProgress, parseActivityDate } from '../utils/activity'
import { computed, ref, watch, onMounted } from 'vue'
import { checkLogin } from '../services/user'
import { getCloudImageUrl, getTempFileURLs } from '../services/cloud'

const props = withDefaults(
  defineProps<{
    activity: Activity
    variant?: 'square' | 'my-joined' | 'my-created'
    distanceKm?: number | null
    /** 是否为当前用户发起的活动 */
    isOwner?: boolean
    /** 是否为当前用户参加的活动（显示退出菜单） */
    showLeave?: boolean
  }>(),
  { variant: 'square', distanceKm: null, isOwner: false, showLeave: false }
)

const emit = defineEmits<{
  join: []
  detail: []
  shareClick: [activity: Activity]
  edit: [activity: Activity]
  delete: [activity: Activity]
  leave: [activity: Activity]
}>()

/** 参加者三点菜单 */
function showJoinedMenu() {
  // NOTE: 进行中：活动正在发生，参与记录对发起人可见，不允许任何操作
  if (isActivityInProgress(props.activity)) {
    uni.showToast({ title: '活动正在进行中，无法操作', icon: 'none' })
    return
  }
  // NOTE: 已结束：不能撤回报名，但允许用户删除该历史记录
  if (isEnded.value) {
    uni.showActionSheet({
      itemList: ['删除记录'],
      success: (res) => {
        if (res.tapIndex === 0) emit('leave', props.activity)
      }
    })
    return
  }
  // NOTE: 未开始：正常退出报名流程
  uni.showActionSheet({
    itemList: ['退出活动'],
    success: (res) => {
      if (res.tapIndex === 0) emit('leave', props.activity)
    }
  })
}

/** 发起人三点菜单：编辑 / 删除 / 分享 */
function showOwnerMenu() {
  const ended = isEnded.value
  const items = ended
    ? ['删除活动']
    : ['编辑活动', '删除活动']

  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      if (ended) {
        if (res.tapIndex === 0) emit('delete', props.activity)
      } else {
        if (res.tapIndex === 0) emit('edit', props.activity)
        else if (res.tapIndex === 1) emit('delete', props.activity)
      }
    }
  })
}

// ── 调试日志 ──────────────────────────────────────────
onMounted(() => {
  if (props.activity?._id) {
    try {
      console.log(`[ActivityCard] 组件挂载，活动 ${props.activity._id}:`, {
        hostId: props.activity.hostId,
        hostAvatar: props.activity.hostAvatar ? '有' : '无',
        participantsCount: props.activity.participants?.length || 0,
        currentCount: props.activity.currentCount
      })
    } catch (e) {
      console.error('[ActivityCard] 调试日志错误:', e)
    }
  }
})

// ── 时间/日期计算 ─────────────────────────────────────
const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function addOneHour(timeStr: string): string {
  const part = (timeStr || '00:00').trim().slice(0, 5)
  const [h, m] = part.split(':').map(Number)
  const mins = (h * 60 + (m || 0) + 60) % (24 * 60)
  const nh = Math.floor(mins / 60)
  const nm = mins % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

const dateTimeFull = computed(() => {
  const parsed = parseActivityDate(props.activity)
  const startTime = props.activity.startTime || '00:00'
  const endTime = props.activity.endTime
  const startPart = startTime.length <= 5 ? startTime : startTime.slice(0, 5)
  const endPart =
    endTime && String(endTime).trim() && String(endTime).trim() !== startPart
      ? String(endTime).trim().length <= 5
        ? String(endTime).trim()
        : String(endTime).trim().slice(0, 5)
      : addOneHour(startPart)
  const timeRange = `${startPart}-${endPart}`
  if (!parsed) return timeRange
  const actDate = new Date(parsed.y, parsed.m - 1, parsed.day)
  const weekday = weekdays[actDate.getDay()] ?? ''
  return `${parsed.m}月${parsed.day}日 ${weekday} ${timeRange}`
})

// ── 费用文字 ─────────────────────────────────────────
const feeText = computed(() => {
  const fee = props.activity.fee
  if (fee === undefined || fee === null) return '—'
  return fee === 0 ? '免费' : `${fee}元/人`
})

// ── DUPR 等级 ────────────────────────────────────────
const duprLevel = computed(() => {
  const level = (props.activity as any).duprLevel
  return level || null
})

// ── 活动状态 ─────────────────────────────────────────
const isEnded = computed(() => isActivityEnded(props.activity))

// NOTE: 将 createdAt 时间戳转为相对时间描述，如"3小时前"/"昨天"
const publishedAgo = computed(() => {
  const ts = (props.activity as any).createdAt
  if (!ts) return ''
  const diff = Date.now() - Number(ts)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1)  return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24)   return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days === 1)   return '昨天'
  if (days < 30)    return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12)  return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
})

// NOTE: 根据活动类型计算可报名名额（不含发起人）
const availableSlots = computed(() => {
  const actType = props.activity.activityType || '不限'
  if (actType === '单打') return 1
  if (actType === '双打' || actType === '混双') return 3
  return props.activity.maxParticipants - 1
})

const registeredCount = computed(() => props.activity.currentCount ?? 0)

const isFull = computed(() => registeredCount.value >= availableSlots.value)

const joinButtonText = computed(() => {
  if (isEnded.value) return '已结束'
  if (isFull.value) return '报名已满'
  return '立即报名'
})

// ── 头像 URL 管理 ─────────────────────────────────────
/** cloud:// → 临时 URL 缓存映射，避免刷新时闪烁 */
const avatarUrlMap = ref<Record<string, string>>({})

async function loadAvatarUrls() {
  const isCloudId = (id: string) => typeof id === 'string' && id.startsWith('cloud://')
  const fileIDs: string[] = []
  const map = avatarUrlMap.value

  if (props.activity?.hostAvatar && isCloudId(props.activity.hostAvatar) && !map[props.activity.hostAvatar]) {
    fileIDs.push(props.activity.hostAvatar)
  }
  if (props.activity?.participants) {
    props.activity.participants.forEach((p: { avatarUrl?: string }) => {
      if (p?.avatarUrl && isCloudId(p.avatarUrl) && !map[p.avatarUrl]) {
        fileIDs.push(p.avatarUrl)
      }
    })
  }

  if (fileIDs.length === 0) return
  try {
    const urlMap = await getTempFileURLs(fileIDs)
    const next = { ...avatarUrlMap.value }
    Object.entries(urlMap).forEach(([fid, url]) => {
      if (!next[fid] || !String(next[fid]).startsWith('http')) next[fid] = url
    })
    avatarUrlMap.value = next
  } catch (e) {
    console.error('[ActivityCard] 加载头像临时 URL 失败:', e)
  }
}

function getDisplayAvatarUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return avatarUrlMap.value[url] || getCloudImageUrl(url) || url
}

watch(
  () => props.activity,
  async (newActivity) => {
    if (newActivity?._id) await loadAvatarUrls()
  },
  { immediate: true }
)

// ── 发起人头像 URL ────────────────────────────────────
const hostAvatarUrl = computed(() => getDisplayAvatarUrl(props.activity?.hostAvatar))

// ── 报名用户头像列表（不含发起人） ───────────────────────
// NOTE: 5列×3行最多展示15个，超出显示+N占位
const MAX_PARTICIPANT_DISPLAY = 15

const participantList = computed(() => {
  const list = (props.activity?.participants || []).map((p: { userId?: string; avatarUrl?: string; nickName?: string }) => ({
    userId: p?.userId || '',
    avatarUrl: p?.avatarUrl ? getDisplayAvatarUrl(p.avatarUrl) : '',
    nickName: p?.nickName || ''
  }))
  return list
})

const displayedParticipants = computed(() => participantList.value.slice(0, MAX_PARTICIPANT_DISPLAY))

/** 超出最大显示数量的剩余数，展示 +N */
const overflowCount = computed(() => {
  const total = participantList.value.length
  return total > MAX_PARTICIPANT_DISPLAY ? total - MAX_PARTICIPANT_DISPLAY : 0
})

// NOTE: 未满额且未超出15个时显示"+"占位
const showAddSlot = computed(() => !isFull.value && !isEnded.value)

// ── 操作 ──────────────────────────────────────────────
function onShareTap() {
  emit('shareClick', props.activity)
}

async function handleJoinClick() {
  if (!props.activity._id || isEnded.value) return
  const { ok } = await checkLogin()
  if (!ok) {
    uni.showToast({ title: '请先登录后再报名参加活动', icon: 'none', duration: 2500 })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/profile/index' })
    }, 500)
    return
  }
  const activities = uni.getStorageSync('activity_detail_cache') || []
  const existingIndex = activities.findIndex((a: any) => a._id === props.activity._id)
  if (existingIndex >= 0) {
    activities[existingIndex] = props.activity
  } else {
    activities.push(props.activity)
  }
  uni.setStorageSync('activity_detail_cache', activities)
  uni.navigateTo({
    url: `/pages/activity-detail/index?id=${props.activity._id}`
  })
}
</script>

<style lang="scss" scoped>
// ── 卡片容器 ──────────────────────────────────────────
.activity-card {
  position: relative;
  display: block;
  background: $ios-bg-primary;
  border-radius: $ios-radius-lg;
  padding: $ios-spacing-lg;
  margin-bottom: $ios-spacing-md;
  box-shadow: $ios-shadow-md;
  transition: all 0.2s ease;

  &:active {
    transform: scale(0.99);
    box-shadow: $ios-shadow-sm;
  }

  // NOTE: 已结束活动背景保持白色，不做特殊处理
  &--ended {}
}

// ── 第一行：发起人头像 + 信息块 ──────────────────────────
.card-header {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}

// 发起人头像 + 昵称纵向容器
.host-avatar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

// 发起人头像
.host-avatar-wrap {
  position: relative;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 50%;
  // NOTE: hidden 使底部「发起人」条随头像圆形裁切，与详情页保持一致
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

// 发起人昵称
.host-nickname {
  font-size: 10px;
  color: $ios-text-secondary;
  text-align: center;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

// NOTE: 发布时间，昵称下方，极小灰字，低视觉权重
.host-published-at {
  font-size: 9px;
  color: $ios-text-tertiary;
  text-align: center;
  max-width: 56px;
  line-height: 1.2;
  white-space: nowrap;
}

.host-avatar-img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: block;
}

.host-avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: $ios-bg-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.host-avatar-icon {
  font-size: 28px;
}

// Host 徽标 — 低调展示，不突出
.host-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 16px;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
}

.host-badge-text {
  font-size: 9px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1;
  white-space: nowrap;
}

// 活动信息块（标题 + 两行信息）
.card-info-block {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  // NOTE: 为右上角分享按钮留出空间
  padding-right: 28px;
}

// 标题行：@ 图标 + 标题文字
.card-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
  overflow: hidden;
}

// NOTE: 距离标签（位于 DUPR·人数·费用行右端，分割线上方）
.card-distance-badge {
  margin-left: auto;
  padding-left: 8px;
  font-size: 12px;
  color: $ios-text-tertiary;
  white-space: nowrap;
  flex-shrink: 0;
}

// NOTE: 标题行右侧发布时间，极小灰字，低视觉权重
.card-published-badge {
  margin-left: auto;
  padding-left: 8px;
  font-size: 11px;
  color: $ios-text-tertiary;
  flex-shrink: 0;
  white-space: nowrap;
}

.card-title-at {
  font-size: 15px;
  font-weight: $ios-font-weight-semibold;
  color: $ios-blue;
  line-height: 1.4;
  flex-shrink: 0;
  margin-right: 2px;
}

.card-title {
  font-size: 16px;
  font-weight: $ios-font-weight-semibold;
  color: #1a1a1a;
  line-height: 1.4;
  letter-spacing: -0.2px;
  // NOTE: 标题超长时尾部省略号显示，与地址栏保持一致
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0 4px;

  // NOTE: 时间+地址行强制单行，超长省略
  &--nowrap {
    flex-wrap: nowrap;
    overflow: hidden;
  }
}

.info-chunk {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  flex-shrink: 0;

  // NOTE: 地址 chunk 允许收缩，占满剩余空间
  &--venue {
    flex: 1;
    min-width: 0;
    flex-shrink: 1;
    overflow: hidden;
  }
}

.info-icon-img {
  width: 12px;
  height: 12px;
  margin-right: 3px;
  flex-shrink: 0;
}

.info-sep {
  font-size: 11px;
  color: $ios-text-tertiary;
  flex-shrink: 0;
  margin: 0 1px;
}

.info-text {
  font-size: 12px;
  color: $ios-text-secondary;
  line-height: 1.4;
  min-width: 0;

  &--ellipsis {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// 分享按钮（绝对定位右上角）
.card-top-right {
  position: absolute;
  top: $ios-spacing-md;
  right: $ios-spacing-md;
  z-index: 1;
}

.share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  width: 24px;
  height: 24px;
  min-height: 24px;
  background: transparent;
  border-radius: 50%;
  border: none;
  &::after { border: none; }
  &:active { opacity: 0.6; }

  &--disabled {
    opacity: 0.35;
    pointer-events: none;
  }
}

.share-btn-dots {
  font-size: 24px;
  color: #333333;
  line-height: 1;
}

// ── 分割线 ────────────────────────────────────────────
.card-divider {
  height: 0.5px;
  margin: 10px 0 8px;
  background: rgba(0, 0, 0, 0.06);
}

// ── 报名区域：头像网格(左) + 报名按钮区域(右) ──────────────────────────
// NOTE: 横向布局，头像网格 flex:1 不遇挡头像，按钮固定右侧不增加卡片高度
.card-footer {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 8px;
}

// NOTE: footer 右侧容器：距离标签 + 报名按钮纵向排列，中间间距
.footer-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

// 报名人员头像网格：5列自动换行，最多3行（15个）
.participants-grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
  // NOTE: flex:1 占满左侧剩余空间，按钮在右侧不遮挡头像
  flex: 1;
  min-width: 0;
}

// +N 溢出占位圆
.participant-overflow-slot {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  background: $ios-bg-tertiary;
  display: flex;
  align-items: center;
  justify-content: center;
}

.participant-overflow-text {
  font-size: 13px;
  font-weight: 600;
  color: $ios-text-secondary;
  line-height: 1;
}

// 单个报名用户：头像 + 昵称纵向容器
.participant-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

// 报名用户昵称
.participant-nickname {
  font-size: 10px;
  color: $ios-text-secondary;
  text-align: center;
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.2;
}

// 单个报名用户头像
// NOTE: 与发起人头像保持一致：56px / overflow:hidden / 纯 box-shadow 无 border
.participant-avatar-wrap {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.participant-avatar-img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: block;
}

.participant-avatar-placeholder {
  width: 100%;
  height: 100%;
  background: $ios-bg-tertiary;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.participant-avatar-icon {
  font-size: 18px;
}

// NOTE: 空心虚线圆：语义最清晰的「空位可加入」占位符
.participant-add-slot {
  position: relative;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1.5px dashed rgba(0, 0, 0, 0.22);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

// + 号叠在logo上方
.participant-add-text {
  position: relative;
  z-index: 1;
  font-size: 22px;
  font-weight: 300;
  color: rgba(0, 0, 0, 0.35);
  line-height: 1;
}

// ── 立即报名按钮 ──────────────────────────────────────
.join-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: auto;
  padding: 0 14px;
  height: 30px;
  min-height: 30px;
  background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%);
  color: #fff;
  font-size: 13px;
  font-weight: $ios-font-weight-semibold;
  border-radius: 15px;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.28);
  line-height: 1;

  &::after {
    border: none;
  }

  &:active {
    opacity: 0.85;
    transform: scale(0.97);
  }

  &.join-btn--disabled {
    background: $ios-bg-tertiary;
    color: $ios-text-tertiary;
    box-shadow: none;
    opacity: 1;

    .join-text-in-btn {
      color: $ios-text-tertiary;
    }
  }
}

.join-text-in-btn {
  font-size: 13px;
  font-weight: $ios-font-weight-semibold;
  color: #fff;
}
</style>
