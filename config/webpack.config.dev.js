
const helpers = require('./helpers');
const webpackMerge = require('webpack-merge'); // used to merge webpack configs
const commonConfig = require('./webpack.config.common.js'); // the common settings

/**
 * Webpack Plugins
 */
const DefinePlugin = require('webpack/lib/DefinePlugin');
const LoaderOptionsPlugin = require('webpack/lib/LoaderOptionsPlugin');

/**
 * Webpack Constants
 */
const ENV = process.env.NODE_ENV = process.env.ENV = 'development';
const HMR = helpers.hasProcessFlag('hot');
const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 4000;

const METADATA = webpackMerge(commonConfig({ env: ENV }).metadata, {
    host: HOST,
    PORT: PORT,
    ENV: ENV,
    HMR: HMR
});

/**
 * Webpack configuration
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function (options) {
    
    return webpackMerge(commonConfig({ env: ENV }), {

        /**
         * Developer tool to enhance debugging
         * See: http://webpack.github.io/docs/configuration.html#devtool
         * See: https://github.com/webpack/docs/wiki/build-performance#sourcemaps
         */
        //devtool: 'cheap-module-source-map',
        devtool: 'source-map',

        /**
         * Options affecting the output of the compilation.
         * See: http://webpack.github.io/docs/configuration.html#output
         */
        output: {

            /**
             * The output directory as absolute path (required).
             *
             * See: http://webpack.github.io/docs/configuration.html#output-path
             */
            path: helpers.root('dist'),

            /**
             * Specifies the name of each output file on disk.
             * IMPORTANT: You must not specify an absolute path here!
             * See: http://webpack.github.io/docs/configuration.html#output-filename
             */
            filename: '[name].js',

            /**
             * The filename of the SourceMaps for the JavaScript files.
             * They are inside the output.path directory.
             * See: http://webpack.github.io/docs/configuration.html#output-sourcemapfilename
             */
            sourceMapFilename: '[name].map'
        },

        plugins: [

            /**
             * Plugin: DefinePlugin
             * Description: Define free variables.
             * Useful for having development builds with debug logging or adding global constants.
             *
             * Environment helpers
             *
             * See: https://webpack.github.io/docs/list-of-plugins.html#defineplugin
             */
            // NOTE: when adding more properties, make sure you include them in custom-typings.d.ts
            // new DefinePlugin({
            //     'ENV': JSON.stringify(METADATA.ENV),
            //     'HMR': METADATA.HMR,
            //     'process.env': {
            //         'PORT' : JSON.stringify(METADATA.ENV),
            //         'ENV': JSON.stringify(METADATA.ENV),
            //         'NODE_ENV': JSON.stringify(METADATA.ENV),
            //         'HMR': METADATA.HMR,
            //     }
            // })

        ],

    });
}

