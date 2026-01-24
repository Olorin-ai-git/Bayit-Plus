// Mock for react-native-linear-gradient
import React from 'react';

const LinearGradient = ({ children, ...props }) => {
  return React.createElement('View', props, children);
};

export default LinearGradient;
