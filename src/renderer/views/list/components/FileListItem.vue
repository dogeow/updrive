<template>
  <div
    class="files-list-item"
    :class="{ 'item-selected': (listItemState[file.uri] && listItemState[file.uri].selected) }"
    :tabindex="getListTabIndex(file.uri)"
    @click.stop="file && file.uri && $emit('select-item', file, $event, index)"
    @dblclick.stop="file && file.uri && $emit('dblclick-item', file.uri)"
    @contextmenu.prevent="$emit('contextmenu-item', file)"
    :draggable="file && file.uri"
    @dragstart.native="handleDragStart"
    @dragover.native="handleDragOver"
    @dragleave.native="handleDragLeave"
    @drop.native="handleDrop"
  >
    <div class="name file-info-item">
      <i class="res-icon" :class="getFileIconClass(file.filename, file.folderType)"></i>{{file.filename}}
    </div>
    <div class="last-modified file-info-item">{{file.lastModified | timestamp}}</div>
    <div class="mime file-info-item">{{file.filetype}}</div>
    <div class="size file-info-item">{{(file.folderType === 'F' ? '-' : file.size) | digiUnit}}</div>
  </div>
</template>

<script>
import { timestamp, digiUnit } from '@/api/tool'

export default {
  name: 'FileListItem',
  props: {
    file: Object,
    index: Number,
    listItemState: Object,
    getListTabIndex: Function,
    getFileIconClass: Function,
  },
  data() {
    return {
      isDragging: false,
    }
  },
  filters: {
    timestamp,
    digiUnit,
  },
  methods: {
    handleDragStart(event) {
      console.log('[FileListItem] dragstart')
      if (!this.file || !this.file.uri) {
        event.preventDefault()
        return
      }
      this.isDragging = true
      event.dataTransfer.setData('text/plain', this.file.uri)
      event.dataTransfer.effectAllowed = 'move'
      console.log('[FileListItem] dragstart set data:', this.file.uri)
    },
    handleDragOver(event) {
      console.log('[FileListItem] dragover')
      // 只有文件夹才允许放置
      if (this.file && this.file.folderType === 'F') {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
      }
    },
    handleDragLeave(event) {
      // 可以添加视觉反馈
    },
    handleDrop(event) {
      console.log('[FileListItem] drop')
      event.preventDefault()
      event.stopPropagation()
      this.isDragging = false

      // 只有文件夹才接受放置
      if (!this.file || this.file.folderType !== 'F') {
        return
      }

      const sourceUri = event.dataTransfer.getData('text/plain')
      if (!sourceUri) {
        return
      }

      // 不能将文件夹移动到自身
      if (sourceUri === this.file.uri) {
        return
      }

      // 触发移动文件的 action
      // 确保 targetPath 是目录路径（以 / 结尾）
      let targetPath = this.file.uri
      if (!targetPath.endsWith('/')) {
        targetPath += '/'
      }

      console.log('[FileListItem] MOVE_FILES:', sourceUri, '->', targetPath)
      this.$store.dispatch('MOVE_FILES', {
        sourcePath: sourceUri,
        targetPath: targetPath,
      })
    },
  },
}
</script>
