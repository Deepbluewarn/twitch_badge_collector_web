const path = require("path");

module.exports = {
    mode: "development",
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
        filter: './src/client/filterSetting.ts'
    },

    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'src/public/js')
    },
}