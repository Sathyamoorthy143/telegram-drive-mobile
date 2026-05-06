// This must be the very first import to set up global polyfills
import './src/polyfills';

import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
