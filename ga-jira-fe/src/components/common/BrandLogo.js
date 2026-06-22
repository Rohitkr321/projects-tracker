import React from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsDarkMode } from '../../store/authSlice';

const LOGO = require('../../../assets/ga-logo-full.jpg');
const LOGO_FULL = require('../../../assets/ga-logo-full.jpg');

const BrandLogo = ({
  width = 200,
  height = 80,
  variant = 'wordmark',
  style,
}) => {
  const isDarkMode = useSelector(selectIsDarkMode);
  const size = Math.min(width, height);

  if (variant === 'sidebar') {
    return (
      <View style={[styles.sidebarLockup, { width, height }, style]}>
        <View style={styles.sidebarLogoFrame}>
          <Image
            source={LOGO_FULL}
            style={{ width: width - 42, height: Math.max(42, height - 38) }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.sidebarMeta}>
          <View style={styles.sidebarMetaDot} />
          <Text style={styles.sidebarMetaText}>GA TRACKER</Text>
        </View>
      </View>
    );
  }

  if (variant === 'mark') {
    return (
      <View style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
        <Image
          source={LOGO_FULL}
          style={{ width: size * 0.95, height: size * 0.95 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <View style={[styles.darkWrap, { width, height: height - 8, backgroundColor: isDarkMode ? '#FFFFFF' : 'transparent' }, style]}>
      <Image
        source={LOGO_FULL}
        style={{ width: width - 16, height: height - 8 }}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  markWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  darkWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  sidebarLockup: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#0F1B2F',
    borderWidth: 1,
    borderColor: '#263852',
    boxShadow: '0 14px 28px rgba(0,0,0,0.22)',
  },
  sidebarLogoFrame: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sidebarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 7,
  },
  sidebarMetaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B7AA70',
  },
  sidebarMetaText: {
    color: '#D7E7FA',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
  },
});

export default BrandLogo;
