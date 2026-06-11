import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '../shared/ipcChannels'
const remoteMain = require('@electron/remote/main')

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
const winURL =
  process.env.NODE_ENV === 'development' ? `http://localhost:9080` : `file://${__dirname}/../electron/index.html`

remoteMain.initialize()

function createWindow() {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    useContentSize: true,
    height: 625,
    width: 980,
    minHeight: 525,
    minWidth: 980,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true,
    },
  })

  remoteMain.enable(mainWindow.webContents)

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC handler for dialog
ipcMain.handle(IPC_CHANNELS.SHOW_OPEN_DIALOG, async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// IPC handler for opening new window
ipcMain.handle(IPC_CHANNELS.OPEN_WINDOW, async (event, url) => {
  let child = new BrowserWindow({ parent: mainWindow, modal: true, show: false })
  child.loadURL(url)
  child.once('ready-to-show', () => {
    child.show()
  })
})

// IPC handler for context menu
ipcMain.handle(IPC_CHANNELS.SHOW_CONTEXT_MENU, async (event, items) => {
  const { Menu, MenuItem } = require('electron')
  const menu = new Menu()
  for (const menuItem of items) {
    if (!menuItem.hide) menu.append(new MenuItem(menuItem))
  }
  menu.popup(mainWindow)
})

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
