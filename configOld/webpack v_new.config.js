// 1. Imports the 'path' module, a core Node.js module that provides utilities for working with file and directory paths.
const path = require('path');

// 2. Imports the HtmlWebpackPlugin, a plugin for Webpack that simplifies the creation of HTML files to serve your Webpack bundles.
const HtmlWebpackPlugin = require('html-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const JavaScriptObfuscator = require('webpack-obfuscator');

const lifecycleEvent = process.env.npm_lifecycle_event;

if (lifecycleEvent === 'build') {
  var isProduction = true;
} else {
  var isProduction = false;
}

console.log(isProduction)

// 3. Exports an object to be used as the configuration for Webpack.
module.exports = {

  devtool: 'cheap-module-source-map',

  //------------------------------------------------------------------------------------------------------------------------------------------------
  
  // 4. 'entry' specifies the entry point of the application, i.e., where Webpack starts the bundling process.
  entry: './src/index.js',

  //------------------------------------------------------------------------------------------------------------------------------------------------

  // 5. 'output' defines where to output the bundled files.
  output: {
    // 6. 'filename' specifies the name of the single output file for your JavaScript bundle.
    filename: 'bundle.js',

    // 7. 'path' is where the output file will be placed. '__dirname' is a Node.js global variable that gets the directory name of the current module, 
    // and 'path.resolve()' method resolves this to an absolute path. So the output directory will be 'dist' folder in the root of your project.
    path: path.resolve(__dirname, 'dist'),
    publicPath: isProduction ? './' : '/'
  },

  //------------------------------------------------------------------------------------------------------------------------------------------------

  devServer: {
    static: {
        directory: path.join(__dirname, 'dist'),  // Serve your static assets
    },
    compress: true,  // Enable gzip compression
    port: 3000,  // Specify a port number to listen on
    open: true,  // Open the browser after server has been started
    hot: true  // Enable webpack's Hot Module Replacement feature
    
  },

  //------------------------------------------------------------------------------------------------------------------------------------------------

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/i,
        type: 'asset/resource',
        generator: { filename: 'src/images/[name][ext]' },
      },
      {
        test: /\.(mp3|wav|ogg)$/i,
        type: 'asset/resource',
        generator: { filename: 'src/sounds/[name][ext]' },
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: { filename: 'src/fonts/[name][ext]' },
      },
      {
        test: /\.(glb|gltf)$/i,
        type: 'asset/resource',
        generator: { filename: 'src/models/[name][ext]' },
      },
    ]
  },

  //------------------------------------------------------------------------------------------------------------------------------------------------

  // 8. 'plugins' array where all plugins used by Webpack are included.
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'My Webpack Project',
      template: 'src/index.html',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'src/images', to: 'src/images' },
        { from: 'src/sounds', to: 'src/sounds' },
        { from: 'src/models', to: 'src/models' },
      ],
    }),
    new AssetsPlugin({
      path: path.resolve(__dirname, 'dist'),
      filename: 'assets.json',
      prettyPrint: true,
      includeAllFileTypes: false,
      fileTypes: ['js', 'css', 'png', 'jpg', 'jpeg', 'svg', 'mp3', 'wav', 'ogg', 'glb', 'gltf'],
    }),
    
    // ...(isProduction
    //   ? [
          
    //         new JavaScriptObfuscator({
    //             rotateStringArray: true,
    //             stringArray: false,
    //             stringArrayThreshold: 0.75,
    //         }),
    //     ]
    //   : []),
  ],

  //------------------------------------------------------------------------------------------------------------------------------------------------

  // 12. 'mode' sets the mode in which Webpack will run. This can be 'development', 'production', or 'none'.
  // 'development' mode optimizes the build for speed and debugging.
  
  //------------------------------------------------------------------------------------------------------------------------------------------------

  mode: 'development'
};
