const path = require("path");
const SentryCliPlugin = require('@sentry/webpack-plugin');
const dev = false;

module.exports = {
    mode: "production",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            }
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },

    entry: {
        main: './src/client/tbc.ts',
        mini: './src/client/mini.ts',
        filter: './src/client/filterSetting.ts',
        chatsaver: '/src/client/chatSaver.ts',
        replay: '/src/client/replay.ts',
        sentryInit: '/src/client/sentryInit.ts',
    },

    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'src/public/js')
    },
    devtool: 'source-map',
    plugins: dev ? [] : [
        new SentryCliPlugin({
          ignoreFile: '.gitignore',
          ignore: ['node_modules', 'webpack.config.js'],
          configFile: 'sentry.properties',
          dryRun: false,
          release: '1.4.8',
          urlPrefix: '~/src/public/js',
          org: 'tbc-b1',
          project: 'tbc-web',
          authToken: process.env.SENTRY_AUTH_TOKEN
        }),
      ],
}