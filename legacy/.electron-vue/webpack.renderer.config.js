'use strict'

process.env.BABEL_ENV = 'renderer'

const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')

const isProd = process.env.NODE_ENV === 'production'

// Only keep Electron/Node builtins external. Bundling app dependencies avoids
// runtime require() syntax errors in the Electron renderer.
const rendererExternals = [
  'electron',
  '@electron/remote',
  'vue-electron',
  'assert',
  'buffer',
  'child_process',
  'crypto',
  'events',
  'fs',
  'http',
  'https',
  'net',
  'os',
  'path',
  'stream',
  'timers',
  'url',
  'util',
  'zlib'
]

const sassLoaderOptions = {
  sassOptions: {
    quietDeps: true,
    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions']
  }
}

function cssLoaders (loaders = []) {
  return isProd
    ? [{ loader: MiniCssExtractPlugin.loader }, { loader: 'css-loader' }, ...loaders]
    : [{ loader: 'vue-style-loader' }, { loader: 'css-loader' }, ...loaders]
}

let rendererConfig = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'eval-cheap-module-source-map',
  entry: {
    renderer: path.join(__dirname, '../src/renderer/main.js')
  },
  externals: [
    ({ request }, callback) => {
      if (!request) {
        return callback()
      }

      if (rendererExternals.some((dep) => request === dep || request.startsWith(`${dep}/`))) {
        return callback(null, `commonjs ${request}`)
      }

      callback()
    }
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: cssLoaders()
      },
      {
        test: /\.scss$/,
        use: cssLoaders([{ loader: 'sass-loader', options: sassLoaderOptions }])
      },
      {
        test: /\.sass$/,
        use: cssLoaders([{
          loader: 'sass-loader',
          options: {
            ...sassLoaderOptions,
            sassOptions: {
              ...sassLoaderOptions.sassOptions,
              indentedSyntax: true
            }
          }
        }])
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.node$/,
        use: 'node-loader'
      },
      {
        test: /\.vue$/,
        use: {
          loader: 'vue-loader',
          options: {
            compiler: require('vue-template-compiler')
          }
        }
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10000
          }
        },
        generator: {
          filename: 'imgs/[name]--[hash][ext][query]'
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10000
          }
        },
        generator: {
          filename: 'media/[name]--[hash][ext][query]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10000
          }
        },
        generator: {
          filename: 'fonts/[name]--[hash][ext][query]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: path.resolve(__dirname, '../src/index.ejs'),
      minify: isProd
        ? {
            collapseWhitespace: true,
            removeAttributeQuotes: true,
            removeComments: true
          }
        : false
    })
  ],
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../dist/electron'),
    publicPath: isProd ? './' : '/',
    ...(isProd ? { library: { type: 'commonjs2' } } : {})
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src/renderer'),
      vue$: 'vue/dist/vue.esm.js'
    },
    extensions: ['.js', '.vue', '.json', '.css', '.node']
  },
  target: 'electron-renderer',
  performance: {
    hints: false
  }
}

if (!isProd) {
  rendererConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.DefinePlugin({
      __static: `"${path.join(__dirname, '../static').replace(/\\/g, '\\\\')}"`
    })
  )
}

if (isProd) {
  rendererConfig.plugins.unshift(
    new MiniCssExtractPlugin({
      filename: 'styles.css'
    })
  )
  rendererConfig.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, '../static'),
          to: path.join(__dirname, '../dist/electron/static'),
          globOptions: {
            ignore: ['**/.*']
          }
        }
      ]
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': '"production"'
    })
  )
  rendererConfig.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
}

module.exports = rendererConfig
