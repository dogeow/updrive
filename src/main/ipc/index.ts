import { BrowserWindow, dialog, ipcMain } from 'electron'
import { basename } from 'node:path'
import Store from 'electron-store'
import { IPC_CHANNELS, type AuthCredentials, type AuthSession, type IpcResult } from '../../../shared/types'
import { UpyunSession } from '../upyun/session'

const store = new Store<{
  lastCredentials?: AuthCredentials
}>()

let session: UpyunSession | null = null

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

function fail(error: unknown): IpcResult<never> {
  return { ok: false, error: error instanceof Error ? error.message : String(error) }
}

function requireSession(): UpyunSession {
  if (!session) {
    throw new Error('未登录')
  }
  return session
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_event, credentials: AuthCredentials) => {
    try {
      const next = new UpyunSession(credentials)
      await next.checkAuth()
      session?.close()
      session = next
      store.set('lastCredentials', credentials)
      const authSession: AuthSession = {
        bucketName: credentials.bucketName,
        operatorName: credentials.operatorName,
      }
      return ok(authSession)
    } catch (error) {
      session = null
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async () => {
    session?.close()
    session = null
    return ok(undefined)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, async () => {
    if (!session) {
      return ok(null)
    }
    return ok({
      bucketName: session.bucketName,
      operatorName: session.operatorName,
    } satisfies AuthSession)
  })

  ipcMain.handle(IPC_CHANNELS.LIST_DIR, async (_event, uri = '/') => {
    try {
      return ok(await requireSession().getListDirInfo(uri))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CREATE_FOLDER, async (_event, location: string, folderName: string) => {
    try {
      await requireSession().createFolder(location, folderName)
      return ok(undefined)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_PATHS, async (_event, paths: string[]) => {
    try {
      return ok(await requireSession().deleteFiles(paths))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.RENAME, async (_event, oldPath: string, newPath: string) => {
    try {
      return ok(await requireSession().renameFile(oldPath, newPath))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.GET_USAGE, async () => {
    try {
      return ok(await requireSession().getUsage())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_FILES, async () => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win ?? undefined!, {
        properties: ['openFile', 'multiSelections'],
      })
      if (result.canceled) {
        return ok([])
      }
      return ok(result.filePaths)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.SELECT_SAVE_PATH, async (_event, defaultName: string) => {
    try {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showSaveDialog(win ?? undefined!, {
        defaultPath: defaultName,
      })
      if (result.canceled || !result.filePath) {
        return ok(null)
      }
      return ok(result.filePath)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.UPLOAD_FILES, async (_event, remoteFolder: string, localPaths: string[]) => {
    try {
      const current = requireSession()
      const results: { filename: string; result: boolean; message?: string }[] = []
      for (const localPath of localPaths) {
        const filename = basename(localPath)
        try {
          await current.uploadLocalFile(remoteFolder, localPath)
          results.push({ filename, result: true })
        } catch (error) {
          results.push({
            filename,
            result: false,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
      return ok(results)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.DOWNLOAD_FILE, async (_event, remoteUri: string, localPath: string) => {
    try {
      await requireSession().downloadToLocal(remoteUri, localPath)
      return ok(undefined)
    } catch (error) {
      return fail(error)
    }
  })
}

export function getLastCredentials(): AuthCredentials | undefined {
  return store.get('lastCredentials')
}
