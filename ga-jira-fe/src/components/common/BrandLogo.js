import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

const LOGO = require('../../../assets/ga-logo.png');

const BrandLogo = ({
  width = 200,
  height = 80,
  variant = 'wordmark',
  tone = 'dark',
  style,
}) => {
  if (variant === 'mark') {
    const size = Math.min(width, height);
    return (
      <View style={[styles.markWrap, { width: size, height: size, borderRadius: size * 0.22 }, style]}>
        <Image
          source={LOGO}
          style={{ width: size * 0.9, height: size * 0.9 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return (
    <Image
      source={LOGO}
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  markWrap: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default BrandLogo;
