<template>
  <div class="bar">
    <UserProfile />
    <div class="nav">
      <Breadcrumb :pathArray="pathArray" :pageTitle="pageTitle" :goto="goto" />
    </div>
  </div>
</template>

<script>
import { path, take, split, identity, filter, compose, concat, join } from 'ramda'
import { mapState, mapGetters } from 'vuex'
import UserProfile from './components/UserProfile.vue'
import Breadcrumb from './components/Breadcrumb.vue'

export default {
  name: 'LayoutNav',
  components: {
    UserProfile,
    Breadcrumb,
  },
  computed: {
    normalizedDirPath() {
      const dirPath = path(['list', 'dirInfo', 'path'], this)
      if (typeof dirPath !== 'string' || !dirPath) return '/'
      return dirPath
    },
    pathArray() {
      return compose(filter(identity), split('/'))(this.normalizedDirPath)
    },
    pageTitle() {
      return this.$route.meta && this.$route.meta.pageTitle
    },
    currentDirPath() {
      return this.normalizedDirPath
    },
    ...mapState(['list', 'auth']),
  },
  methods: {
    goto(index) {
      const remotePath =
        index === undefined ? '/' : concat('/', concat(join('/', take(index + 1)(this.pathArray)), '/'))
      return this.$store.dispatch({
        type: 'GET_LIST_DIR_INFO',
        remotePath,
        action: 0,
      })
    },
  },
}
</script>
