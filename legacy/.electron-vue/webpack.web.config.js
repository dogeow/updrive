'use strict'

process.env.BABEL_ENV = 'web'

const path = require('path')
const webpack = require('webpack')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')

const isProd = process.env.NODE_ENV === 'production'

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

let webConfig = {
  mode: isProd ? 'production' : 'development',
  devtool: isProd ? false : 'eval-cheap-module-source-map',
  entry: {
    web: path.join(__dirname, '../src/renderer/main.js')
  },
  externals: [],
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
        include: [path.resolve(__dirname, '../src/renderer')],
        exclude: /node_modules/
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
          filename: 'imgs/[name].[hash][ext][query]'
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
          filename: 'fonts/[name].[hash][ext][query]'
        }
      }
    ]
  },
  plugins: [
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: 'styles.css'
    }),
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
    }),
    new webpack.DefinePlugin({
      'process.env.IS_WEB': 'true'
    })
  ],
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../dist/web')
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, '../src/renderer'),
      vue$: 'vue/dist/vue.esm.js'
    },
    extensions: ['.js', '.vue', '.json', '.css']
  },
  target: 'web',
  performance: {
    hints: false
  }
}

if (!isProd) {
  webConfig.plugins.push(new webpack.HotModuleReplacementPlugin())
}

if (isProd) {
  webConfig.plugins.push(
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(__dirname, '../static'),
          to: path.join(__dirname, '../dist/web/static'),
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
  webConfig.optimization = {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
}

module.exports = webConfig
