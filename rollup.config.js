import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import json from '@rollup/plugin-json';
import pkg from './package.json';

const extensions = [
  '.js', '.ts',
];

export default {
  input: './src/ts-schedule.ts',

  // Specify here external modules which you don't want to include in your bundle (for instance: 'lodash', 'moment' etc.)
  // https://rollupjs.org/guide/en#external-e-external
  external: [],

  plugins: [
    // Allows node_modules resolution
    resolve({ extensions }),

    // Allow bundling cjs modules. Rollup doesn't understand cjs
    commonjs(),

    // Allow parsing json files.
    json(),

    // Compile TypeScript/JavaScript files
    babel({
      extensions,
      include: ['src/**/*'],
      babelHelpers: 'runtime', 
      exclude: '**/node_modules/**',
    }),
  ],

  output: [{
  //   file: `dist/${pkg.name}.common.${pkg.version}.js`,
  //   format: 'cjs',
  // }, {
  //   file: `dist/${pkg.name}.module.${pkg.version}.js`,
  //   format: 'es',
  // }, {
    file: `build/${pkg.name}.browser.${pkg.version}.js`,
    format: 'iife',
    name: 'tsSchedule',
    sourcemap: true,

    // https://rollupjs.org/guide/en#output-globals-g-globals
    globals: {
      // "@babel/runtime/regenerator": "regeneratorRuntime",
      // "@babel/runtime/helpers/asyncToGenerator": "asyncToGenerator"
    },
  }],
};