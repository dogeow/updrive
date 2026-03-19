<template>
  <nav class="breadcrumb">
    <ul v-if="!pageTitle">
      <li>
        <a @click.prevent.stop="goto()">Home</a>
      </li>
      <li v-for="(name, index) in filteredPathArray" :key="index" :class="{'is-active': index === filteredPathArray.length - 1}">
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
export default {
  name: 'Breadcrumb',
  props: {
    pathArray: Array,
    pageTitle: String,
    goto: Function,
  },
  computed: {
    filteredPathArray() {
      return (this.pathArray || []).filter(p => p && p.trim())
    },
  },
}
</script>
