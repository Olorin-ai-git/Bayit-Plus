module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  env: {
    test: {
      plugins: [function importMetaEnvironment({ types }) {
        return {
          visitor: {
            UnaryExpression(path) {
              const { operator, argument } = path.node;
              if (operator === 'typeof' && types.isMetaProperty(argument) &&
                  argument.meta.name === 'import' && argument.property.name === 'meta') {
                path.replaceWith(types.stringLiteral('object'));
              }
            },
            MemberExpression(path) {
              const { object, property, computed } = path.node;
              if (types.isMetaProperty(object) &&
                  object.meta.name === 'import' && object.property.name === 'meta' &&
                  ((!computed && types.isIdentifier(property, { name: 'env' })) ||
                   (computed && types.isStringLiteral(property, { value: 'env' })))) {
                path.replaceWith(types.memberExpression(
                  types.identifier('process'), types.identifier('env'),
                ));
              }
            },
          },
        };
      }],
    },
  },
  plugins: [
    'babel-plugin-react-native-web',
  ],
};
