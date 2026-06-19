import React from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import colors from '../../theme/colors';

const LOGO = require('../../../assets/ga-logo.png');

const BrandLogo = ({
  width = 220,
  height = 88,
  variant = 'wordmark',
  tone = 'dark',
  style,
}) => {
  const isOnDark = tone === 'onDark' || tone === 'light';

  /* ── "mark" variant: compact navy badge with GA initials ── */
  if (variant === 'mark') {
    const size = Math.min(width, height);
    return (
      <View
        style={[
          styles.mark,
          {
            width: size,
            height: size,
            borderRadius: Math.max(6, size * 0.22),
          },
          style,
        ]}
      >
        <Text allowFontScaling={false} style={[styles.markText, { fontSize: Math.max(11, size * 0.36) }]}>
          GA
        </Text>
      </View>
    );
  }

  /* ── Wordmark variant: real PNG logo ── */
  const logoW = width;
  const logoH = height;

  return (
    <Image
      source={LOGO}
      style={[{ width: logoW, height: logoH }, style]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  mark: {
    backgroundColor: colors.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.brand.gold,
  },
  markText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },

});

export default BrandLogo;
