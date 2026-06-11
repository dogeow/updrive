import { ipcRenderer, shell, clipboard, webFrame, session } from 'electron'
import { app, Menu, MenuItem, BrowserWindow } from '@electron/remote'

import Router from '@/router'
import Store from '@/store'
import { externalUrls } from '@/api/tool'
import { IPC_CHANNELS } from '../../shared/ipcChannels'

// 通过 IPC 调用主进程的 dialog
const showOpenDialog = (options) => ipcRenderer.invoke(IPC_CHANNELS.SHOW_OPEN_DIALOG, options)

const userAgent = `${process.env.npm_package_build_productName}/${process.env.npm_package_version}`

// 禁止缩放
webFrame.setVisualZoomLevelLimits(1, 1)

// img 标签注入授权头
if (session) {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    {
      urls: ['*://v0.api.upyun.com/*'],
    },
    (details, callback) => {
      if (details.resourceType === 'image') {
        const authHeaders = Store.getters.upyunClient.getHeaders(details.url)
        callback({
          requestHeaders: {
            ...details.requestHeaders,
            ...authHeaders,
          },
        })
      } else {
        callback({})
      }
    },
  )
}

// 聚焦
export const winShow = () => {
  const win = getCurrentWin()
  return win ? win.show() : null
}

// 设置菜单
export const setApplicationMenu = () => {
  const menu = [
    {
      label: '文件',
      submenu: [
        {
          label: '切换账号',
          click() {
            Router.push({ name: 'login' })
            Store.dispatch('LOGOUT')
          },
        },
        {
          label: '退出',
          role: 'quit',
        },
      ],
    },
    {
      label: ' 编辑',
      submenu: [
        {
          label: '撤销',
          role: 'undo',
        },
        {
          label: '恢复',
          role: 'redo',
        },
        {
          type: 'separator',
        },
        {
          label: '复制',
          role: 'copy',
        },
        {
          label: '粘贴',
          role: 'paste',
        },
        {
          label: '剪切',
          role: 'cut',
        },
        {
          type: 'separator',
        },
        {
          label: '全选',
          role: 'selectAll',
        },
        {
          label: '删除',
          role: 'delete',
        },
      ],
    },
    {
      label: '查看',
      submenu: [
        {
          label: '刷新',
          role: 'reload',
        },
      ],
    },
    {
      label: '帮助',
      role: 'help',
      submenu: [
        {
          label: '切换开发人员工具',
          role: 'toggledevtools',
        },
        {
          label: '报告一个问题',
          click() {
            shell.openExternal(externalUrls.issues)
          },
        },
        {
          type: 'separator',
        },
        {
          label: '关于',
          click() {
            shell.openExternal(externalUrls.repository)
          },
        },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
}

export const writeText = clipboard.writeText

// 打开外部链接
export const openExternal = shell.openExternal

// 通过 IPC 调用主进程创建窗口
export const windowOpen = (url, frameName, features) => {
  ipcRenderer.invoke(IPC_CHANNELS.OPEN_WINDOW, url)
}

// 创建并显示右键菜单
export const createContextmenu = ({ appendItems } = {}) => {
  const menu = new Menu()
  const items = appendItems || []
  for (const menuItem of items) {
    if (!menuItem.hide) menu.append(new MenuItem(menuItem))
  }
  return menu
}

export const showContextmenu = (options, opts = {}) => {
  const menu = createContextmenu(options)
  menu.popup()
}

// 获取版本号 (使用 package.json 中的 version 字段)
export const getVersion = () => require('../../../package.json').version || '0.0.0'

// 获取产品名称 (使用 package.json 中的 name 字段)
export const getName = () => require('../../../package.json').name || 'updrive'

// 监听 Ctrl + A
export const listenSelectAll = (callback) => ipcRenderer.on(IPC_CHANNELS.SHORTCUT_SELECT_ALL, callback)

// 上传文件
export const uploadFileDialog = (option = {}) => {
  return showOpenDialog({
    title: '选择要上传的文件',
    buttonLabel: '上传',
    properties: ['openFile', 'multiSelections'],
    ...option,
  }).then((result) => {
    return result && result.filePaths ? result.filePaths : []
  })
}

// 上传文件夹
export const uploadDirectoryDialog = (option = {}) => {
  return showOpenDialog({
    title: '选择要上传的文件夹',
    buttonLabel: '上传',
    properties: ['openDirectory', 'createDirectory', 'multiSelections', 'showHiddenFiles'],
    ...option,
  }).then((result) => {
    return result && result.filePaths ? result.filePaths : []
  })
}

// 上传文件或文件夹（合并）
export const uploadDialog = (option = {}) => {
  return showOpenDialog({
    title: '选择要上传的文件或文件夹',
    buttonLabel: '上传',
    properties: ['openFile', 'openDirectory', 'multiSelections', 'showHiddenFiles'],
    ...option,
  }).then((result) => {
    return result && result.filePaths ? result.filePaths : []
  })
}

// 下载
export const downloadFileDialog = (option = {}) => {
  return showOpenDialog({
    title: '下载到',
    buttonLabel: '保存',
    properties: ['openDirectory', 'createDirectory', 'showHiddenFiles'],
    ...option,
  }).then((result) => {
    return result && result.filePaths && result.filePaths[0]
  })
}

export const showItemInFolder = (fullPath) => {
  return shell.showItemInFolder(fullPath)
}

export const openItem = (fullPath) => {
  return shell.openItem(fullPath)
}
