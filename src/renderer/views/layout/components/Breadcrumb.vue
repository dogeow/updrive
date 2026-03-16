<template>
  <nav class="breadcrumb">
    <ul v-if="!pageTitle">
      <li :class="{'is-active': !pathArray.length}">
        <a @click.prevent.stop="goto()">{{auth.user.bucketName}}</a>
      </li>
      <li :class="{'is-active': index === pathArray.length - 1}" v-for="(name, index) in pathArray" :key="name + index">
        <a @click.prevent.stop="goto(index)">{{name}}</a>
      </li>
    </ul>
    <ul v-if="pageTitle">
      <li class="is-active">
        <a>{{pageTitle}}</a>
      </li>
    </ul>
  </nav>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'Breadcrumb',
  props: {
    pathArray: Array,
    pageTitle: String,
    goto: Function,
  },
  computed: {
    ...mapState(['auth']),
  },
}
</script>
