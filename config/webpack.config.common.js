/*
* Webpack
*/
const webpack = require('webpack');

/**
 * Some helper functions
 */
const helpers = require('./helpers');

/*
 * Webpack Plugins
 */
const OccurenceOrderPlugin = require('webpack/lib/optimize/OccurrenceOrderPlugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ContextReplacementPlugin = require('webpack/lib/ContextReplacementPlugin');
const NormalModuleReplacementPlugin = require('webpack/lib/NormalModuleReplacementPlugin');
const nodeExternals = require('webpack-node-externals');
const CheckerPlugin = require('awesome-typescript-loader').CheckerPlugin;

var path = require('path');
var fs = require('fs');

var nodeModules = {};
fs.readdirSync('node_modules')
  .filter(function (x) {
    return ['.bin'].indexOf(x) === -1;
  })
  .forEach(function (mod) {
    nodeModules[mod] = 'commonjs ' + mod;
  });


/*
 * Webpack Constants
 */
const METADATA = {
  title: 'Bebop Bridge Service',
  baseUrl: '/',
  isDevServer: helpers.isWebpackDevServer()
};

/*
 * Webpack configuration
 *
 * See: http://webpack.github.io/docs/configuration.html#cli
 */
module.exports = function (options) {

  isProd = options.env === 'production';

  return {

    /*
     * The entry point for the bundle.
     * See: http://webpack.github.io/docs/configuration.html#entry
     */
    entry: {
      'app': './src/app/main.ts'
    },

    /*
    * Ignore node built-in modules like path, fs, etc. 
    */
    target: 'node',

    /*
    * Filter out issues with native modules 'ws', 'bufferUtils' and the like.
    * http://stackoverflow.com/questions/34848555/webpack-issue-trying-to-bundle-socket-io
    */
    externals: nodeModules,

    /*
    * Exclude node_modules in webpack bundling. It is not possible to bundle all modules,
    * especially modules with binary dependencies. One which doesn't work is for example
    * socket.io-client. 
    */
    //externals: [nodeExternals()],

    /*
     * Options affecting the resolving of modules.
     * See: http://webpack.github.io/docs/configuration.html#resolve
     */
    resolve: {

      /*
       * An array of extensions that should be used to resolve modules.
       * See: http://webpack.github.io/docs/configuration.html#resolve-extensions
       */
      extensions: ['.ts', '.js', '.json'],

      // An array of directory names to be resolved to the current directory, everything else excluded (other defaults).
      modules: [helpers.root('src'), helpers.root('node_modules')],

    },

    /*
     * Options affecting the normal modules.
     *
     * See: http://webpack.github.io/docs/configuration.html#module
     */
    module: {

      rules: [

        /*
         * Typescript loader support for .ts and Angular 2 async routes via .async.ts
         * Replace templateUrl and stylesUrl with require()
         * See: https://github.com/s-panferov/awesome-typescript-loader
         * See: https://github.com/TheLarkInn/angular2-template-loader
         */
        {
          test: /\.ts$/,
          use: [
            'awesome-typescript-loader?{configFileName: "tsconfig.webpack.json"}'
          ],
          exclude: [/\.(spec|e2e)\.ts$/]
        },

        /*
         * Json loader support for *.json files.
         * See: https://github.com/webpack/json-loader
         */
        {
          test: /\.json$/,
          use: 'json-loader'
        },

      ],

    },

    /*
     * Add additional plugins to the compiler.
     *
     * See: http://webpack.github.io/docs/configuration.html#plugins
     */
    plugins: [

      /*
       * Plugin: ForkCheckerPlugin
       * Description: Do type checking in a separate process, so webpack don't need to wait.
       * See: https://github.com/s-panferov/awesome-typescript-loader#forkchecker-boolean-defaultfalse
       */
      new CheckerPlugin(),

      /*
      * Plugin: OccurenceOrderPlugin
      * Description: Varies the distribution of the ids to get the smallest id length
      * for often used ids.
      *
      * See: https://webpack.github.io/docs/list-of-plugins.html#occurrenceorderplugin
      * See: https://github.com/webpack/docs/wiki/optimization#minimize
      */
      new OccurenceOrderPlugin(true),

      /*
     * Plugin: CommonsChunkPlugin
     * Description: Shares common code between the pages.
     * It identifies common modules and put them into a commons chunk.
     *
     * See: https://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
     * See: https://github.com/webpack/docs/wiki/optimization#multi-page-app
     */
      // // This enables tree shaking of the vendor modules
      // new CommonsChunkPlugin({
      //   name: 'vendor',
      //   chunks: ['app'],
      //   minChunks: module => /node_modules\//.test(module.resource)
      // }),
      // // Specify the correct order the scripts will be injected in
      // new CommonsChunkPlugin({
      //   name: helpers.reverse(['polyfills', 'vendor'])
      // }),

      // /**
      //  * Plugin: ContextReplacementPlugin
      //  * Description: Provides context to Angular's use of System.import
      //  *
      //  * See: https://webpack.github.io/docs/list-of-plugins.html#contextreplacementplugin
      //  * See: https://github.com/angular/angular/issues/11580
      //  */
      // new ContextReplacementPlugin(
      //   // The (\\|\/) piece accounts for path separators in *nix and Windows
      //   /angular(\\|\/)core(\\|\/)src(\\|\/)linker/,
      //   helpers.root('src'), // location of your src
      //   {
      //     // your Angular Async Route paths relative to this root directory
      //   }
      // ),

      /*
       * Plugin: CopyWebpackPlugin
       * Description: Copy files and directories in webpack.
       * Copies project static assets.
       * See: https://www.npmjs.com/package/copy-webpack-plugin
       */
      new CopyWebpackPlugin([
        {
          from: 'src/assets',
          to: 'assets'
        },
        // Scripts
        {
          from: 'src/scripts/start.bat',
          to: 'start.bat'
        }
      ])

      // /*
      //  * Plugin: HtmlElementsPlugin
      //  * Description: Generate html tags based on javascript maps.
      //  *
      //  * If a publicPath is set in the webpack output configuration, it will be automatically added to
      //  * href attributes, you can disable that by adding a "=href": false property.
      //  * You can also enable it to other attribute by settings "=attName": true.
      //  *
      //  * The configuration supplied is map between a location (key) and an element definition object (value)
      //  * The location (key) is then exported to the template under then htmlElements property in webpack configuration.
      //  *
      //  * Example:
      //  *  Adding this plugin configuration
      //  *  new HtmlElementsPlugin({
      //  *    headTags: { ... }
      //  *  })
      //  *
      //  *  Means we can use it in the template like this:
      //  *  <%= webpackConfig.htmlElements.headTags %>
      //  *
      //  * Dependencies: HtmlWebpackPlugin
      //  */
      // new HtmlElementsPlugin({
      //   headTags: require('./head-config.common')
      // }),

    ],

    /*
    * Include polyfills or mocks for various node stuff
    * Description: Node configuration
    *
    * See: https://webpack.github.io/docs/configuration.html#node
    */
    node: {
      __dirname: false, // effect: __dirname actually works as expected
      __filename: false
      // global: true,
      // crypto: 'empty',
      // process: true,
      // module: false,
      // clearImmediate: false,
      // setImmediate: false
    }

  };
}
