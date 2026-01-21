import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

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
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json',
      declaration: true,
      declarationMap: true,
      outDir: 'dist'
    })
  ],
  external: [
    '@cvplus/core',
    '@cvplus/auth',
    '@cvplus/multimedia',
    '@cvplus/premium',
    'firebase',
    'firebase-admin',
    'react',
    'react-dom',
    'react-helmet-async',
    'qrcode',
    'jsdom',
    'cheerio',
    'helmet',
    'express-rate-limit',
    'node-cache',
    'validator',
    'slug',
    'mime-types'
  ]
};