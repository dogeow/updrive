<template>
  <section class="hero is-fullheight is-dark is-bold">
    <div class="hero-body">
      <div class="container">
        <div class="columns is-centered">
          <div :class="contentColumnClass">
            <div class="box login-box">
              <template v-if="historyLoaded">
                <header class="login-header">
                  <div>
                    <p class="login-eyebrow">欢迎使用</p>
                    <h1 class="login-title">{{ hasAuthHistory ? '账号历史' : '登录账号' }}</h1>
                    <p class="login-subtitle" v-if="hasAuthHistory">选择一个已保存账号快速登录，或新建一个账号。</p>
                  </div>
                  <div v-if="hasAuthHistory">
                    <button type="button" class="button is-primary is-light" @click="toggleCreateForm">
                      {{ showCreateForm ? '收起' : '新建账号' }}
                    </button>
                  </div>
                </header>

                <div v-if="hasAuthHistory">
                  <section class="panel-card create-panel" v-if="showCreateForm">
                    <div class="create-panel-header">
                      <h2 class="panel-title">新建账号</h2>
                    </div>
                    <form @submit.prevent="submit" class="login-form login-form-inline" novalidate>
                      <div class="columns is-variable is-3 form-row">
                        <div class="column">
                          <div class="field">
                            <label class="label">服务名</label>
                            <p class="control">
                              <input class="input" type="text" v-model.trim="bucketName" placeholder="服务名称">
                            </p>
                          </div>
                        </div>
                        <div class="column">
                          <div class="field">
                            <label class="label">操作员</label>
                            <p class="control">
                              <input class="input" type="text" v-model.trim="operatorName" placeholder="操作员账号">
                            </p>
                          </div>
                        </div>
                        <div class="column">
                          <div class="field">
                            <label class="label">密码</label>
                            <p class="control">
                              <input class="input" type="password" v-model.trim="password" placeholder="操作员密码">
                            </p>
                          </div>
                        </div>
                      </div>
                      <div class="create-panel-actions">
                        <label class="checkbox">
                          <input type="checkbox" v-model="rememberMe"> 记住账号
                        </label>
                        <div class="action-buttons">
                          <button type="button" class="button" @click="toggleCreateForm">取消</button>
                          <button type="submit" class="button is-primary">登录</button>
                        </div>
                      </div>
                    </form>
                  </section>

                  <section class="panel-card">
                    <ul class="menu-list account-history-list">
                      <li v-for="record in authHistoryList" :key="record.key">
                        <a class="record" @click="selectRecord(record)">
                          <span class="record-key">{{ record.key }}</span>
                          <span class="record-delete" @click.stop="deleteRecord(record)">删除</span>
                        </a>
                      </li>
                    </ul>
                  </section>
                </div>

                <section v-else class="panel-card panel-card-standalone">
                  <form @submit.prevent="submit" class="login-form" novalidate>
                    <div class="field">
                      <label class="label">服务名</label>
                      <p class="control">
                        <input class="input" type="text" v-model.trim="bucketName" placeholder="服务名称">
                      </p>
                    </div>
                    <div class="field">
                      <label class="label">操作员</label>
                      <p class="control">
                        <input class="input" type="text" v-model.trim="operatorName" placeholder="操作员账号">
                      </p>
                    </div>
                    <div class="field">
                      <label class="label">密码</label>
                      <p class="control">
                        <input class="input" type="password" v-model.trim="password" placeholder="操作员密码">
                      </p>
                    </div>
                    <div class="field">
                      <div class="control">
                        <label class="checkbox">
                          <input type="checkbox" v-model="rememberMe"> 记住账号
                        </label>
                      </div>
                    </div>
                    <button type="submit" class="button is-primary is-fullwidth">登录</button>
                  </form>
                </section>
              </template>

              <div v-else class="loading-state">加载中...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <confirm-modal
      title="是否删除该账号记录？"
      :show="showDeleteConfirm"
      @confirm="confirmDeleteRecord"
      @close="closeDeleteConfirm"
    >
      <p>确定要删除「{{ pendingDeleteRecord && pendingDeleteRecord.key }}」吗？</p>
      <p class="has-text-weight-bold" style="margin-top: 1em;">删除后将无法从历史记录中快速登录。</p>
    </confirm-modal>
  </section>
</template>

<script>
import { mapState } from 'vuex'

import { errorHandler } from '@/api/tool.js'
import ConfirmModal from '@/components/ConfirmModal'
import Message from '@/api/message'

export default {
  name: 'login',
  components: {
    ConfirmModal,
  },
  data() {
    return {
      bucketName: '',
      operatorName: '',
      password: '',
      rememberMe: true,
      authHistoryList: [],
      historyLoaded: false,
      pendingDeleteRecord: null,
      showCreateForm: false,
      showDeleteConfirm: false,
    }
  },
  computed: {
    user() {
      return this.auth.user
    },
    hasAuthHistory() {
      return this.authHistoryList.length > 0
    },
    contentColumnClass() {
      return this.hasAuthHistory ? 'column is-8-desktop is-10-tablet' : 'column is-5-desktop is-6-tablet'
    },
    ...mapState(['auth']),
  },
  methods: {
    resetForm() {
      this.bucketName = ''
      this.operatorName = ''
      this.password = ''
      this.rememberMe = true
    },
    toggleCreateForm() {
      this.showCreateForm = !this.showCreateForm
      if (this.showCreateForm) {
        this.resetForm()
      }
    },
    validateCredentials(bucketName, operatorName, password) {
      if (!bucketName) {
        Message.warning('请输入服务名')
        return false
      }
      if (!operatorName) {
        Message.warning('请输入操作员账号')
        return false
      }
      if (!password) {
        Message.warning('请输入操作员密码')
        return false
      }
      return true
    },
    submit() {
      if (!this.validateCredentials(this.bucketName, this.operatorName, this.password)) {
        return Promise.resolve(false)
      }
      return this.signIn(this.bucketName, this.operatorName, this.password).then(() => {
        if (this.rememberMe) {
          this.user.save()
        }
      })
    },
    signIn(bucketName, operatorName, password) {
      return this.$store
        .dispatch({
          type: 'VERIFICATION_ACCOUNT',
          bucketName,
          operatorName,
          password,
        })
        .then(() => {
          this.$router.push({
            name: 'main',
          })
        })
        .catch(errorHandler)
    },
    selectRecord(record) {
      this.signIn(record.bucketName, record.operatorName, record.password)
    },
    deleteRecord(record) {
      this.pendingDeleteRecord = record
      this.showDeleteConfirm = true
    },
    closeDeleteConfirm() {
      this.showDeleteConfirm = false
      this.pendingDeleteRecord = null
    },
    confirmDeleteRecord() {
      if (!this.pendingDeleteRecord) {
        return this.closeDeleteConfirm()
      }
      return this.user.deleteAuthHistory(this.pendingDeleteRecord.key).then(() => {
        this.closeDeleteConfirm()
        return this.getList()
      })
    },
    getList() {
      return this.user
        .getAuthHistory()
        .then(data => {
          this.authHistoryList = data.data
          this.showCreateForm = this.authHistoryList.length === 0
        })
        .catch(() => {
          this.authHistoryList = []
          this.showCreateForm = true
        })
        .then(() => {
          this.historyLoaded = true
        })
    },
  },
  created() {
    this.getList()
  },
}
</script>

<style lang="scss" scoped>
.login-box {
  padding: 28px;
}

.login-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.login-eyebrow {
  margin-bottom: 6px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7a7a7a;
}

.login-title {
  margin-bottom: 6px;
  font-size: 28px;
  font-weight: 700;
  color: #222;
}

.login-subtitle {
  color: #666;
}

.panel-card {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 16px;
  background: #fafbfc;
}

.create-panel {
  margin-bottom: 16px;
}

.panel-card-standalone {
  max-width: 440px;
}

.create-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.create-panel-header .panel-title {
  margin-bottom: 0;
}

.panel-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.login-form-inline .field {
  margin-bottom: 0;
}

.form-row {
  margin-bottom: 12px;
}

.create-panel-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.account-history-list {
  margin: 0;
}

.account-history-list li + li {
  margin-top: 8px;
}

.record {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #edf0f2;
}

.record-key {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-delete {
  flex: none;
  color: #e74c3c;
  font-size: 13px;
}

.loading-state {
  padding: 28px 0;
  text-align: center;
  color: #666;
}

@media (max-width: 768px) {
  .login-box {
    padding: 22px;
  }

  .login-header {
    flex-direction: column;
    align-items: stretch;
  }

  .create-panel-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    width: 100%;
  }

  .action-buttons .button {
    flex: 1;
  }

  .panel-card-standalone {
    max-width: none;
  }
}
</style>
