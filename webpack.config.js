const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries");
const DependencyExtractionWebpackPlugin = require("@wordpress/dependency-extraction-webpack-plugin");
const CircularDependencyPlugin = require("circular-dependency-plugin");

// Separate JavaScript and CSS entries
const jsEntries = {
  "js/acf-escaped-html-notice": "./assets/src/js/acf-escaped-html-notice.js",
  "js/acf-field-group": "./assets/src/js/acf-field-group.js",
  "js/acf-input": "./assets/src/js/acf-input.js",
  "js/acf-internal-post-type": "./assets/src/js/acf-internal-post-type.js",
  "js/acf": "./assets/src/js/acf.js",
  "js/pro/acf-pro-blocks": "./assets/src/js/pro/acf-pro-blocks.js",
  "js/pro/acf-pro-field-group": "./assets/src/js/pro/acf-pro-field-group.js",
  "js/pro/acf-pro-input": "./assets/src/js/pro/acf-pro-input.js",
  "js/pro/acf-pro-ui-options-page":
    "./assets/src/js/pro/acf-pro-ui-options-page.js",
  "js/scf-bindings": "./assets/src/js/scf-bindings.js",
};

const cssEntries = {
  "css/acf-dark": "./assets/src/sass/acf-dark.scss",
  "css/acf-field-group": "./assets/src/sass/acf-field-group.scss",
  "css/acf-global": "./assets/src/sass/acf-global.scss",
  "css/acf-input": "./assets/src/sass/acf-input.scss",
  "css/pro/acf-pro-field-group":
    "./assets/src/sass/pro/acf-pro-field-group.scss",
  "css/pro/acf-pro-input": "./assets/src/sass/pro/acf-pro-input.scss",
};

// Common configuration for both builds
const commonConfig = {
  output: {
    path: path.resolve(__dirname, "assets/build/"),
  },
  resolve: {
    extensions: [".js", ".jsx"],
    alias: {
      "@wordpress/blocks": path.resolve(
        __dirname,
        "node_modules/@wordpress/blocks"
      ),
      "@wordpress/dom-ready": path.resolve(
        __dirname,
        "node_modules/@wordpress/dom-ready"
      ),
    },
    fallback: {
      path: require.resolve("path-browserify"),
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      url: require.resolve("url/"),
      zlib: require.resolve("browserify-zlib"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      assert: require.resolve("assert/"),
      os: require.resolve("os-browserify/browser"),
      buffer: require.resolve("buffer/"),
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-react"],
            plugins: [
              [
                "@babel/plugin-transform-runtime",
                {
                  regenerator: true,
                  useESModules: true,
                },
              ],
            ],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              url: false,
            },
          },
          "sass-loader",
        ],
      },
    ],
  },
  optimization: {
    moduleIds: "deterministic",
    chunkIds: "deterministic",
    runtimeChunk: "single",
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
        },
      },
    },
  },
};

// Unminified build
const unminifiedConfig = {
  ...commonConfig,
  entry: {
    ...jsEntries,
    ...cssEntries,
  },
  mode: "development",
  output: {
    ...commonConfig.output,
    filename: "[name].js",
  },
  devtool: "source-map",
  optimization: {
    minimize: false,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
      allowAsyncCycles: false,
    }),
  ],
};

// Minified build
const minifiedConfig = {
  ...commonConfig,
  entry: {
    ...jsEntries,
    ...cssEntries,
  },
  mode: "production",
  output: {
    ...commonConfig.output,
    filename: "[name].min.js",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new DependencyExtractionWebpackPlugin({
      injectPolyfill: true,
      useCombinedAssetFile: true,
    }),
    new MiniCssExtractPlugin({
      filename: "[name].min.css",
    }),
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
      allowAsyncCycles: false,
    }),
  ],
};

// Export both configurations
module.exports = [unminifiedConfig, minifiedConfig];
