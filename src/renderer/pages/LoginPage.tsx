import { FormEvent, useState } from 'react'
import { useAuthStore } from '../stores/auth-store'

export default function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const [bucketName, setBucketName] = useState('')
  const [operatorName, setOperatorName] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    await login({ bucketName: bucketName.trim(), operatorName: operatorName.trim(), password })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-emerald-300">updrive</h1>
          <p className="mt-1 text-sm text-zinc-400">又拍云文件管理（Electron + Vite + React）</p>
        </div>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-300">Bucket</span>
          <input
            required
            value={bucketName}
            onChange={(e) => setBucketName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-300">Operator</span>
          <input
            required
            value={operatorName}
            onChange={(e) => setOperatorName(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-zinc-300">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {loading ? '登录中…' : '登录'}
        </button>
      </form>
    </div>
  )
}
