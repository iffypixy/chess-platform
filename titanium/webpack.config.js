const path = require("path");
const webpack = require("webpack");
const dotenv = require("dotenv");
const HTMLWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const TSConfigPathsWebpackPlugin = require("tsconfig-paths-webpack-plugin");
const ESLintWebpackPlugin = require("eslint-webpack-plugin");
const BundleAnalyzerWebpackPlugin =
  require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = ({env}) => {
  const isDev = env === "development";
  const isProd = !isDev;

  const vars = dotenv.config({path: `.env.${env}`}).parsed;

  const config = Object.keys(vars).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(vars[next]);
    return prev;
  }, {});

  return {
    mode: env,
    entry: path.resolve(__dirname, "./src/index.tsx"),
    output: {
      path: path.resolve(__dirname, "./build"),
      filename: "[contenthash].bundle.js",
      clean: true,
      publicPath: "/",
    },
    optimization: {
      minimize: isProd,
      splitChunks: {
        chunks: "all",
      },
      runtimeChunk: true,
    },
    resolve: {
      extensions: [".js", ".ts", ".tsx"],
      plugins: [new TSConfigPathsWebpackPlugin()],
    },
    plugins: [
      new HTMLWebpackPlugin({
        template: path.resolve(__dirname, "./public/index.html"),
      }),
      new ForkTsCheckerWebpackPlugin({
        async: true,
      }),
      new ESLintWebpackPlugin({
        extensions: ["js", "ts", "tsx"],
        emitWarning: false,
      }),
      new BundleAnalyzerWebpackPlugin({
        analyzerMode: false,
      }),
      new webpack.DefinePlugin(config),
    ],
    module: {
      rules: [
        {
          test: /\.js/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.(ts|js)x?$/,

          use: [
            {
              loader: "babel-loader",
            },
          ],
        },
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            "style-loader",
            "css-loader",
            {
              loader: "resolve-url-loader",
              options: {
                debug: isDev,
                silent: isDev,
                root: path.resolve(__dirname, "./src"),
              },
            },
            {
              loader: "sass-loader",
              options: {
                implementation: require("sass"),
              },
            },
          ],
        },
        {
          test: /\.(?:ico|gif|png|jpg|jpeg)$/,
          type: "asset/resource",
        },
        {
          test: /\.(woff(2)?|eot|ttf|otf|svg)$/,
          type: "asset/inline",
        },
      ],
    },
    devtool: isDev && "eval",
    devServer: {
      hot: true,
      port: 3000,
      historyApiFallback: true,
    },
    stats: "errors-warnings",
  };
};
