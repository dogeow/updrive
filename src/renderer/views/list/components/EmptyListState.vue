<template>
  <table class="table empty-list-table">
    <tbody>
      <tr v-for="(value, index) in Array.apply(null, {length: 9})" :key="index" class="empty-list-row">
        <div class="empty-content" v-if="index === 3">
          <p class="has-text-weight-bold">该文件夹为空</p>
          <p>拖动到此处即可上传文件，或<a @click="$emit('upload-file')">点击上传</a></p>
        </div>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'EmptyListState',
}
</script>
