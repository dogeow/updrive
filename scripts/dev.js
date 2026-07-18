import { spawn } from 'node:child_process'
import { createServer } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function startRenderer() {
  const server = await createServer({
    configFile: resolve(root, 'vite.config.renderer.ts'),
  })
  await server.listen()

  const address = server.httpServer?.address()
  const port = typeof address === 'object' && address ? address.port : 5174

  return `http://localhost:${port}`
}

function buildWatch(configFile, label) {
  return new Promise((resolvePromise) => {
    const proc = spawn('npx', ['vite', 'build', '--watch', '--config', configFile], {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    })

    let resolved = false

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      if (!resolved && text.includes('built in')) {
        resolved = true
        resolvePromise(proc)
      }
    })

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      if (text.trim()) {
        process.stderr.write(`[${label}] ${text}`)
      }
    })
  })
}

function startElectron(devServerUrl) {
  const electronPath = resolve(root, 'node_modules/.bin/electron')
  const mainPath = resolve(root, 'dist/main/index.js')

  const proc = spawn(electronPath, [mainPath], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  })

  proc.on('close', (code) => {
    process.exit(code ?? 0)
  })

  return proc
}

async function main() {
  console.log('[dev] Starting renderer...')
  const devServerUrl = await startRenderer()
  console.log(`[dev] Renderer ready at ${devServerUrl}`)

  console.log('[dev] Building preload...')
  await buildWatch(resolve(root, 'vite.config.preload.ts'), 'preload')
  console.log('[dev] Building main...')
  await buildWatch(resolve(root, 'vite.config.main.ts'), 'main')

  console.log('[dev] Starting Electron...')
  startElectron(devServerUrl)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
