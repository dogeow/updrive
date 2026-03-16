<template>
  <div
    class="files-list-item"
    :class="{ 'item-selected': (listItemState[file.uri] && listItemState[file.uri].selected) }"
    :tabindex="getListTabIndex(file.uri)"
    @click.stop="file && file.uri && $emit('select-item', file, $event, index)"
    @dblclick.stop="file && file.uri && $emit('dblclick-item', file.uri)"
    @contextmenu.prevent="$emit('contextmenu-item', file)"
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
  filters: {
    timestamp,
    digiUnit,
  },
}
</script>
