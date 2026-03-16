<template>
  <router-view></router-view>
</template>

<script>
import { commit } from 'vuex'

import Store from '@/store'
import { listenSelectAll, setApplicationMenu } from '@/api/electron.js'
import '@/assets/iconfont.js'

setApplicationMenu()

export default {
  store: Store,
  created() {
    this.preventDefaultDragEvent()
    this.handleResize()
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    // 阻止默认的拖动事件
    preventDefaultDragEvent() {
      document.addEventListener('drop', event => event.preventDefault(), false)
      document.addEventListener('dragover', event => event.preventDefault(), false)
    },
    handleResize() {
      if (window.innerWidth <= 700) {
        document.body.classList.add('icon-only')
      } else {
        document.body.classList.remove('icon-only')
      }
    },
  },
}
</script>

<style lang="scss">
@import '~@/styles/index.scss';
</style>
