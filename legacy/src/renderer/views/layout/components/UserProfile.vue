<template>
  <div class="nav-profile" @click="toggleProfileMenu">
    <div class="nav-profile-info">
      <div class="nav-profile-bucket">{{auth.user.bucketName}}</div>
    </div>
    <div class="dropdown-background" v-show="isShowProfileMenu" @click.stop="toggleProfileMenu"></div>
    <div class="dropdown-menu" v-show="isShowProfileMenu">
      <div class="dropdown-content" @click.stop="void 0">
        <div class="dropdown-content-profile-name">{{auth.user.operatorName}}/{{auth.user.bucketName}}</div>
        <div class="dropdown-item" v-if="auth.usage">已使用 {{auth.usage | digiUnit}}</div>
        <hr class="dropdown-divider">
        <a class="dropdown-item" @click.prevent="openExternal(externalUrls.domain)">
          云存储服务设置
        </a>
        <a class="dropdown-item" @click.prevent="openExternal(externalUrls.createBucket)">
          创建云存储服务
        </a>
        <hr class="dropdown-divider">
        <a class="dropdown-item" @click.prevent="toggleAccount">
          切换账号
        </a>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { openExternal } from '@/api/electron.js'
import { digiUnit } from '@/api/tool'

export default {
  name: 'UserProfile',
  data() {
    return {
      isShowProfileMenu: false,
    }
  },
  computed: {
    ...mapState(['auth']),
    ...mapGetters(['externalUrls']),
  },
  methods: {
    toggleProfileMenu() {
      this.isShowProfileMenu = !this.isShowProfileMenu
    },
    toggleAccount() {
      if (this.$route.name !== 'login') {
        this.$router.push({ name: 'login' })
      }
      this.$store.dispatch('LOGOUT')
      this.isShowProfileMenu = false
    },
    openExternal(href) {
      openExternal(href)
      this.isShowProfileMenu = false
    },
  },
  filters: {
    digiUnit,
  },
}
</script>
