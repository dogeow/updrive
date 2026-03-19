<template>
  <div class="modal modal-md basic-modal is-active" v-show="modal.moveFile.show" ref="modalRoot" tabindex="1" @keyup.esc="close" @keyup.enter="submit">
    <div class="modal-background"></div>
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">移动到</span>
        <span class="modal-close-button" @click="close">
          <Icon name="icon-x" />
        </span>
      </div>
      <div class="modal-body">
        <div class="move-file-breadcrumb">
          <Breadcrumb :pathArray="pathArray" :goto="goto" />
        </div>
        <div class="move-file-folder-browser">
          <spinner v-if="isLoading" />
          <div v-else-if="folders.length" class="files-list move-file-folder-list">
            <div class="files-list-body">
              <div
                v-for="folder in folders"
                :key="folder.uri"
                class="files-list-item"
                role="button"
                tabindex="0"
                @click="openFolder(folder.uri)"
                @keyup.enter="openFolder(folder.uri)"
              >
                <div class="name file-info-item">
                  <i class="res-icon" :class="getFileIconClass(folder.filename, folder.folderType)"></i>{{ folder.filename }}
                </div>
              </div>
            </div>
          </div>
          <p v-else class="move-file-empty">当前目录下没有子文件夹</p>
        </div>
        <p class="move-file-meta">
          当前目标目录：{{ browsePath }}
        </p>
        <p class="move-file-meta">
          将移动为：{{ targetPreviewPath }}
        </p>
      </div>
      <div class="modal-footer">
        <button class="button is-primary" :class="{'is-loading': isSubmitting}" @click="submit">确认</button>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import Icon from '@/components/Icon'
import Message from '@/api/message'
import Spinner from '@/components/Spinner'
import Breadcrumb from '@/views/layout/components/Breadcrumb.vue'
import { getFileIconClass } from '@/api/tool'

export default {
  name: 'MoveFile',
  components: {
    Icon,
    Spinner,
    Breadcrumb,
  },
  data() {
    return {
      isSubmitting: false,
      isLoading: false,
      folders: [],
      browsePath: '/',
      loadToken: 0,
      sourcePath: '',
      sourceName: '',
      isFolder: false,
    }
  },
  computed: {
    ...mapState(['modal', 'auth']),
    pathArray() {
      return this.browsePath.split('/').filter(p => p && p.trim())
    },
    targetPreviewPath() {
      const dir = this.normalizeDirPath(this.browsePath)
      if (!dir || !this.sourceName) return ''
      return `${dir}${this.sourceName}${this.isFolder ? '/' : ''}`
    },
  },
  watch: {
    'modal.moveFile.oldPath': function () {
      this.initializeFromOldPath()
    },
  },
  methods: {
    getFileIconClass,
    goto(index) {
      const remotePath = index === undefined ? '/' : '/' + this.pathArray.slice(0, index + 1).join('/') + '/'
      return this.jumpTo(remotePath)
    },
    normalizeItemPath(path = '') {
      const value = path.trim()
      if (!value) return ''
      const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
      return withLeadingSlash.replace(/\/+$/, '')
    },
    normalizeDirPath(path = '') {
      const value = path.trim()
      if (!value) return ''
      const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
      return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
    },
    getParentDir(path = '') {
      const normalized = this.normalizeItemPath(path)
      if (!normalized) return '/'
      const parts = normalized.split('/').filter(Boolean)
      if (parts.length <= 1) return '/'
      return `/${parts.slice(0, -1).join('/')}/`
    },
    getItemName(path = '') {
      const normalized = this.normalizeItemPath(path)
      if (!normalized) return ''
      const parts = normalized.split('/').filter(Boolean)
      return parts.length ? parts[parts.length - 1] : ''
    },
    initializeFromOldPath() {
      const oldPath = (this.modal.moveFile.oldPath || '').trim()
      this.isFolder = /\/$/.test(oldPath)
      this.sourcePath = this.normalizeItemPath(oldPath)
      this.sourceName = this.getItemName(oldPath)
      this.browsePath = this.getParentDir(oldPath)
      this.folders = []

      if (this.modal.moveFile.show && this.sourceName) {
        this.loadFolders(this.browsePath)
      }
    },
    loadFolders(targetPath = this.browsePath) {
      const requestToken = ++this.loadToken
      this.isLoading = true
      return this.$store.getters.upyunClient
        .getListDirInfo(targetPath)
        .then((result) => {
          if (requestToken !== this.loadToken) return
          this.folders = ((result && result.data) || []).filter(item => item.folderType === 'F')
        })
        .catch((err) => {
          if (requestToken !== this.loadToken) return
          this.folders = []
          Message.error((err && err.message) || '目录加载失败')
        })
        .then(() => {
          if (requestToken === this.loadToken) {
            this.isLoading = false
          }
        })
    },
    jumpTo(targetPath = '/') {
      const nextPath = this.normalizeDirPath(targetPath)
      if (nextPath === this.browsePath) return false
      this.browsePath = nextPath
      return this.loadFolders(nextPath)
    },
    openFolder(targetPath) {
      return this.jumpTo(targetPath)
    },
    close() {
      this.$store.commit('CLOSE_MOVE_FILE_MODAL')
      this.$store.commit('MOVE_FILE_CLEAR_OLD_PATH')
    },
    submit() {
      if (this.isSubmitting) return false

      if (!this.sourcePath || !this.sourceName) {
        Message.warning('未找到要移动的对象')
        return false
      }

      const targetDir = this.normalizeDirPath(this.browsePath)
      if (!targetDir) {
        Message.warning('请选择目标目录')
        return false
      }

      if (this.isFolder && targetDir.startsWith(`${this.sourcePath}/`)) {
        Message.warning('目标目录不能在源目录内部')
        return false
      }

      const newPath = `${targetDir}${this.sourceName}`
      if (!newPath || newPath === this.sourcePath) {
        Message.warning('目标目录与当前目录相同')
        return false
      }

      this.isSubmitting = true
      this.$store
        .dispatch({
          type: 'RENAME_FILE',
          oldPath: this.modal.moveFile.oldPath,
          newPath,
          isFolder: this.isFolder,
        })
        .then(() => {
          this.isSubmitting = false
        })
        .then(() => this.close())
        .catch(() => {
          this.isSubmitting = false
        })
    },
  },
  created() {
    this.initializeFromOldPath()
    this.$nextTick(() => {
      if (this.$refs.modalRoot) {
        this.$refs.modalRoot.focus()
      }
    })
  },
}
</script>

<style scoped lang="scss">
.move-file-breadcrumb {
  margin-bottom: 10px;
  font-size: 12px;
  word-break: break-all;
}

.move-file-folder-browser {
  min-height: 300px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #dbdbdb;
  border-radius: 4px;
  background: #fff;
}

.move-file-folder-list {
  padding-top: 0;
  display: block;
  height: auto;
}

.move-file-folder-list .files-list-body {
  display: block;
}

.move-file-folder-list .files-list-item {
  display: block;
  cursor: pointer;
}

.move-file-folder-list .file-info-item {
  display: block;
  padding: 5px 10px;
}

.move-file-empty {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.move-file-meta {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
}
</style>
