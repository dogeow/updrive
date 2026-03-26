<template>
  <div class="list-view">
    <div class="list-view-main" ref='listView' tabindex="-1" @keydown="keydown">
      <ListOperationBar
        :isSelectedSingleFile="isSelectedSingleFile"
        :isSelectedSingleItem="isSelectedSingleItem"
        :uniqueSelectedUri="uniqueSelectedUri"
        :selectedLength="selected.length"
        :isViewDetail="isViewDetail"
        :isListMode="isListMode"
        :isThumbnailMode="isThumbnailMode"
        @create-folder="createFolder"
        @upload-all="uploadAll"
        @view="() => isSelectedSingleFile && dblclickItem(uniqueSelectedUri)"
        @rename="() => isSelectedSingleItem && renameFile()"
        @move="() => isSelectedSingleItem && moveFile()"
        @delete="() => selected.length && toggleShowDeleteModal(true)"
        @copy-href="() => isSelectedSingleFile && copyHref()"
        @download="() => selected.length && downloadFile()"
        @detail="() => isViewDetail ? toggleShowViewDetail() : getFileDetail()"
        @set-list-view-mode="setListViewMode"
      @search="handleSearch"
      :searchKeyword="searchKeyword"
      />
      <div
        class="list"
        :class="{'drag-over': isDragOver}"
        @contextmenu.prevent="contextmenu()"
        @dragstart="dragstart"
        @dragleave="dragleave"
        @dragend="dragend"
        @dragover="dragover"
        @drop="drop"
      >
        <FileList
          v-if="listData.length && isListMode"
          :listData="listData"
          :sortInfo="sortInfo"
          :isListMode="isListMode"
          :isViewDetail="isViewDetail"
          :loading="list.dirInfo.loading"
          :listItemState="listItemState"
          :getListTabIndex="getListTabIndex"
          :getFileIconClass="getFileIconClass"
          @sort="sort"
          @select-item="selectItem"
          @dblclick-item="dblclickItem"
          @contextmenu-item="contextmenuItem"
        />
        <FileThumbnailList
          v-if="listData.length && isThumbnailMode"
          :listData="listData"
          :isThumbnailMode="isThumbnailMode"
          :loading="list.dirInfo.loading"
          :listItemState="listItemState"
          :getListTabIndex="getListTabIndex"
          :isImageFile="isImageFile"
          :getThumbnailUrl="getThumbnailUrl"
          :getFolderCover="getFolderCover"
          :folderCoverMap="folderCoverMap"
          :getFileIconClass="getFileIconClass"
          @select-item="selectItem"
          @dblclick-item="dblclickItem"
          @contextmenu-item="contextmenuItem"
          @thumbnail-error="onThumbnailError"
        />
        <EmptyListState
          v-if="!listData.length && !list.dirInfo.loading"
          @upload-file="uploadFile"
        />
        <spinner v-if="list.dirInfo.loading"/>
      </div>
    </div>
    <FileDetail
      :isViewDetail="isViewDetail"
      :fileDetail="fileDetail"
      :detailLoading="detailLoading"
      :baseHref="baseHref"
      :getUpyunApiUrl="getUpyunApiUrl"
      :getHref="getHref"
      :getFileIconClass="getFileIconClass"
      @close-detail="toggleShowViewDetail"
      @copy-href="copyHref"
    />
    <confirm-modal
      title="是否删除选中文件?"
      :show="showDeleteModal"
      @confirm="deleteFile"
      @close="toggleShowDeleteModal"
    >
      <p>{{`确定要删除「${getBasename(selected[0])}」${selected.length > 1 ? `等${selected.length}个文件` : ''}吗?`}}</p>
      <p class="has-text-weight-bold" style="margin-top: 1em;">该操作无法恢复。</p>
    </confirm-modal>
  </div>
</template>

<script>
import {
  sort,
  nth,
  indexOf,
  equals,
  assocPath,
  map,
  compose,
  assoc,
  path,
  cond,
  and,
  prop,
  both,
  T,
  always,
  keys,
  filter,
  apply,
  range,
  pick,
  merge,
  converge,
  length,
  not,
  __,
  reduce,
  identity,
  findIndex,
  last,
  pipe,
  propEq,
  slice,
  uri,
  pluck,
  concat,
  remove,
  append,
  isEmpty,
} from 'ramda'
import { mapState, mapGetters } from 'vuex'
import Path from 'path'
import Message from '@/api/message'
import ConfirmModal from '@/components/ConfirmModal'

import Icon from '@/components/Icon'
import FileList from './components/FileList.vue'
import FileThumbnailList from './components/FileThumbnailList.vue'
import FileDetail from './components/FileDetail.vue'
import EmptyListState from './components/EmptyListState.vue'
import ListOperationBar from './components/ListOperationBar.vue'
import Spinner from '@/components/Spinner'
import { timestamp, digiUnit, isDir, getFileIconClass, listSort, getFileTypeFromName } from '@/api/tool'
import {
  uploadFileDialog,
  uploadDirectoryDialog,
  uploadDialog,
  downloadFileDialog,
  createContextmenu,
  showContextmenu,
  openExternal,
  windowOpen,
} from '@/api/electron.js'

export default {
  name: 'List',
  components: {
    Spinner,
    Icon,
    ConfirmModal,
    ListOperationBar,
    FileList,
    FileThumbnailList,
    EmptyListState,
    FileDetail,
  },
  data() {
    return {
      copytext: '点击复制',
      detailLoading: false,
      isViewDetail: false,
      isDragOver: false,
      showDeleteModal: false,
      thumbnailFallbackMap: {},
      folderCoverMap: {}, // 文件夹封面缓存
      searchKeyword: '', // 搜索关键词
    }
  },
  computed: {
    listData() {
      const data = this.searchKeyword
        ? this.filteredListData
        : this.list.dirInfo.data
      return listSort(data, this.sortInfo.key, this.sortInfo.isReverse)
    },
    filteredListData() {
      if (!this.searchKeyword) return this.list.dirInfo.data
      const keyword = this.searchKeyword.toLowerCase()
      return this.list.dirInfo.data.filter(item => {
        const filename = item.filename || ''
        return filename.toLowerCase().includes(keyword)
      })
    },
    sortInfo() {
      return path(['profile', 'data', 'sortInfo'], this) || {}
    },
    listViewMode() {
      return path(['profile', 'data', 'listViewMode'], this) || 'list'
    },
    loadFolderCoverEnabled() {
      return path(['profile', 'data', 'loadFolderCover'], this) !== false
    },
    isThumbnailMode() {
      return this.listViewMode === 'thumbnail'
    },
    isListMode() {
      return !this.isThumbnailMode
    },
    thumbnailRequestWidth() {
      const renderWidth = 200
      return process.platform === 'darwin' ? renderWidth * 2 : renderWidth
    },
    isSelectedSingleFile() {
      return this.uniqueSelectedUri && !isDir(this.uniqueSelectedUri)
    },
    isSelectedSingleItem() {
      return !!this.uniqueSelectedUri
    },
    uniqueSelectedUri() {
      const { selected } = this
      if (selected && selected.length !== 1) return ''
      return selected[0]
    },
    selected() {
      return path(['list', 'selected'], this) || []
    },
    listItemState() {
      const setSelected = reduce((result, value) => assocPath([value, 'selected'], true)(result), __, this.selected)
      return setSelected({})
    },
    currentDirPath() {
      return path(['list', 'dirInfo', 'path'], this)
    },
    fileDetail() {
      const fileDetail = path(['list', 'fileDetail'], this, { basicInfo: {}, headerInfo: {} })
      if (isEmpty(fileDetail.basicInfo)) {
        return {
          ...fileDetail,
          basicInfo: {
            filename: this.auth.user.bucketName,
            folderType: 'B',
          },
        }
      }
      return {
        ...fileDetail,
        basicInfo: {
          ...fileDetail.basicInfo,
        },
      }
    },
    backUri() {
      const backStack = path(['list', 'history', 'backStack'], this) || []
      return last(backStack)
    },
    forwardUri() {
      const forwardStack = path(['list', 'history', 'forwardStack'], this) || []
      return last(forwardStack)
    },
    ...mapState(['list', 'auth', 'profile']),
    ...mapGetters(['baseHref', 'getUpyunApiUrl', 'upyunClient']),
  },
  watch: {
    currentDirPath() {
      this.thumbnailFallbackMap = {}
      this.searchKeyword = '' // 切换目录时清空搜索关键词
    },
    'profile.data.loadFolderCover': function() {
      // 当设置变化时，清空文件夹封面缓存
      this.folderCoverMap = {}
    },
  },
  methods: {
    setListViewMode(mode) {
      if (!['list', 'thumbnail'].includes(mode)) return
      if (mode === this.listViewMode) return
      this.$store.dispatch('SET_PROFILE_STORE', {
        data: { listViewMode: mode },
      })
    },
    handleSearch(keyword) {
      this.searchKeyword = keyword
    },
    isImageFile(file = {}) {
      return getFileTypeFromName(file.filename, file.folderType) === 'image'
    },
    getThumbnailUrl(file = {}) {
      const originalUrl = this.getUpyunApiUrl(file.uri)
      if (this.thumbnailFallbackMap[file.uri]) return originalUrl
      return `${originalUrl}!/fw/${this.thumbnailRequestWidth}`
    },
    // 获取文件夹封面图片
    getFolderCover(file = {}) {
      // 如果不是文件夹，返回空
      if (!file || file.folderType !== 'F') return []

      // 如果未启用文件夹封面功能，直接返回空
      if (!this.loadFolderCoverEnabled) return []

      // 如果已有缓存，直接返回
      if (this.folderCoverMap[file.uri]) {
        return this.folderCoverMap[file.uri]
      }

      // 返回空并在后台加载
      this.loadFolderCover(file)
      return []
    },
    // 异步加载文件夹封面
    async loadFolderCover(file) {
      console.log('[loadFolderCover] file:', file)
      if (!file || !file.uri || file.folderType !== 'F') return
      if (this.folderCoverMap[file.uri]) {
        console.log('[loadFolderCover] already loaded:', file.uri)
        return
      }

      try {
        console.log('[loadFolderCover] fetching:', file.uri)
        const images = await this.upyunClient.getFolderCover(file.uri, 4)
        console.log('[loadFolderCover] images:', images)
        if (images && images.length > 0) {
          // 使用新对象确保 Vue 响应式更新
          this.folderCoverMap = {
            ...this.folderCoverMap,
            [file.uri]: images
          }
          console.log('[loadFolderCover] set cover for:', file.uri)
        }
      } catch (err) {
        console.error('[loadFolderCover] Failed to load folder cover:', err)
      }
    },
    onThumbnailError(file = {}) {
      if (!file.uri || this.thumbnailFallbackMap[file.uri]) return
      this.thumbnailFallbackMap = {
        ...this.thumbnailFallbackMap,
        [file.uri]: true,
      }
    },
    refresh() {
      this.$store.dispatch('REFRESH_LIST')
    },
    toggleShowDeleteModal(value) {
      this.showDeleteModal = value !== undefined ? value : !this.showDeleteModal
    },
    toggleShowViewDetail(value) {
      this.isViewDetail = value !== undefined ? value : !this.isViewDetail
    },
    dragstart($event) {
      console.log('[List] dragstart')
      // 不阻止默认行为，让子元素的 dragstart 正常工作
      // 如果没有选中文件，才允许默认的拖动上传行为
      if (!this.selected.length) {
        return true
      }
      // 如果有选中文件，阻止默认行为
      return false
    },
    dragleave($event) {
      this.isDragOver = false
      return false
    },
    dragend($event) {
      return false
    },
    dragover($event) {
      console.log('[List] dragover')
      this.isDragOver = true
      // 必须调用 preventDefault 才能触发 drop 事件
      $event.preventDefault()
      return false
    },
    drop($event) {
      console.log('[List] drop, files:', $event.dataTransfer.files.length)
      this.isDragOver = false
      $event.preventDefault()

      // 检查是否是文件拖入（上传）还是内部文件移动
      const files = $event.dataTransfer.files
      if (files && files.length > 0) {
        // 文件拖入 - 上传
        console.log('[List] UPLOAD_FILES')
        this.$store.dispatch('UPLOAD_FILES', {
          remotePath: this.currentDirPath,
          localFilePaths: pluck('path', files),
        })
      }
      return false
    },
    getListTabIndex(uri) {
      return this.selected.includes(uri) ? 0 : -1
    },
    sort(key) {
      const sortInfo = {
        key: key,
        isReverse: this.sortInfo.key === key ? !this.sortInfo.isReverse : this.sortInfo.isReverse,
      }
      this.$store.dispatch('SET_PROFILE_STORE', {
        data: { sortInfo },
      })
    },
    findFileByUri(uri = this.uniqueSelectedUri) {
      return last(this.listData.filter(data => data.uri === uri))
    },
    listGetFocus() {
      this.$refs.listView.focus()
    },
    keydown($event) {
      const { ctrlKey, metaKey, key, shiftKey, altKey, target } = $event
      // 当焦点在输入框、textarea 或可编辑元素时，不拦截快捷键
      const tagName = target && target.tagName ? target.tagName.toLowerCase() : ''
      const isInputElement = tagName === 'input' || tagName === 'textarea' || target.isContentEditable
      const isModifierKey = ctrlKey || metaKey // 支持 Ctrl (Windows/Linux) 和 Command (macOS)
      const uriData = pluck('uri', this.listData)
      const selectUri = selected => this.$store.commit({ type: 'SET_SELECT_LIST', selected: selected })
      if (isModifierKey && !shiftKey && (key === 'a' || key === 'A') && !isInputElement) {
        $event.preventDefault()
        selectUri(uriData)
      }
      // 如果焦点在输入框内，不执行其他快捷键（让输入框自带功能正常工作）
      if (isInputElement) {
        return
      }
      // 滚动
      if (!ctrlKey && !shiftKey && (key === 'j' || key === 'ArrowDown')) {
        const currentLastIndex = indexOf(last(this.selected), uriData)
        const targetUri = currentLastIndex + 1 > uriData.length - 1 ? last(uriData) : nth(currentLastIndex + 1, uriData)
        selectUri([targetUri])
      }
      if (!ctrlKey && !shiftKey && (key === 'k' || key === 'ArrowUp')) {
        const currentLastIndex = indexOf(last(this.selected), uriData)
        const targetUri = currentLastIndex - 1 < 0 ? nth(0, uriData) : nth(currentLastIndex - 1, uriData)
        selectUri([targetUri])
      }
      if (!ctrlKey && shiftKey && (key === 'j' || key === 'ArrowDown')) {
        const currentLastIndex = indexOf(last(this.selected), uriData)
        const targetUri = currentLastIndex + 1 > uriData.length - 1 ? last(uriData) : nth(currentLastIndex + 1, uriData)
        selectUri(append(targetUri, this.selected))
      }
      if (!ctrlKey && shiftKey && (key === 'k' || key === 'ArrowUp')) {
        const currentLastIndex = indexOf(last(this.selected), uriData)
        const targetUri = currentLastIndex - 1 < 0 ? nth(0, uriData) : nth(currentLastIndex - 1, uriData)
        selectUri(append(targetUri, this.selected))
      }
      if (key === 'ArrowRight') {
        if (this.forwardUri !== undefined) {
          this.$store
            .dispatch({ type: 'GET_LIST_DIR_INFO', remotePath: this.forwardUri, action: 1 })
            .then(() => this.listGetFocus())
        }
      }
      if (key === 'ArrowLeft' || key === 'Backspace') {
        if (this.backUri !== undefined) {
          this.$store
            .dispatch({ type: 'GET_LIST_DIR_INFO', remotePath: this.backUri, action: -1 })
            .then(() => this.listGetFocus())
        }
      }
      if (!ctrlKey && !shiftKey && key === 'Enter') {
        const uri = last(this.selected)
        if (uri) {
          this.dblclickItem(uri)
        }
      }
    },
    selectItem({ uri }, $event, index) {
      const data = this.listData
      const getSelectedList = () => {
        const { selected } = this
        if ($event.shiftKey) {
          const lastIndex = findIndex(pipe(last, propEq('uri'))(selected), data)
          const getBacthFile = lastIndex < index ? slice(lastIndex, index + 1) : slice(index, lastIndex + 1)
          const addedList = pluck('uri', getBacthFile(data))
          return $event.ctrlKey ? concat(selected, addedList) : addedList
        } else if ($event.ctrlKey) {
          return !~selected.indexOf(uri) ? append(uri, selected) : remove(selected.indexOf(uri), 1, selected)
        } else {
          return [uri]
        }
      }
      if (this.isViewDetail) {
        this.getFileDetail(uri)
      }
      this.$store.commit({ type: 'SET_SELECT_LIST', selected: getSelectedList() })
    },
    contextmenuItem({ uri }) {
      if (!this.selected.includes(uri)) this.$store.commit({ type: 'SET_SELECT_LIST', selected: [uri] })
    },
    // 右键点击
    contextmenu() {
      this.$nextTick(this.showContextMenu)
    },
    // 显示菜单
    showContextMenu() {
      showContextmenu({
        appendItems: [
          { hide: !this.uniqueSelectedUri, label: '打开', click: () => this.dblclickItem(this.uniqueSelectedUri) },
          {
            hide: !this.isSelectedSingleFile,
            label: '在浏览器中打开',
            click: () => this.getHref() && openExternal(this.getHref()),
          },
          { hide: !this.uniqueSelectedUri, type: 'separator' },
          {
            hide: !this.uniqueSelectedUri || this.isViewDetail,
            label: '查看详细信息',
            click: () => this.getFileDetail(),
          },
          { hide: !this.isSelectedSingleFile, label: '获取链接', click: () => this.copyHref() },
          { hide: !this.isSelectedSingleItem, label: '重命名', click: () => this.renameFile() },
          { hide: !this.isSelectedSingleItem, label: '移动到...', click: () => this.moveFile() },
          { hide: !this.selected.length, label: '下载', click: () => this.downloadFile() },
          { hide: !this.selected.length, type: 'separator' },
          { hide: false, label: '刷新目录', click: () => this.refresh() },
          { hide: false, label: '新建文件夹', click: () => this.createFolder() },
          { hide: false, label: '上传文件', click: () => this.uploadFile() },
          { hide: false, label: '上传文件夹', click: () => this.uploadDirectory() },
          { hide: !this.selected.length, type: 'separator' },
          { hide: !this.selected.length, label: '删除', click: () => this.toggleShowDeleteModal(true) },
        ],
      })
    },
    // 查看详细信息
    getFileDetail(uri = this.uniqueSelectedUri) {
      this.detailLoading = true
      this.isViewDetail = true
      this.$store
        .dispatch({
          type: 'GET_FILE_DETAIL_INFO',
          uri: uri,
          basicInfo: this.findFileByUri(uri),
        })
        .then(() => {
          this.detailLoading = false
        })
    },
    getHref(uri = this.uniqueSelectedUri) {
      if (!this.baseHref) {
        Message.warning('请先设置加速域名，再进行获取链接操作')
        this.$router.push({ name: 'settings' })
        return ''
      } else {
        try {
          const urlObj = new URL(uri, this.baseHref)
          return urlObj.href
        } catch (err) {
          Message.error('请设置合法的加速域名')
          return ''
        }
      }
    },
    // 获取链接
    copyHref(uri) {
      let url = this.getHref(uri)
      if (url) {
        this.$store.commit('OPEN_FORMAT_URL_MODAL', { data: url })
      }
    },
    // 双击
    dblclickItem: function(uri) {
      if (!uri) {
        return
      }
      // 如果是文件夹,则打开目录
      if (/\/$/.test(uri)) {
        console.log('Opening folder, uri:', uri, 'is folder:', /\/$/.test(uri))
        this.$store.dispatch({ type: 'GET_LIST_DIR_INFO', remotePath: uri, action: 0 })
          .then(() => {
            this.listGetFocus()
          })
      } else {
        // 如果是图片，在浏览器中打开
        const file = this.listData.find(f => f.uri === uri)
        if (file && this.isImageFile(file)) {
          const href = this.getHref(uri)
          if (href) {
            openExternal(href)
          }
        } else {
          this.isViewDetail ? this.toggleShowViewDetail() : this.getFileDetail()
        }
      }
    },
    // 删除文件
    deleteFile() {
      const { selected } = this
      this.$store.dispatch({ type: 'DELETE_FILE', selectedPaths: selected }).then(() => {
        this.toggleShowDeleteModal()
      })
    },
    // 下载文件
    downloadFile() {
      if (!this.selected.length) return
      return downloadFileDialog().then(path => {
        if (!path) return
        this.$store.dispatch({ type: 'DOWNLOAD_FILES', downloadPath: this.selected, destPath: path })
      })
    },
    // 重命名
    renameFile() {
      if (!this.uniqueSelectedUri) return
      this.$store.commit('RENAME_FILE_SET_OLD_PATH', this.uniqueSelectedUri)
      this.$store.commit('OPEN_RENAME_FILE_MODAL')
    },
    // 移动到
    moveFile() {
      if (!this.uniqueSelectedUri) return
      this.$store.commit('MOVE_FILE_SET_OLD_PATH', this.uniqueSelectedUri)
      this.$store.commit('OPEN_MOVE_FILE_MODAL')
    },
    // 新建文件夹
    createFolder() {
      return this.$store.commit('OPEN_CREATE_FOLDER_MODAL')
    },
    // 上传文件
    uploadFile() {
      return uploadFileDialog().then(filePaths => {
        if (!filePaths || !filePaths.length) return
        return this.$store.dispatch('UPLOAD_FILES', {
          remotePath: this.currentDirPath,
          localFilePaths: filePaths,
        })
      })
    },
    // 上传文件夹
    uploadDirectory() {
      return uploadDirectoryDialog().then(folderPaths => {
        if (!folderPaths || !folderPaths.length) return
        return this.$store.dispatch('UPLOAD_FILES', {
          remotePath: this.currentDirPath,
          localFilePaths: folderPaths,
        })
      })
    },
    // 上传文件或文件夹（合并）
    uploadAll() {
      return uploadDialog().then(paths => {
        if (!paths || !paths.length) return
        return this.$store.dispatch('UPLOAD_FILES', {
          remotePath: this.currentDirPath,
          localFilePaths: paths,
        })
      })
    },
    getBasename(str = '') {
      return Path.basename(str)
    },
    getFileIconClass: getFileIconClass,
  },
  filters: {
    timestamp,
    digiUnit,
  },
}
</script>
