const path = require('path');

const config = {
    entry: {
        index: './src/index.js',
        module: './src/module.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
        library: 'QuillPasteSmart',
        libraryTarget: 'umd',
        umdNamedDefine: true,
    },
    target: 'web',
    mode: 'production',
    externals: {
        quill: {
            commonjs: 'quill',
            commonjs2: 'quill',
            amd: 'quill',
            root: 'Quill',
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: [path.resolve(__dirname, 'src/')],
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env', { modules: false }]],
                        plugins: ['@babel/plugin-proposal-class-properties'],
                    },
                },
            },
        ],
    },
};

module.exports = config;
