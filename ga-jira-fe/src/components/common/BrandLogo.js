import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import colors from '../../theme/colors';

const BrandLogo = ({
  width = 220,
  height = 88,
  variant = 'wordmark',
  tone = 'dark',
  style,
}) => {
  const isLight = tone === 'light';
  const isOnDark = tone === 'onDark';
  const textColor = isLight ? '#FFFFFF' : isOnDark ? '#0E3D8B' : colors.brand.navy;
  const accent = isLight ? colors.brand.goldLight : colors.brand.gold;
  const accentDark = isLight ? colors.brand.gold : colors.brand.goldDark;

  if (variant === 'mark') {
    const size = Math.min(width, height);
    return (
      <View style={[styles.mark, { width: size, height: size, borderRadius: Math.max(6, size * 0.2) }, style]}>
        <Text
          allowFontScaling={false}
          style={[styles.markText, { fontSize: Math.max(13, size * 0.34) }]}
        >
          GA
        </Text>
        <Svg width={size * 0.82} height={size * 0.38} viewBox="0 0 128 60" style={styles.markPlane}>
          <Path
            d="M4 46 H65 L72 8 L90 39 L124 47"
            fill="none"
            stroke={colors.brand.goldLight}
            strokeWidth="7"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </Svg>
      </View>
    );
  }

  const generalSize = Math.max(18, height * 0.33);
  const aeroSize = Math.max(20, height * 0.39);
  const lineHeight = Math.max(18, height * 0.26);

  return (
    <View style={[styles.wordmark, { width, height }, style]}>
      <Text
        allowFontScaling={false}
        adjustsFontSizeToFit
        minimumFontScale={0.58}
        numberOfLines={1}
        style={[
          styles.word,
          styles.generalWord,
          { color: textColor, fontSize: generalSize, lineHeight: generalSize * 1.02 },
        ]}
      >
        General
      </Text>

      <Svg width={width} height={lineHeight} viewBox="0 0 680 78" style={styles.aircraftLine}>
        <Path
          d="M2 51 H376 L392 7 L420 13 L470 44 L678 52"
          fill="none"
          stroke={accent}
          strokeWidth="8"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <Path
          d="M2 55 H678"
          fill="none"
          stroke={accentDark}
          strokeWidth="3"
          strokeLinecap="square"
        />
      </Svg>

      <Text
        allowFontScaling={false}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        numberOfLines={1}
        style={[
          styles.word,
          styles.aeroWord,
          { color: textColor, fontSize: aeroSize, lineHeight: aeroSize * 1.02 },
        ]}
      >
        Aeronautics
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wordmark: {
    position: 'relative',
    justifyContent: 'center',
    overflow: 'visible',
  },
  word: {
    fontFamily: 'System',
    fontWeight: '900',
    letterSpacing: 0,
    includeFontPadding: false,
  },
  generalWord: {
    marginBottom: 4,
  },
  aeroWord: {
    marginTop: 8,
  },
  aircraftLine: {
    marginVertical: -2,
  },
  mark: {
    backgroundColor: colors.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.brand.gold,
  },
  markText: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 4,
  },
  markPlane: {
    position: 'absolute',
    bottom: 4,
    left: '9%',
  },
});

export default BrandLogo;
