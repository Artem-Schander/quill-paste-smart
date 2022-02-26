const path = require('path');

const config = {
  entry: './src/module.js',
  output: {
    filename: 'quill-paste-smart.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'QuillPasteSmart',
    libraryTarget: 'umd',
  },
  optimization: {
    minimize: true,
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
          },
        },
      },
    ],
  },
};

module.exports = config;
