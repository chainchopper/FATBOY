/**
 * Explicit PostCSS configuration (function-based plugin form).
 * Some Angular/PostCSS loaders prefer this file name and plugin format.
 */

module.exports = {
  plugins: [
    // Use the dedicated PostCSS package for Tailwind; require it so the loader gets the function
    require('@tailwindcss/postcss'),
    require('autoprefixer')
  ]
};