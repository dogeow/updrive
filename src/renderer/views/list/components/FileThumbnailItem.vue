<template>
  <div
    class="files-thumbnail-item"
    :class="{ 'item-selected': (listItemState[file.uri] && listItemState[file.uri].selected) }"
    :tabindex="getListTabIndex(file.uri)"
    @click.stop="$emit('select-item', file, $event, index)"
    @dblclick.stop="file && file.uri && $emit('dblclick-item', file.uri)"
    @contextmenu.prevent="$emit('contextmenu-item', file)"
  >
    <div class="files-thumbnail-preview">
      <img
        v-if="isImageFile(file)"
        class="files-thumbnail-image"
        :src="getThumbnailUrl(file)"
        :alt="file.filename"
        @error="$emit('thumbnail-error', file)"
      >
      <i v-else class="res-icon files-thumbnail-icon" :class="getFileIconClass(file.filename, file.folderType)"></i>
    </div>
    <div class="files-thumbnail-name" :title="file.filename">{{file.filename}}</div>
  </div>
</template>

<script>
export default {
  name: 'FileThumbnailItem',
  props: {
    file: Object,
    index: Number,
    listItemState: Object,
    getListTabIndex: Function,
    isImageFile: Function,
    getThumbnailUrl: Function,
    getFileIconClass: Function,
  },
}
</script>
