export const IPC_CHANNELS = {
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_GET_SESSION: 'auth:get-session',
  LIST_DIR: 'upyun:list-dir',
  CREATE_FOLDER: 'upyun:create-folder',
  DELETE_PATHS: 'upyun:delete-paths',
  RENAME: 'upyun:rename',
  GET_USAGE: 'upyun:get-usage',
  UPLOAD_FILES: 'upyun:upload-files',
  DOWNLOAD_FILE: 'upyun:download-file',
  SELECT_FILES: 'dialog:select-files',
  SELECT_SAVE_PATH: 'dialog:select-save-path',
} as const

export interface AuthCredentials {
  bucketName: string
  operatorName: string
  password: string
}

export interface AuthSession {
  bucketName: string
  operatorName: string
}

export interface UpyunFileEntry {
  filename: string
  folderType: string
  size: number
  lastModified: number
  filetype: string
  uri: string
}

export interface DirListing {
  path: string
  data: UpyunFileEntry[]
}

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }
