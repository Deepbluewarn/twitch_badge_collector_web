const path = require("path");

module.exports = {
    mode: "development",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            // {
            //     test: /\.css$/,
            //     use: "css-loader"
            // }
        ],
    },
    resolve: {
        extensions: [".tsx", ".ts", ".js"],
    },
    entry: {
        main: "./src/client/tbc.ts",
    },
    output: {
        filename: "webpack.js",
        path: path.resolve(__dirname, "./src/public/js"),
    },
}