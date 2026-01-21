import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    json(),
    resolve({
      preferBuiltins: true,
      browser: false
    }),
    commonjs({
      transformMixedEsModules: true,
      sourceMap: false
    }),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: true,
      declarationMap: true,
      outDir: 'dist'
    })
  ],
  external: [
    '@types/node',
    'firebase-functions',
    'firebase-admin',
    // Externalize problematic dependencies that cause warnings
    '@opentelemetry/api',
    '@protobufjs/inquire',
    'readable-stream',
    'async'
  ],
  // Suppress warnings for known issues in dependencies
  onwarn(warning, warn) {
    // Ignore circular dependency warnings in node_modules and logging module
    if (warning.code === 'CIRCULAR_DEPENDENCY' &&
        (warning.message.includes('node_modules') || warning.message.includes('../logging/'))) {
      return;
    }

    // Ignore eval warnings in dependencies
    if (warning.code === 'EVAL' && warning.id && warning.id.includes('node_modules')) {
      return;
    }

    // Ignore "this is undefined" warnings in dependencies
    if (warning.code === 'THIS_IS_UNDEFINED' && warning.id && warning.id.includes('node_modules')) {
      return;
    }

    // Show other warnings
    warn(warning);
  }
};
