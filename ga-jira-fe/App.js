import React, { useEffect } from 'react';
import { StyleSheet, Platform } from 'react-native';
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

// Inject global scrollbar styles (web only)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'ga-scrollbar-global';
  style.textContent = `
    /* Global scrollbar — uses CSS var so project screens can override */
    :root {
      --scrollbar-thumb: #2F6EB7;
      --scrollbar-thumb-hover: #062B6F;
      --scrollbar-track: transparent;
    }
    * {
      scrollbar-width: thin;
      scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
    }
    ::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    ::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }
    ::-webkit-scrollbar-corner {
      background: transparent;
    }
  `;
  document.head.appendChild(style);
}

const ThemedApp = () => {
  const isDarkMode = useSelector(selectIsDarkMode);

  // Update global scrollbar defaults when dark mode changes
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDarkMode) {
      root.style.setProperty('--scrollbar-thumb', '#2F6EB780');
      root.style.setProperty('--scrollbar-thumb-hover', '#2F6EB7');
    } else {
      root.style.setProperty('--scrollbar-thumb', '#2F6EB780');
      root.style.setProperty('--scrollbar-thumb-hover', '#062B6F');
    }
  }, [isDarkMode]);

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
