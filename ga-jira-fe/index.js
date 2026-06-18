import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

enableScreens();

registerRootComponent(App);
