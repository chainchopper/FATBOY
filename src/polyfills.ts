/**
 * Polyfills required by the application.
 *
 * core-js provides modern JS polyfills (Promise, Array methods, etc.).
 * regenerator-runtime supports generator/async transformations used by some compiled code.
 * zone.js is required by Angular.
 */

import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'zone.js'; // Included with Angular CLI.

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * If you need to add more polyfills, add them here.
 * For example, for IE 11 support, you might need:
 * import 'core-js/es/array';
 * import 'core-js/es/map';
 * import 'core-js/es/set';
 * import 'core-js/es/string';
 * import 'core-js/es/object';
 * import 'core-js/es/promise';
 * import 'core-js/es/symbol';
 */