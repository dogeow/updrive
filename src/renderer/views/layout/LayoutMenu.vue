<template>
  <aside class="menu">
    <ul class="menu-list">
      <li>
        <router-link :to="{name: 'main'}" :class="{'is-active': currentRouteName === 'main'}">
          <Icon name="icon-files" />
          文件管理
        </router-link>
      </li>
      <li>
        <router-link :to="{name: 'upload'}" :class="{'is-active': currentRouteName === 'upload'}">
          <Icon name="icon-uploads" />
          上传列表<span v-show="uploadingNum" class="task-tag tag is-danger is-rounded">{{uploadingNum}}</span>
        </router-link>
      </li>
      <li>
        <router-link :to="{name: 'download'}" :class="{'is-active': currentRouteName === 'download'}">
          <Icon name="icon-downloads" />
          下载列表<span v-show="downloadingNum" class="task-tag tag is-danger is-rounded">{{downloadingNum}}</span>
        </router-link>
      </li>
      <li>
        <a @click.prevent="openSettings">
          <Icon name="icon-setting" />
          设置
        </a>
      </li>
    </ul>
    <div class="app-info" @click="toggleAboutmodal(true)">
      <div>{{appName}} v{{appVersion}}</div>
      <div class="app-upgrade-tip" v-show="upgradeUrl"></div>
    </div>
    <div class="modal basic-modal is-active about-modal" @click.stop="toggleAboutmodal(false)" v-show="showAboutModal" tabindex="1" @keyup.esc="toggleAboutmodal(false)">
      <div class="modal-content" @click.stop="void 0">
        <div class="modal-header">
          <span class="modal-title">关于</span>
          <span class="modal-close-button" @click.stop="toggleAboutmodal(false)">
            <Icon name="icon-x" />
          </span>
        </div>
        <div class="modal-body">
          <div class="brand-block">
            <div class="brand-img">
              <img src="../../imgs/updrive.svg" alt="updrive">
            </div>
            <div class="brand-name">
              {{appName}}
            </div>
            <div class="brand-version">
              v{{appVersion}}
            </div>
            <div>github: <a @click.prevent.stop="openExternal(externalUrls.repository)">{{externalUrls.repository}}</a></div>
            <div>历史版本下载: <a @click.prevent.stop="openExternal(externalUrls.releases)">{{externalUrls.releases}}</a></div>
          </div>
          <div class="change-logs">
            <div class="upgrade-download-tip" v-show="upgradeUrl && latestRelease && latestRelease.version">
              <span class="has-text-danger">发现新版本 v{{latestRelease && latestRelease.version}}！</span>
              <a @click.prevent.stop="openExternal(externalUrls.latest)">立即下载</a>
            </div>
            <div class="change-logs-content" v-show="upgradeData.length">
              <div>
                <article class="message is-success">
                  <div class="message-body">
                    <div class="version-message" v-for="release in upgradeData" :key="release.version">
                      <h3>v{{release.version}}</h3>
                      <ul>
                        <li v-for="(log, index) in release.change_logs" :key="index" v-if="release.change_logs">
                          {{log}}
                        </li>
                      </ul>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import os from 'os'
import semver from 'semver'

import Icon from '@/components/Icon'
import { openExternal, getVersion, getName } from '@/api/electron.js'

export default {
  name: 'LayoutMenu',
  components: {
    Icon,
  },
  data() {
    return {
      appVersion: '',
      appName: '',
      showAboutModal: false,
      upgradeUrl: '',
      latestRelease: {},
      upgradeData: [],
    }
  },
  computed: {
    uploadingNum() {
      return this.task.list.filter(file => file.status === this.task.status.uploading.value).length
    },
    downloadingNum() {
      return this.task.list.filter(file => file.status === this.task.status.downloading.value).length
    },
    currentRouteName() {
      return this.$route.name
    },
    ...mapState(['task']),
    ...mapGetters(['externalUrls']),
  },
  created() {
    this.getUsage()
    this.getAppInfo()
    this.getUpgradeInfo()
  },
  methods: {
    toggleAboutmodal(value) {
      this.showAboutModal = value !== undefined ? value : !this.showAboutModal
    },
    openExternal(href) {
      openExternal(href)
      this.isShowProfileMenu = false
    },
    openSettings() {
      this.$store.commit('OPEN_DOMAIN_SETTING_MODAL')
    },
    getUsage() {
      this.$store.dispatch('GET_USAGE')
    },
    getAppInfo() {
      this.appVersion = getVersion()
      this.appName = getName()
    },
    getUpgradeInfo() {
      const platform = os.platform() === 'darwin' || os.platform() === 'win32' ? os.platform() : 'other'
      fetch('https://raw.githubusercontent.com/dogeow/updrive/release/upgrade.json')
        .then(response => response.text())
        .then(text => {
          let data = []
          try {
            data = JSON.parse(text)
          } catch (e) {
            console.error('upgrade.json 解析失败:', e, text)
            this.upgradeData = []
            this.latestRelease = null
            this.upgradeUrl = ''
            return
          }
          this.upgradeData = data
          this.latestRelease = this.upgradeData[0]
          if (this.latestRelease && semver.lt(this.appVersion, this.latestRelease.version)) {
            this.upgradeUrl = this.latestRelease.package_urls[platform]
          }
        })
        .catch(err => {
          console.error('获取 upgrade.json 失败:', err)
          this.upgradeData = []
          this.latestRelease = null
          this.upgradeUrl = ''
        })
    },
  },
}
</script>
