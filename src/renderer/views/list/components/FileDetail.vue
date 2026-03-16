<template>
  <div class="list-view-detail" v-show="isViewDetail">
    <div class="list-view-detail-header">
      <div>
        <h4 :title="fileDetail.basicInfo.filename">
          <i class="res-icon" :class="getFileIconClass(fileDetail.basicInfo.filename, fileDetail.basicInfo.folderType)"></i>
          {{fileDetail.basicInfo.filename}}
        </h4>
      </div>
      <div class="separate-line-wrap">
        <div class="separate-line"></div>
      </div>
      <span class="list-view-detail-close" @click="$emit('close-detail')">
        <Icon name="icon-x" />
      </span>
    </div>
    <div class="list-view-detail-content" v-if="fileDetail.basicInfo.folderType !== 'B'">
      <spinner v-if="detailLoading" />
      <div v-if="!detailLoading">
        <div v-if="fileDetail.fileType === 'image'" class="image-preview">
          <img :src="getUpyunApiUrl(fileDetail.basicInfo.uri)" alt="">
        </div>
        <div class="list-view-detail-content-item">
          <div class="list-view-detail-content-item-label">添加日期</div>
          <div class="list-view-detail-content-item-value">{{fileDetail.basicInfo.lastModified | timestamp}}</div>
        </div>
        <div class="list-view-detail-content-item" v-if="fileDetail.basicInfo.folderType !== 'F'">
          <div class="list-view-detail-content-item-label">大小</div>
          <div class="list-view-detail-content-item-value">{{(fileDetail.basicInfo.folderType === 'F' ? '-' : fileDetail.basicInfo.size) | digiUnit}}</div>
        </div>
        <div class="list-view-detail-content-item" v-if="fileDetail.basicInfo.folderType !== 'F'">
          <div class="list-view-detail-content-item-label">链接</div>
          <div class="list-view-detail-content-item-value">
            <div class="field has-addons" v-if="baseHref">
              <p class="control is-expanded">
                <input class="input" type="text" :value="baseHref && getHref(fileDetail.basicInfo.uri)" readonly />
              </p>
              <p class="control"
                data-balloon="点击复制"
                data-balloon-pos="left"
                @click="$emit('copy-href', fileDetail.basicInfo.href)"
              >
                <a class="button">
                  <i class="icon"><Icon name="icon-copy" /></i>
                </a>
              </p>
            </div>
            <a @click.prevent="$emit('open-domain-setting')" v-if="!baseHref">设置加速域名</a>
          </div>
        </div>
        <div class="list-view-detail-content-item" v-if="fileDetail.basicInfo.folderType !== 'F'">
          <div class="list-view-detail-content-item-label">Response Headers</div>
          <div class="list-view-detail-content-item-value head-request-info">
            <div v-for="(value, key) in fileDetail.headerInfo" :key="key">
              <span style="font-weight:bold">{{key}} →&nbsp;&nbsp;</span>{{value}}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from '@/components/Icon'
import Spinner from '@/components/Spinner'
import { timestamp, digiUnit } from '@/api/tool'

export default {
  name: 'FileDetail',
  components: { Icon, Spinner },
  props: {
    isViewDetail: Boolean,
    fileDetail: Object,
    detailLoading: Boolean,
    baseHref: String,
    getUpyunApiUrl: Function,
    getHref: Function,
    getFileIconClass: Function,
  },
  filters: {
    timestamp,
    digiUnit,
  },
}
</script>
