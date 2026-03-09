<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { initCloud } from './services/cloud'

onLaunch(() => {
  // 使用 setTimeout 延迟初始化云开发，避免真机栈溢出
  // 注意：微信小程序编译不支持动态 import()，必须使用同步 import
  setTimeout(() => {
    initCloud().catch((err: unknown) => {
      console.error('云开发初始化失败:', err)
    })
  }, 300)
})
</script>

<style lang="scss">
@import './uni.scss';

page {
  height: 100%;
  // NOTE: 透明背景，各页面通过 .xxx-page CSS 和 pages.json backgroundColor 控制
  // FIXME: 原来的 $ios-bg-secondary 会在导航栏 hairline 处透出，导致浅色分割线
  background-color: transparent;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', 
    'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  font-size: $ios-font-size-md;
  color: $ios-text-primary;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* iOS风格通用按钮样式 */
button {
  font-family: inherit;
  font-size: $ios-font-size-md;
  border-radius: $ios-radius-sm;
  border: none;
  
  &::after {
    border: none;
  }
  
  &[disabled] {
    opacity: 0.5;
  }
}

/* iOS风格输入框 */
input, textarea {
  font-family: inherit;
  font-size: $ios-font-size-md;
  color: $ios-text-primary;
  
  &::placeholder {
    color: $ios-text-tertiary;
  }
}
</style>
