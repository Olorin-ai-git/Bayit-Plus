import { AppRegistry, View, Text, ErrorBoundary } from 'react-native';
import React from 'react';

class ErrorFallback extends React.Component {
  render() {
    return React.createElement(
      View,
      { style: { flex: 1, backgroundColor: '#FFFF00', justifyContent: 'center', alignItems: 'center', padding: 20 } },
      React.createElement(Text, { style: { color: '#FF0000', fontSize: 20, fontWeight: 'bold', marginBottom: 10 } }, 'ERROR'),
      React.createElement(Text, { style: { color: '#000000', fontSize: 14 } }, this.props.error?.toString() || 'Unknown error')
    );
  }
}

class App extends React.Component {
  render() {
    try {
      return React.createElement(
        View,
        { style: { flex: 1, backgroundColor: '#FF0000' } },
        React.createElement(Text, { style: { color: '#FFFF00', fontSize: 40, fontWeight: 'bold', marginTop: 100, textAlign: 'center' } }, 'BAYITPLUS'),
        React.createElement(Text, { style: { color: '#00FF00', fontSize: 20, textAlign: 'center', marginTop: 20 } }, 'App is Running!')
      );
    } catch (error) {
      return React.createElement(ErrorFallback, { error });
    }
  }
}

AppRegistry.registerComponent('BayitPlus', () => App);
