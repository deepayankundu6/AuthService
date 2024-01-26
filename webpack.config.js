const slsw = require('serverless-webpack');
const nodeExternal = require('webpack-node-externals');;

const config = {
    mode: 'production',
    devtool: 'source-map',
    entry: slsw.lib.entries,
    target: 'node',
    externals: [nodeExternal()],
}

exports = config;