import React from 'react';
import { AppRegistry, View, Text } from 'react-native';

const App = () => {
  return React.createElement(
    View,
    { style: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' } },
    React.createElement(
      Text,
      { style: { color: '#fff', fontSize: 24 } },
      'BayitPlus Mobile'
    )
  );
};

AppRegistry.registerComponent('BayitPlus', () => App);

export default App;
