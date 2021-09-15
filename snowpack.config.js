// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig} */
export default {
  root: "src",
  mount: {

  },
  plugins: [
    [
      '@snowpack/plugin-babel', {
        input: ['.ts'],
        transformOptions: {
          presets: [
            '@babel/preset-typescript',
            '@babel/preset-env',
          ],
          plugins: [
            "@babel/transform-runtime",
          ]          
        },
      },
    ],
  ],
  packageOptions: {
    // tried to create a custom named output file, but this doesn't work.
    // rollup: {
    //   output: {
    //     file: `dist/${pkg.name}.browser.${pkg.version}.js`
    //   },
    // },

    knownEntrypoints: [
      '@babel/runtime/helpers/typeof',
      '@babel/runtime/helpers/asyncToGenerator',
      '@babel/runtime/regenerator'
    ],
  },
  devOptions: {
    port: 3000,
    sourcemap: true,
  },
  buildOptions: {
    out: 'build',
  },
  optimize: {
    bundle: true,
    minify: true,
    // target: 'es5',
    sourcemap: true,
  },
}
