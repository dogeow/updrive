import Vue from 'vue'
import iviewCSS from 'iview/dist/styles/iview.css'
import balloonCss from 'balloon-css/balloon.css'

import App from '@/App'
import Router from '@/router'
import Store from '@/store'

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.config.productionTip = false

window.addEventListener('beforeunload', () => {
  try {
    const client = Store.getters.upyunClient
    if (client && client.ftp && typeof client.ftp.close === 'function') {
      client.ftp.close()
    }
  } catch (err) {}
})

/* eslint-disable no-new */
new Vue({
  components: { App },
  router: Router,
  store: Store,
  template: '<App/>',
}).$mount('#app')
