const React = require('react');

const GlassSpinner = ({ size, color, ...props }) =>
  React.createElement('div', {
    'data-testid': 'glass-spinner',
    'data-size': size,
    'data-color': color,
    ...props,
  });

module.exports = {
  GlassSpinner,
};
