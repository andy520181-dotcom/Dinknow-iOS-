/**
 * 虚拟滚动 Hook — 轻量级列表性能优化
 *
 * 原理：只渲染视口 ± buffer 区域内的列表项，
 * 不在视口内的项用等高占位块替代，减少 DOM 节点数。
 *
 * 适用场景：WeChat Miniprogram 页面级原生滚动（非 scroll-view）
 */
import { ref, computed, type Ref } from 'vue'

/** 虚拟滚动配置 */
interface VirtualScrollOptions {
    /** 预估的单个列表项高度（px），不需要精确 */
    itemHeight: number
    /** 列表区域距页面顶部的偏移量（px），用于补偿搜索栏/筛选栏高度 */
    listOffsetTop?: number
    /** 视口上下各多渲染的缓冲项数 */
    buffer?: number
    /** 低于此数量不启用虚拟滚动 */
    threshold?: number
}

/**
 * 创建虚拟滚动 Hook
 * @param items 完整列表数据 ref
 * @param options 配置项
 */
export function useVirtualScroll<T>(
    items: Ref<T[]>,
    options: VirtualScrollOptions
) {
    const {
        itemHeight,
        listOffsetTop = 0,
        buffer = 3,
        threshold = 20,
    } = options

    // NOTE: 当前页面滚动位置
    const scrollTop = ref(0)

    // NOTE: 屏幕高度，onMounted 后获取
    const screenHeight = ref(750)

    // NOTE: 初始化屏幕高度
    function initScreenHeight() {
        try {
            const info = uni.getSystemInfoSync()
            screenHeight.value = info.windowHeight || 750
        } catch {
            screenHeight.value = 750
        }
    }

    /**
     * 页面滚动回调，在页面的 onPageScroll 中调用
     */
    function handlePageScroll(e: { scrollTop: number }) {
        scrollTop.value = e.scrollTop
    }

    /**
     * 是否启用虚拟滚动（列表项少于阈值时不启用，避免不必要的开销）
     */
    const enabled = computed(() => items.value.length >= threshold)

    /**
     * 可见范围计算
     */
    const visibleRange = computed(() => {
        const total = items.value.length
        if (!enabled.value || total === 0) {
            return { start: 0, end: total }
        }

        // NOTE: 当前滚动位置相对于列表起始位置的偏移
        const relativeScrollTop = Math.max(0, scrollTop.value - listOffsetTop)

        // NOTE: 第一个可见项的索引
        const rawStart = Math.floor(relativeScrollTop / itemHeight)
        const start = Math.max(0, rawStart - buffer)

        // NOTE: 最后一个可见项的索引
        const visibleCount = Math.ceil(screenHeight.value / itemHeight)
        const rawEnd = rawStart + visibleCount
        const end = Math.min(total, rawEnd + buffer)

        return { start, end }
    })

    /**
     * 当前应渲染的列表项（带原始索引）
     */
    const visibleItems = computed(() => {
        const { start, end } = visibleRange.value
        return items.value.slice(start, end).map((item, i) => ({
            item,
            index: start + i,
        }))
    })

    /**
     * 列表总高度（用于撑开滚动区域）
     */
    const totalHeight = computed(() => items.value.length * itemHeight)

    /**
     * 顶部占位高度
     */
    const paddingTop = computed(() =>
        enabled.value ? visibleRange.value.start * itemHeight : 0
    )

    /**
     * 底部占位高度
     */
    const paddingBottom = computed(() => {
        if (!enabled.value) return 0
        const { end } = visibleRange.value
        return Math.max(0, (items.value.length - end) * itemHeight)
    })

    return {
        /** 页面滚动事件处理器 */
        handlePageScroll,
        /** 初始化屏幕高度（在 onMounted 中调用） */
        initScreenHeight,
        /** 是否启用虚拟滚动 */
        enabled,
        /** 可见项列表（含原始索引） */
        visibleItems,
        /** 顶部占位 px */
        paddingTop,
        /** 底部占位 px */
        paddingBottom,
        /** 列表总高度 px */
        totalHeight,
        /** 可见范围 { start, end } */
        visibleRange,
    }
}
