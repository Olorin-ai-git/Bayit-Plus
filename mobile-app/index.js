import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { playbackService } from './src/services/trackPlayerService';

AppRegistry.registerComponent('BayitPlus', () => App);

TrackPlayer.registerPlaybackService(() => playbackService);
