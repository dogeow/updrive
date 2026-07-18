<template>
  <div class="list-operation">
    <div class="list-operation-item" @click="$emit('create-folder')">
      <Icon name="icon-files" />
      <span class="op-label">新建文件夹</span>
    </div>
    <div class="list-operation-search">
      <input
        type="text"
        class="search-input"
        placeholder="搜索当前目录..."
        :value="searchKeyword"
        @input="$emit('search', $event.target.value)"
      />
      <Icon
        v-if="searchKeyword"
        name="icon-delete"
        class="search-clear"
        @click.native="$emit('search', '')"
      />
    </div>
    <div class="list-operation-item" @click="$emit('upload-all')">
      <Icon name="icon-uploads" />
      <span class="op-label">上传</span>
    </div>
    <div class="list-operation-separator"></div>
    <div class="list-operation-item" @click="$emit('view')" :class="{disabled: !isSelectedSingleFile}">
      <Icon name="icon-browse" />
      <span class="op-label">查看</span>
    </div>
    <div class="list-operation-item" @click="$emit('rename')" :class="{disabled: !isSelectedSingleItem}">
      <Icon name="icon-edit" />
      <span class="op-label">重命名</span>
    </div>
    <div class="list-operation-item" @click="$emit('move')" :class="{disabled: !isSelectedSingleItem}">
      <Icon name="icon-browse" />
      <span class="op-label">移动到...</span>
    </div>
    <div class="list-operation-item" @click="$emit('delete')" :class="{disabled: !selectedLength}">
      <Icon name="icon-delete" />
      <span class="op-label">删除</span>
    </div>
    <div class="list-operation-item" @click="$emit('copy-href')" :class="{disabled: !isSelectedSingleFile}">
      <Icon name="icon-link" />
      <span class="op-label">获取链接</span>
    </div>
    <div class="list-operation-item" @click="$emit('download')" :class="{disabled: !uniqueSelectedUri}">
      <Icon name="icon-download" />
      <span class="op-label">下载</span>
    </div>
    <div
      class="list-operation-item"
      @click="$emit('detail')"
      :class="{disabled: !selectedLength, 'list-operation-item-hover': isViewDetail}"
    >
      <Icon name="icon-information" />
      <span class="op-label">详情</span>
    </div>

    <div class="list-operation-view-switch">
      <div
        class="list-operation-item"
        @click="$emit('set-list-view-mode', 'list')"
        :class="{'list-operation-item-hover': isListMode}"
      >
        <Icon name="icon-files" />
        <span class="op-label">列表</span>
      </div>
      <div
        class="list-operation-item"
        @click="$emit('set-list-view-mode', 'thumbnail')"
        :class="{'list-operation-item-hover': isThumbnailMode}"
      >
        <Icon name="icon-browse" />
        <span class="op-label">缩略图</span>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from '@/components/Icon'

export default {
  name: 'ListOperationBar',
  components: { Icon },
  props: {
    isSelectedSingleFile: Boolean,
    isSelectedSingleItem: Boolean,
    uniqueSelectedUri: String,
    selectedLength: Number,
    isViewDetail: Boolean,
    isListMode: Boolean,
    isThumbnailMode: Boolean,
    searchKeyword: String,
  },
}
</script>
