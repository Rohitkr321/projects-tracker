import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

// SecureStore keys cannot contain '@' — strip it
const sanitizeKey = (key) => key.replace(/@/g, '');

const getItem = async (key) => {
  const k = sanitizeKey(key);
  if (Platform.OS === 'web') return localStorage.getItem(k);
  return SecureStore.getItemAsync(k);
};

const setItem = async (key, value) => {
  const k = sanitizeKey(key);
  if (value === null || value === undefined) return;
  const strValue = typeof value === 'string' ? value : JSON.stringify(value);
  if (Platform.OS === 'web') { localStorage.setItem(k, strValue); return; }
  return SecureStore.setItemAsync(k, strValue);
};

const removeItem = async (key) => {
  const k = sanitizeKey(key);
  if (Platform.OS === 'web') { localStorage.removeItem(k); return; }
  return SecureStore.deleteItemAsync(k);
};

export const storage = {
  async getAccessToken() {
    try { return await getItem(STORAGE_KEYS.ACCESS_TOKEN); }
    catch (error) { console.error('Error getting access token:', error); return null; }
  },

  async setAccessToken(token) {
    try { await setItem(STORAGE_KEYS.ACCESS_TOKEN, token); }
    catch (error) { console.error('Error setting access token:', error); }
  },

  async getRefreshToken() {
    try { return await getItem(STORAGE_KEYS.REFRESH_TOKEN); }
    catch (error) { console.error('Error getting refresh token:', error); return null; }
  },

  async setRefreshToken(token) {
    try { await setItem(STORAGE_KEYS.REFRESH_TOKEN, token); }
    catch (error) { console.error('Error setting refresh token:', error); }
  },

  async getUser() {
    try {
      const userJson = await getItem(STORAGE_KEYS.USER);
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) { console.error('Error getting user:', error); return null; }
  },

  async setUser(user) {
    try { await setItem(STORAGE_KEYS.USER, JSON.stringify(user)); }
    catch (error) { console.error('Error setting user:', error); }
  },

  async getTheme() {
    try { return await getItem(STORAGE_KEYS.THEME); }
    catch (error) { console.error('Error getting theme:', error); return null; }
  },

  async setTheme(theme) {
    try { await setItem(STORAGE_KEYS.THEME, theme); }
    catch (error) { console.error('Error setting theme:', error); }
  },

  async clearAll() {
    try {
      await Promise.all([
        removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        removeItem(STORAGE_KEYS.USER),
      ]);
    } catch (error) { console.error('Error clearing storage:', error); }
  },

  async setTokens({ accessToken, refreshToken }) {
    try {
      await Promise.all([
        setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      ]);
    } catch (error) { console.error('Error setting tokens:', error); }
  },
};
