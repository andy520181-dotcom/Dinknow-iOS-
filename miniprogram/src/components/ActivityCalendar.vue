<template>
  <view class="cal-wrap">
    <!-- ── 月份导航 ── -->
    <view class="cal-header">
      <view class="cal-nav-btn" @tap="prevMonth">
        <text class="cal-nav-icon">‹</text>
      </view>
      <text class="cal-month-label">{{ currentYearMonth }}</text>
      <view class="cal-nav-btn" @tap="nextMonth">
        <text class="cal-nav-icon">›</text>
      </view>
    </view>

    <!-- ── 星期标题行 ── -->
    <view class="cal-week-row">
      <text v-for="d in weekDays" :key="d" class="cal-week-cell">{{ d }}</text>
    </view>

    <!-- ── 日期网格 ── -->
    <view class="cal-grid">
      <!-- 头部空格补位 -->
      <view
        v-for="n in leadingBlanks"
        :key="'blank-' + n"
        class="cal-day-cell"
      />
      <!-- 实际日期 -->
      <view
        v-for="day in daysInMonth"
        :key="day"
        class="cal-day-cell"
        :class="{
          'cal-day-cell--selected': isSelected(day),
          'cal-day-cell--today': isToday(day)
        }"
        @tap="selectDay(day)"
      >
        <text class="cal-day-num">{{ day }}</text>
        <!-- 圆点行：最多显示两个点 -->
        <view class="cal-dots">
          <view
            v-if="hasJoined(day)"
            class="cal-dot cal-dot--joined"
          />
          <view
            v-if="hasCreated(day)"
            class="cal-dot cal-dot--created"
          />
        </view>
      </view>
    </view>

    <!-- ── 图例 ── -->
    <view class="cal-legend">
      <view class="cal-legend-item">
        <view class="cal-dot cal-dot--joined" />
        <text class="cal-legend-text">我参加的</text>
      </view>
      <view class="cal-legend-item">
        <view class="cal-dot cal-dot--created" />
        <text class="cal-legend-text">我发起的</text>
      </view>
    </view>

    <!-- ── 今日活动区 / 选中日期活动区 ── -->
    <view class="cal-day-panel">
      <view class="cal-day-panel__header">
        <text class="cal-day-panel__title">{{ dayPanelTitle }}</text>
      </view>

      <!-- 无活动时的提示 -->
      <view v-if="selectedDayActivities.length === 0" class="cal-empty">
        <text class="cal-empty-text">{{ emptyText }}</text>
      </view>

      <!-- 活动列表 -->
      <view
        v-for="item in selectedDayActivities"
        :key="item._id"
        class="cal-event-card"
        @tap="goToDetail(item)"
      >

        <view class="cal-event-card__body">
          <view class="cal-event-card__top">
            <text class="cal-event-card__title" :numberOfLines="1">{{ item.title }}</text>
            <text
              class="cal-event-card__badge"
              :class="item._role === 'created' ? 'cal-event-card__badge--created' : 'cal-event-card__badge--joined'"
            >{{ item._role === 'created' ? '发起' : '参加' }}</text>
          </view>
          <view class="cal-event-card__meta">
            <text class="cal-event-card__time">{{ item.startTime }}{{ item.endTime ? ' - ' + item.endTime : '' }}</text>
            <text class="cal-event-card__dot-sep"> · </text>
            <text class="cal-event-card__venue" :numberOfLines="1">{{ item.venueName || item.address }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Activity } from '../types'

interface ActivityWithRole extends Activity {
  _role: 'joined' | 'created'
}

const props = defineProps<{
  joinedActivities: Activity[]
  createdActivities: Activity[]
}>()

// NOTE: 星期从周日开始，与日历约定一致
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// ── 当前展示月份 ──
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1-12

// NOTE: 日历按自然年显示，覆盖 2026～2027 两个完整年份
const MIN_YEAR = 2026
const MIN_MONTH = 1   // 2026年1月
const MAX_YEAR = 2027
const MAX_MONTH = 12  // 2027年12月

function prevMonth() {
  if (currentYear.value === MIN_YEAR && currentMonth.value === MIN_MONTH) return
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value -= 1
  } else {
    currentMonth.value -= 1
  }
  selectedDay.value = null
}

function nextMonth() {
  if (currentYear.value === MAX_YEAR && currentMonth.value === MAX_MONTH) return
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value += 1
  } else {
    currentMonth.value += 1
  }
  selectedDay.value = null
}

// ── 日期计算 ──
const currentYearMonth = computed(() => `${currentYear.value}年${currentMonth.value}月`)

// 当月天数
const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 0).getDate()
})

// 当月1号是周几（0=周日）
const leadingBlanks = computed(() => {
  return new Date(currentYear.value, currentMonth.value - 1, 1).getDay()
})

// ── 活动按日期聚合 ──
// NOTE: 将 joined/created 活动合并为带 _role 的列表，相同日期可能同时出现两种
const allActivities = computed((): ActivityWithRole[] => {
  const joined: ActivityWithRole[] = props.joinedActivities.map(a => ({ ...a, _role: 'joined' }))
  const created: ActivityWithRole[] = props.createdActivities.map(a => ({ ...a, _role: 'created' }))
  return [...joined, ...created]
})

// NOTE: 按 YYYY-MM-DD 聚合活动，key 为日期字符串
const activityMap = computed(() => {
  const map = new Map<string, ActivityWithRole[]>()
  for (const act of allActivities.value) {
    if (!act.startDate) continue
    const key = act.startDate // 格式 "2026-03-08"
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(act)
  }
  return map
})

// 当月某天的 key
function dayKey(day: number): string {
  const m = String(currentMonth.value).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${currentYear.value}-${m}-${d}`
}

function hasJoined(day: number): boolean {
  return activityMap.value.get(dayKey(day))?.some(a => a._role === 'joined') ?? false
}

function hasCreated(day: number): boolean {
  return activityMap.value.get(dayKey(day))?.some(a => a._role === 'created') ?? false
}

function isToday(day: number): boolean {
  return (
    currentYear.value === today.getFullYear() &&
    currentMonth.value === today.getMonth() + 1 &&
    day === today.getDate()
  )
}

// ── 选中日期 ──
// NOTE: 默认展示今日（如是当月），否则展示第一天
const selectedDay = ref<number | null>(
  currentYear.value === today.getFullYear() && currentMonth.value === today.getMonth() + 1
    ? today.getDate()
    : null
)

function isSelected(day: number): boolean {
  return selectedDay.value === day
}

function selectDay(day: number) {
  selectedDay.value = selectedDay.value === day ? null : day
}

// ── 当日活动面板 ──
const dayPanelTitle = computed(() => {
  if (selectedDay.value === null) return '今日活动'
  if (isToday(selectedDay.value)) return '今日活动'
  const m = String(currentMonth.value).padStart(2, '0')
  const d = String(selectedDay.value).padStart(2, '0')
  return `${currentMonth.value}月${selectedDay.value}日`
})

const selectedDayActivities = computed((): ActivityWithRole[] => {
  const day = selectedDay.value
  if (day === null) {
    // 未选中时显示今日
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    return (activityMap.value.get(todayKey) || []).sort(sortByTime)
  }
  return (activityMap.value.get(dayKey(day)) || []).sort(sortByTime)
})

function sortByTime(a: ActivityWithRole, b: ActivityWithRole): number {
  return (a.startTime || '').localeCompare(b.startTime || '')
}

const emptyText = computed(() => {
  if (selectedDay.value === null || isToday(selectedDay.value)) {
    return '今天暂无活动'
  }
  return '当天暂无活动'
})

// ── 跳转活动详情 ──
function goToDetail(activity: ActivityWithRole) {
  if (!activity._id) return
  uni.navigateTo({ url: `/pages/activity-detail/index?id=${activity._id}` })
}
</script>

<style lang="scss" scoped>
.cal-wrap {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px 16px 0;
  margin: 12px 16px;
  // NOTE: 与 ios-section 阴影风格保持一致
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

// ── 月份导航 ──
.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.cal-nav-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cal-nav-icon {
  font-size: 22px;
  color: $brand-primary;
  line-height: 1;
}

.cal-month-label {
  font-size: 15px;
  font-weight: 600;
  color: $ios-text-primary;
}

// ── 星期标题 ──
.cal-week-row {
  display: flex;
  margin-bottom: 4px;
}

.cal-week-cell {
  flex: 1;
  text-align: center;
  font-size: 11px;
  color: #8e8e93;
  font-weight: 500;
}

// ── 日期网格 ──
.cal-grid {
  display: flex;
  flex-wrap: wrap;
}

.cal-day-cell {
  // NOTE: 7列每格宽度相同
  width: calc(100% / 7);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 0 6px;
  border-radius: 8px;
  position: relative;
  box-sizing: border-box;

  &--today {
    .cal-day-num {
      color: $brand-primary;
      font-weight: 700;
    }
  }

  &--selected {
    background: $brand-primary;

    .cal-day-num {
      color: #ffffff;
      font-weight: 700;
    }
  }
}

.cal-day-num {
  font-size: 14px;
  color: $ios-text-primary;
  line-height: 1.4;
}

// ── 活动圆点 ──
.cal-dots {
  display: flex;
  gap: 2px;
  height: 6px;
  align-items: center;
  margin-top: 2px;
}

.cal-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;

  // NOTE: 参加圆点使用品牌主色，发起用橙色区分角色
  &--joined {
    background: $brand-primary;
  }

  &--created {
    background: #FF9500;
  }
}

// NOTE: 选中时圆点改为白色，与蓝色背景对比
.cal-day-cell--selected .cal-dot {
  opacity: 0.85;
}

// ── 图例 ──
.cal-legend {
  display: flex;
  gap: 16px;
  justify-content: center;
  padding: 8px 0 10px;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cal-legend-text {
  font-size: 11px;
  color: #8e8e93;
}

// ── 当日活动面板 ──
.cal-day-panel {
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
  padding: 12px 0 16px;
}

.cal-day-panel__header {
  margin-bottom: 10px;
}

.cal-day-panel__title {
  font-size: 13px;
  font-weight: 600;
  color: #8e8e93;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

// ── 无活动提示 ──
.cal-empty {
  padding: 12px 0;
}

.cal-empty-text {
  font-size: 13px;
  color: #c7c7cc;
  text-align: center;
  display: block;
}

// ── 活动卡片 ──
.cal-event-card {
  display: flex;
  align-items: stretch;
  background: $ios-bg-secondary;
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }
}


.cal-event-card__body {
  flex: 1;
  padding: 10px 12px;
  min-width: 0;
}

.cal-event-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.cal-event-card__title {
  font-size: 14px;
  font-weight: 600;
  color: $ios-text-primary;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.cal-event-card__badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  flex-shrink: 0;

  &--joined {
    color: $brand-primary;
    background: rgba(124, 78, 58, 0.1);
  }

  &--created {
    color: #FF9500;
    background: rgba(255, 149, 0, 0.1);
  }
}

.cal-event-card__meta {
  display: flex;
  align-items: center;
}

.cal-event-card__time {
  font-size: 12px;
  color: #8e8e93;
  flex-shrink: 0;
}

.cal-event-card__dot-sep {
  font-size: 12px;
  color: #c7c7cc;
  flex-shrink: 0;
}

.cal-event-card__venue {
  font-size: 12px;
  color: #8e8e93;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
