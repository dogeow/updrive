import { useCallback, useEffect, useMemo, useState } from 'react'
import type { UpyunFileEntry } from '@shared/types'
import { useAuthStore } from '../stores/auth-store'

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function BrowserPage() {
  const session = useAuthStore((s) => s.session)
  const logout = useAuthStore((s) => s.logout)
  const [path, setPath] = useState('/')
  const [entries, setEntries] = useState<UpyunFileEntry[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [usage, setUsage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const crumbs = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    const items = [{ label: '根目录', uri: '/' }]
    let current = '/'
    for (const part of parts) {
      current = `${current}${part}/`
      items.push({ label: part, uri: current })
    }
    return items
  }, [path])

  const refresh = useCallback(async (uri = path) => {
    setBusy(true)
    setError(null)
    const [listResult, usageResult] = await Promise.all([window.api.listDir(uri), window.api.getUsage()])
    setBusy(false)
    if (!listResult.ok) {
      setError(listResult.error)
      return
    }
    setPath(listResult.data.path)
    setEntries(listResult.data.data)
    setSelected([])
    if (usageResult.ok) {
      setUsage(usageResult.data)
    }
  }, [path])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setBusy(true)
      setError(null)
      const [listResult, usageResult] = await Promise.all([
        window.api.listDir('/'),
        window.api.getUsage(),
      ])
      if (cancelled) return
      setBusy(false)
      if (!listResult.ok) {
        setError(listResult.error)
        return
      }
      setPath(listResult.data.path)
      setEntries(listResult.data.data)
      setSelected([])
      if (usageResult.ok) {
        setUsage(usageResult.data)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const openEntry = async (entry: UpyunFileEntry) => {
    if (entry.folderType === 'F') {
      await refresh(entry.uri)
    }
  }

  const toggleSelect = (uri: string) => {
    setSelected((prev) => (prev.includes(uri) ? prev.filter((item) => item !== uri) : [...prev, uri]))
  }

  const createFolder = async () => {
    const name = window.prompt('新建文件夹名称')
    if (!name?.trim()) return
    const result = await window.api.createFolder(path, name.trim())
    if (!result.ok) {
      setError(result.error)
      return
    }
    await refresh(path)
  }

  const deleteSelected = async () => {
    if (!selected.length) return
    if (!window.confirm(`确认删除 ${selected.length} 项？`)) return
    const result = await window.api.deletePaths(selected)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await refresh(path)
  }

  const upload = async () => {
    const pick = await window.api.selectFiles()
    if (!pick.ok || !pick.data.length) return
    setBusy(true)
    const result = await window.api.uploadFiles(path, pick.data)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await refresh(path)
  }

  const downloadSelected = async () => {
    const file = entries.find((entry) => selected.includes(entry.uri) && entry.folderType !== 'F')
    if (!file) {
      setError('请先选择一个文件')
      return
    }
    const save = await window.api.selectSavePath(file.filename)
    if (!save.ok || !save.data) return
    setBusy(true)
    const result = await window.api.downloadFile(file.uri, save.data)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div>
          <div className="text-sm font-medium text-emerald-300">
            {session?.bucketName} / {session?.operatorName}
          </div>
          <div className="text-xs text-zinc-500">
            用量：{usage == null ? '—' : formatSize(usage)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800"
        >
          退出
        </button>
      </header>

      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2 text-sm">
        {crumbs.map((crumb, index) => (
          <button
            key={crumb.uri}
            type="button"
            onClick={() => void refresh(crumb.uri)}
            className="text-zinc-300 hover:text-emerald-300"
          >
            {index > 0 ? <span className="mr-2 text-zinc-600">/</span> : null}
            {crumb.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => void refresh(path)} className="rounded-md bg-zinc-800 px-3 py-1.5">
            刷新
          </button>
          <button type="button" onClick={() => void createFolder()} className="rounded-md bg-zinc-800 px-3 py-1.5">
            新建文件夹
          </button>
          <button type="button" onClick={() => void upload()} className="rounded-md bg-emerald-700 px-3 py-1.5">
            上传
          </button>
          <button type="button" onClick={() => void downloadSelected()} className="rounded-md bg-zinc-800 px-3 py-1.5">
            下载
          </button>
          <button type="button" onClick={() => void deleteSelected()} className="rounded-md bg-rose-800 px-3 py-1.5">
            删除
          </button>
        </div>
      </div>

      {error ? <div className="bg-rose-950 px-4 py-2 text-sm text-rose-300">{error}</div> : null}
      {busy ? <div className="bg-zinc-900 px-4 py-1 text-xs text-zinc-400">处理中…</div> : null}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-zinc-900 text-zinc-400">
            <tr>
              <th className="w-10 px-4 py-2" />
              <th className="px-4 py-2">名称</th>
              <th className="px-4 py-2">类型</th>
              <th className="px-4 py-2">大小</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.uri}
                className="border-t border-zinc-900 hover:bg-zinc-900/70"
                onDoubleClick={() => void openEntry(entry)}
              >
                <td className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(entry.uri)}
                    onChange={() => toggleSelect(entry.uri)}
                  />
                </td>
                <td className="px-4 py-2">
                  <button type="button" className="text-left hover:text-emerald-300" onClick={() => void openEntry(entry)}>
                    {entry.folderType === 'F' ? '📁 ' : '📄 '}
                    {entry.filename}
                  </button>
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {entry.folderType === 'F' ? '文件夹' : entry.filetype || '文件'}
                </td>
                <td className="px-4 py-2 text-zinc-400">
                  {entry.folderType === 'F' ? '—' : formatSize(entry.size)}
                </td>
              </tr>
            ))}
            {!entries.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                  空目录
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
