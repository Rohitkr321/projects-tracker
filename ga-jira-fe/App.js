import React from 'react';
import { StyleSheet } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import NotificationListener from './src/components/common/NotificationListener';
import { lightTheme, darkTheme } from './src/theme/theme';
import { selectIsDarkMode } from './src/store/authSlice';

const ThemedApp = () => {
  const isDarkMode = useSelector(selectIsDarkMode);
  return (
    <PaperProvider theme={isDarkMode ? darkTheme : lightTheme}>
      <NotificationListener />
      <AppNavigator />
    </PaperProvider>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <ThemedApp />
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
