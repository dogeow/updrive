<template>
  <div class="settings-page">
    <div class="settings-container">
      <h1 class="settings-title">设置</h1>

      <div class="settings-section">
        <h2 class="section-title">文件浏览</h2>
        <div class="setting-item">
          <label class="checkbox">
            <input type="checkbox" v-model="loadFolderCover" @change="saveSettings">
            在缩略图模式下加载文件夹封面图片
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h2 class="section-title">加速域名</h2>
        <div class="setting-item">
          <input
            class="input"
            :class="{'is-danger': isDomainInvalid}"
            type="text"
            v-model="domain"
            placeholder="请输入加速域名（包含 http:// 或 https://）"
          >
          <p class="help is-danger" v-if="isDomainInvalid">请输入包含 http:// 或 https:// 的正确的域名</p>
        </div>
        <button class="button is-primary" @click="saveDomain" :disabled="!domain">保存</button>
        <hr>
        <article class="message">
          <div class="message-body">
            <p>获取链接之前，需要指定一个加速域名用来生成链接（包含 http:// 或 https://）。你可以通过访问<a class="message-link" title="点击查看加速域名" @click="openExternal(externalUrls.domain)">又拍云控制台</a>查看你绑定的加速域名。</p>
            <p>在 2017-10-26 前创建的服务绑定的默认的加速域名的格式：<code>http://{yourBucketName}.b0.upaiyun.com</code></p>
            <p>新创建的服务绑定的默认的加速域名的格式：<code>http://{yourBucketName}.test.upcdn.net</code></p>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { path } from 'ramda'
import Message from '@/api/message.js'
import { openExternal } from '@/api/electron.js'

export default {
  name: 'Settings',
  data() {
    return {
      domain: '',
      isDomainInvalid: false,
      loadFolderCover: true,
    }
  },
  computed: {
    ...mapState(['profile']),
    ...mapGetters(['externalUrls']),
  },
  created() {
    this.loadSettings()
  },
  methods: {
    loadSettings() {
      this.domain = path(['data', 'domain'], this.profile) || ''
      this.loadFolderCover = path(['data', 'loadFolderCover'], this.profile) !== false
    },
    saveSettings() {
      this.$store.dispatch('SET_PROFILE_STORE', {
        data: {
          loadFolderCover: this.loadFolderCover,
        },
      })
    },
    saveDomain() {
      if (!this.domain) return

      try {
        new URL(this.domain)
        this.isDomainInvalid = false
      } catch (err) {
        this.isDomainInvalid = true
        return
      }

      this.$store.dispatch('SET_PROFILE_STORE', {
        data: {
          domain: this.domain,
        },
      }).then(() => {
        Message.success('保存成功')
      })
    },
    openExternal(url) {
      openExternal(url)
    },
  },
}
</script>

<style lang="scss" scoped>
.settings-page {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.settings-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 24px;
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
}

.setting-item {
  margin-bottom: 16px;

  .checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .input {
    width: 100%;
    max-width: 400px;
    margin-bottom: 8px;
  }
}

.button {
  margin-top: 8px;
}
</style>
