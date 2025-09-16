/**
 * CommonJS PostCSS configuration favored by some Angular toolchains.
 * This file explicitly requires the new @tailwindcss/postcss plugin (Tailwind v4).
 */
module.exports = {
  plugins: [
    require('@tailwindcss/postcss'),
    require('autoprefixer')
  ]
};