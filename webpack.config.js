/**
 * Webpack configuration for the Angular application.
 */

const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
require('dotenv').config();

module.exports = {
  plugins: [
    // The AngularComponentTagger plugin has been removed to fix build errors.
    new webpack.DefinePlugin({
      'process.env': {
        TTS_API_ENDPOINT: JSON.stringify(process.env.TTS_API_ENDPOINT),
        TTS_API_KEY: JSON.stringify(process.env.TTS_API_KEY),
        SUGGESTIONS_API_ENDPOINT: JSON.stringify(process.env.SUGGESTIONS_API_ENDPOINT),
        SUGGESTIONS_API_KEY: JSON.stringify(process.env.SUGGESTIONS_API_KEY),
        METADATA_API_ENDPOINT: JSON.stringify(process.env.METADATA_API_ENDPOINT),
        METADATA_API_KEY: JSON.stringify(process.env.METADATA_API_KEY),
        OPENAI_API_BASE_URL: JSON.stringify(process.env.OPENAI_API_BASE_URL),
        OPENAI_API_KEY: JSON.stringify(process.env.OPENAI_API_KEY),
        VISION_MODEL_NAME: JSON.stringify(process.env.VISION_MODEL_NAME),
      }
    }),
    // Copy ONNX Runtime WebAssembly files to the output directory
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/onnxruntime-web/dist/*.wasm',
          to: '[name][ext]'
        }
      ]
    })
  ]
};