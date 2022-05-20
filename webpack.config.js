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
            url: 'https://sentry.bluewarn.dev/',
            ignoreFile: '.gitignore',
            ignore: ['node_modules', 'webpack.config.js'],
            configFile: 'sentry.properties',
            dryRun: false,
            release: '1.4.10',
            urlPrefix: '~/src/public/js',
            org: 'bluewarn',
            project: 'twitch-badge-collector',
            authToken: process.env.SENTRY_AUTH_TOKEN
        }),
    ],
}