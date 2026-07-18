import type {
  AuthCredentials,
  AuthSession,
  DirListing,
  IpcResult,
} from './types'

export interface AppAPI {
  login: (credentials: AuthCredentials) => Promise<IpcResult<AuthSession>>
  logout: () => Promise<IpcResult<void>>
  getSession: () => Promise<IpcResult<AuthSession | null>>
  listDir: (uri?: string) => Promise<IpcResult<DirListing>>
  createFolder: (location: string, folderName: string) => Promise<IpcResult<void>>
  deletePaths: (paths: string[]) => Promise<IpcResult<{ uri: string; result: boolean; message?: string }[]>>
  rename: (oldPath: string, newPath: string) => Promise<IpcResult<string>>
  getUsage: () => Promise<IpcResult<number>>
  selectFiles: () => Promise<IpcResult<string[]>>
  selectSavePath: (defaultName: string) => Promise<IpcResult<string | null>>
  uploadFiles: (remoteFolder: string, localPaths: string[]) => Promise<IpcResult<{ filename: string; result: boolean; message?: string }[]>>
  downloadFile: (remoteUri: string, localPath: string) => Promise<IpcResult<void>>
}

declare global {
  interface Window {
    api: AppAPI
  }
}

export {}
