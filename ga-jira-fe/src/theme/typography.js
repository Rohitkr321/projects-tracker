import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
});

const typography = {
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: 0,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  h4: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  h5: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  body1: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  body2: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0,
  },
  button: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0,
  },
  overline: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
};

export default typography;
