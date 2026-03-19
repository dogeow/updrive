<template>
  <div
    class="files-thumbnail-item"
    :class="{ 'item-selected': (listItemState[file.uri] && listItemState[file.uri].selected) }"
    :tabindex="getListTabIndex(file.uri)"
    @click.stop="$emit('select-item', file, $event, index)"
    @dblclick.stop="file && file.uri && $emit('dblclick-item', file.uri)"
    @contextmenu.prevent="$emit('contextmenu-item', file)"
    :draggable="file && file.uri"
    @dragstart="handleDragStart"
    @dragover="handleDragOver"
    @drop="handleDrop"
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
  methods: {
    handleDragStart(event) {
      console.log('[Thumbnail] dragstart')
      if (!this.file || !this.file.uri) {
        event.preventDefault()
        return
      }
      event.dataTransfer.setData('text/plain', this.file.uri)
      event.dataTransfer.effectAllowed = 'move'
    },
    handleDragOver(event) {
      console.log('[Thumbnail] dragover')
      if (this.file && this.file.folderType === 'F') {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }
    },
    handleDrop(event) {
      console.log('[Thumbnail] drop')
      event.preventDefault()
      event.stopPropagation()

      if (!this.file || this.file.folderType !== 'F') {
        return
      }

      const sourceUri = event.dataTransfer.getData('text/plain')
      if (!sourceUri) {
        return
      }

      if (sourceUri === this.file.uri) {
        return
      }

      let targetPath = this.file.uri
      if (!targetPath.endsWith('/')) {
        targetPath += '/'
      }

      console.log('[Thumbnail] MOVE_FILES:', sourceUri, '->', targetPath)
      this.$store.dispatch('MOVE_FILES', {
        sourcePath: sourceUri,
        targetPath: targetPath,
      })
    },
  },
}
</script>
