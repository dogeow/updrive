/**
 * This file is used specifically and only for development. It installs
 * `electron-debug` & `vue-devtools`. There shouldn't be any need to
 *  modify this file, but it can be used to extend your development
 *  environment.
 */

/* eslint-disable */

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })

// Vue DevTools auto-install is disabled: the Vue 2 extension is incompatible
// with Electron 41 (service worker / manifest errors). Use built-in DevTools
// from electron-debug instead, or install Vue DevTools manually in Chrome.

// Require `main` process to boot app
require('./index')
