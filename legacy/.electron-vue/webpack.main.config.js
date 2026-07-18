'use strict'

process.env.BABEL_ENV = 'main'

const path = require('path')
const { dependencies } = require('../package.json')
const webpack = require('webpack')
const TerserPlugin = require('terser-webpack-plugin')

const isProd = process.env.NODE_ENV === 'production'

const dependencyNames = Object.keys(dependencies || {})
const devExternals = [
  'electron-debug',
  'electron-devtools-installer'
]

function createMainExternals () {
  const externalNames = [...dependencyNames, ...(!isProd ? devExternals : [])]

  return [
    ({ request }, callback) => {
      if (!request) {
        return callback()
      }

      if (externalNames.some((dep) => request === dep || request.startsWith(`${dep}/`))) {
        return callback(null, `commonjs ${request}`)
      }

      callback()
    }
  ]
}

let mainConfig = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'source-map',
  entry: {
    main: path.join(__dirname, '../src/main/index.js')
  },
  externals: createMainExternals(),
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      }
    ]
  },
  output: {
    filename: '[name].js',
    library: {
      type: 'commonjs2'
    },
    path: path.join(__dirname, '../dist/electron')
  },
  plugins: [],
  resolve: {
    extensions: ['.js', '.json', '.node']
  },
  target: 'electron-main',
  performance: {
    hints: false
  }
}

if (!isProd) {
  mainConfig.plugins.push(
    new webpack.DefinePlugin({
      '__static': `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
}

if (isProd) {
  mainConfig.plugins.push(
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    })
  )
  mainConfig.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
}

module.exports = mainConfig
