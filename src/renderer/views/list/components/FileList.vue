<template>
  <div class="files-list" v-if="listData.length && isListMode">
    <div class="files-list-column">
      <div class="column-file-name table-column" />
      <div class="column-last-modified table-column" />
      <div class="column-file-type table-column" v-if="!isViewDetail" />
      <div class="column-file-size table-column" v-if="!isViewDetail" />
    </div>
    <div class="files-list-header">
      <div class="file-info-header column-file-name" @click="$emit('sort', 'filename')">
        名称
        <svg :class="{'is-active': sortInfo.key === 'filename' && !sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-up"></use></svg>
        <svg :class="{'is-active': sortInfo.key === 'filename' && sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-down"></use></svg>
      </div>
      <div class="file-info-header column-last-modified" @click="$emit('sort', 'lastModified')">
        添加日期
        <svg :class="{'is-active': sortInfo.key === 'lastModified' && !sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-up"></use></svg>
        <svg :class="{'is-active': sortInfo.key === 'lastModified' && sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-down"></use></svg>
      </div>
      <div class="file-info-header column-file-type" v-if="!isViewDetail" @click="$emit('sort', 'filetype')">
        类型
        <svg :class="{'is-active': sortInfo.key === 'filetype' && !sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-up"></use></svg>
        <svg :class="{'is-active': sortInfo.key === 'filetype' && sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-down"></use></svg>
      </div>
      <div class="file-info-header column-file-size" v-if="!isViewDetail" @click="$emit('sort', 'size')">
        大小
        <svg :class="{'is-active': sortInfo.key === 'size' && !sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-up"></use></svg>
        <svg :class="{'is-active': sortInfo.key === 'size' && sortInfo.isReverse}" class="svg-icon"><use xlink:href="#icon-arrow-down"></use></svg>
      </div>
    </div>
    <div class="files-list-body" v-if="!loading">
      <FileListItem
        v-for="(file, index) in listData"
        :key="file.uri"
        :file="file"
        :index="index"
        :listItemState="listItemState"
        :getListTabIndex="getListTabIndex"
        :getFileIconClass="getFileIconClass"
        @select-item="handleSelectItem"
        @dblclick-item="handleDblclickItem"
        @contextmenu-item="handleContextmenuItem"
      />
    </div>
  </div>
</template>


<script>
import FileListItem from './FileListItem.vue'
import { timestamp, digiUnit, getFileIconClass } from '@/api/tool'

export default {
  name: 'FileList',
  components: { FileListItem },
  props: {
    listData: Array,
    sortInfo: Object,
    isListMode: Boolean,
    isViewDetail: Boolean,
    loading: Boolean,
    listItemState: Object,
    getListTabIndex: Function,
    getFileIconClass: {
      type: Function,
      required: true,
    },
  },
  filters: {
    timestamp,
    digiUnit,
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
  },
}
</script>
