const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

// Check if we're running in analyze mode
const isAnalyze = process.env.npm_lifecycle_script && process.env.npm_lifecycle_script.includes('--stats-json');

module.exports = {
  optimization: {
    runtimeChunk: 'single',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            pure_funcs: process.env.NODE_ENV === 'production' ? ['console.log', 'console.debug'] : []
          },
          mangle: {
            safari10: true
          }
        },
        extractComments: false
      }),
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 20000,
      cacheGroups: {
        // Main vendor bundle
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get npm package name
            const packageName = module.context.match(
              /[\\/]node_modules[\\/](.*?)([\\/]|$)/
            )[1];
            return `npm.${packageName.replace('@', '')}`;
          },
          priority: -10
        },
        // Angular Material bundle
        material: {
          test: /[\\/]node_modules[\\/]@angular[\\/]material[\\/]/,
          name: 'material',
          priority: 10
        },
        // Firebase bundle
        firebase: {
          test: /[\\/]node_modules[\\/]firebase[\\/]/,
          name: 'firebase-core',
          priority: 10
        },
        // Firebase utils
        firebaseUtils: {
          test: /[\\/]node_modules[\\/]@firebase[\\/]/,
          name: 'firebase-utils',
          priority: 9
        },
        // Angular common modules
        angularCommon: {
          test: /[\\/]node_modules[\\/]@angular[\\/](?!material)/,
          name: 'angular-common',
          priority: 8
        }
      }
    }
  },
  plugins: [
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg|txt|eot|otf|ttf|gif|png)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    // Only include BundleAnalyzerPlugin during analysis
    ...(isAnalyze ? [new BundleAnalyzerPlugin()] : [])
  ]
};
