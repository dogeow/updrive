'use strict'

const chalk = require('chalk')
const electron = require('electron')
const path = require('path')
const { say } = require('cfonts')
const { spawn, execSync } = require('child_process')
const webpack = require('webpack')
const WebpackDevServer = require('webpack-dev-server')
const webpackHotMiddleware = require('webpack-hot-middleware')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const mainConfig = require('./webpack.main.config')
const rendererConfig = require('./webpack.renderer.config')

let electronProcess = null
let manualRestart = false
let hotMiddleware

function freePort (port) {
  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()

    if (!output) {
      return
    }

    output.split(/\s+/).filter(Boolean).forEach((pid) => {
      try {
        process.kill(Number(pid), 'SIGKILL')
      } catch (err) {}
    })

    console.log(chalk.yellow(`  Freed port ${port} from stale process`))
  } catch (err) {
    // port is free
  }
}

function logStats (proc, data) {
  let log = ''

  log += chalk.yellow.bold(`┏ ${proc} Process ${new Array((19 - proc.length) + 1).join('-')}`)
  log += '\n\n'

  if (typeof data === 'object') {
    data.toString({
      colors: true,
      chunks: false
    }).split(/\r?\n/).forEach(line => {
      log += '  ' + line + '\n'
    })
  } else {
    log += `  ${data}\n`
  }

  log += '\n' + chalk.yellow.bold(`┗ ${new Array(28 + 1).join('-')}`) + '\n'

  console.log(log)
}

function startRenderer () {
  return new Promise((resolve, reject) => {
    rendererConfig.entry.renderer = [path.join(__dirname, 'dev-client')].concat(rendererConfig.entry.renderer)

    const compiler = webpack(rendererConfig)
    hotMiddleware = webpackHotMiddleware(compiler, {
      log: false,
      heartbeat: 2500
    })

    compiler.hooks.compilation.tap('dev-runner-html', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).afterEmit.tapAsync('dev-runner-html', (data, cb) => {
        hotMiddleware.publish({ action: 'reload' })
        cb(null, data)
      })
    })

    compiler.hooks.done.tap('dev-runner-renderer', stats => {
      logStats('Renderer', stats)
    })

    let resolved = false
    compiler.hooks.done.tap('dev-runner-ready', () => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    })

    const server = new WebpackDevServer({
      port: 9080,
      hot: false,
      static: {
        directory: path.join(__dirname, '../')
      },
      devMiddleware: {
        publicPath: '/'
      },
      setupMiddlewares: (middlewares, devServer) => {
        devServer.app.use(hotMiddleware)
        return middlewares
      }
    }, compiler)

    server.start().catch(reject)
  })
}

function startMain () {
  return new Promise((resolve) => {
    mainConfig.entry.main = [path.join(__dirname, '../src/main/index.dev.js')].concat(mainConfig.entry.main)

    const compiler = webpack(mainConfig)

    compiler.hooks.watchRun.tapAsync('dev-runner-main', (compilation, done) => {
      logStats('Main', chalk.white.bold('compiling...'))
      hotMiddleware.publish({ action: 'compiling' })
      done()
    })

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err)
        return
      }

      logStats('Main', stats)

      if (electronProcess && electronProcess.kill) {
        manualRestart = true
        process.kill(electronProcess.pid)
        electronProcess = null
        startElectron()

        setTimeout(() => {
          manualRestart = false
        }, 5000)
      }

      resolve()
    })
  })
}

function startElectron () {
  electronProcess = spawn(electron, [path.join(__dirname, '../dist/electron/main.js')])

  electronProcess.stdout.on('data', data => {
    electronLog(data, 'blue')
  })
  electronProcess.stderr.on('data', data => {
    electronLog(data, 'red')
  })

  electronProcess.on('close', () => {
    if (!manualRestart) process.exit()
  })
}

function electronLog (data, color) {
  let log = ''
  data = data.toString().split(/\r?\n/)
  data.forEach(line => {
    log += `  ${line}\n`
  })
  if (/[0-9A-z]+/.test(log)) {
    console.log(
      chalk[color].bold('┏ Electron -------------------') +
      '\n\n' +
      log +
      chalk[color].bold('┗ ----------------------------') +
      '\n'
    )
  }
}

function greeting () {
  const cols = process.stdout.columns
  let text = ''

  if (cols > 104) text = 'electron-vue'
  else if (cols > 76) text = 'electron-|vue'
  else text = false

  if (text) {
    say(text, {
      colors: ['yellow'],
      font: 'simple3d',
      space: false
    })
  } else console.log(chalk.yellow.bold('\n  electron-vue'))
  console.log(chalk.blue('  getting ready...') + '\n')
}

function init () {
  greeting()
  freePort(9080)

  Promise.all([startRenderer(), startMain()])
    .then(() => {
      startElectron()
    })
    .catch(err => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(chalk.red('\n  Port 9080 is already in use.'))
        console.error(chalk.yellow('  Run: lsof -ti:9080 | xargs kill -9\n'))
      } else {
        console.error(err)
      }
      process.exit(1)
    })
}

init()
