<template>
  <div class="files-thumbnail" v-if="listData.length && isThumbnailMode">
    <div class="files-thumbnail-body" v-if="!loading">
      <FileThumbnailItem
        v-for="(file, index) in listData"
        :key="file.uri"
        :file="file"
        :index="index"
        :listItemState="listItemState"
        :getListTabIndex="getListTabIndex"
        :isImageFile="isImageFile"
        :getThumbnailUrl="getThumbnailUrl"
        :getFileIconClass="getFileIconClass"
        @select-item="handleSelectItem"
        @dblclick-item="handleDblclickItem"
        @contextmenu-item="handleContextmenuItem"
        @thumbnail-error="handleThumbnailError"
      />
    </div>
  </div>
</template>

<script>
import FileThumbnailItem from './FileThumbnailItem.vue'
export default {
  name: 'FileThumbnailList',
  components: { FileThumbnailItem },
  props: {
    listData: Array,
    isThumbnailMode: Boolean,
    loading: Boolean,
    listItemState: Object,
    getListTabIndex: Function,
    isImageFile: Function,
    getThumbnailUrl: Function,
    getFileIconClass: Function,
  },
  methods: {
    handleSelectItem(...args) {
      this.$emit('select-item', ...args)
    },
    handleDblclickItem(...args) {
      this.$emit('dblclick-item', ...args)
    },
    handleContextmenuItem(...args) {
      this.$emit('contextmenu-item', ...args)
    },
    handleThumbnailError(...args) {
      this.$emit('thumbnail-error', ...args)
    },
  },
}
</script>
