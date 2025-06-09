/**
 * Defaults are provided by Plugin-CLI.
 * Use this as a place to specify your overrides, then import it into `plugin-cli.config.js` and pass it there.
 */
module.exports = {
  setupFiles: ['<rootDir>/__mocks__/matchMedia.mock.ts'],
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom/extend-expect'],
  moduleNameMapper: {
    '^@appfabric/web-shell-core/widgets/HOCWidget':
      '__mocks__/web-shell-core/widgets/HOCWidget',
    '\\.(css|scss|svg|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '__mocks__/fileMock.ts',
  },
};
