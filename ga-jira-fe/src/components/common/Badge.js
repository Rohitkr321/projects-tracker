import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import PropTypes from 'prop-types';

const Badge = ({ label, color = '#0052CC', textColor = '#FFFFFF', size = 'medium', style }) => {
  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    medium: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    large: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  };

  const textSizes = {
    small: 10,
    medium: 12,
    large: 14,
  };

  return (
    <View style={[styles.badge, sizeStyles[size], { backgroundColor: color }, style]}>
      <Text style={[styles.text, { color: textColor, fontSize: textSizes[size] }]}>
        {label}
      </Text>
    </View>
  );
};

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  color: PropTypes.string,
  textColor: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0,
  },
});

export default Badge;
