<template>
  <img :src="src" alt="">
</template>

<script>
export default {
  name: 'LocalImage',
  props: {
    src: {
      type: String,
      required: true
    }
  }
}
</script>
