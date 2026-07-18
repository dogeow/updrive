import { contextBridge, ipcRenderer } from 'electron'
import type { AppAPI } from '../../shared/app-api'
import { IPC_CHANNELS } from '../../shared/types'
import type { AuthCredentials } from '../../shared/types'

const api: AppAPI = {
  login: (credentials: AuthCredentials) => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, credentials),
  logout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
  getSession: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION),
  listDir: (uri?: string) => ipcRenderer.invoke(IPC_CHANNELS.LIST_DIR, uri),
  createFolder: (location, folderName) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_FOLDER, location, folderName),
  deletePaths: (paths) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PATHS, paths),
  rename: (oldPath, newPath) => ipcRenderer.invoke(IPC_CHANNELS.RENAME, oldPath, newPath),
  getUsage: () => ipcRenderer.invoke(IPC_CHANNELS.GET_USAGE),
  selectFiles: () => ipcRenderer.invoke(IPC_CHANNELS.SELECT_FILES),
  selectSavePath: (defaultName) => ipcRenderer.invoke(IPC_CHANNELS.SELECT_SAVE_PATH, defaultName),
  uploadFiles: (remoteFolder, localPaths) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPLOAD_FILES, remoteFolder, localPaths),
  downloadFile: (remoteUri, localPath) =>
    ipcRenderer.invoke(IPC_CHANNELS.DOWNLOAD_FILE, remoteUri, localPath),
}

contextBridge.exposeInMainWorld('api', api)
