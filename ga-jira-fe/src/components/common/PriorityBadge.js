import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
import { getPriorityColor, getPriorityIcon } from '../../utils/helpers';
import { PRIORITY_LABELS } from '../../constants';

const PriorityBadge = ({ priority, showLabel = true, size = 'medium', style }) => {
  const color = getPriorityColor(priority);
  const icon = getPriorityIcon(priority);
  const label = PRIORITY_LABELS[priority] || priority;

  const iconSizes = { small: 12, medium: 14, large: 18 };
  const textSizes = { small: 10, medium: 12, large: 14 };

  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon} size={iconSizes[size]} color={color} />
      {showLabel && (
        <Text style={[styles.label, { color, fontSize: textSizes[size] }]}>
          {label}
        </Text>
      )}
    </View>
  );
};

PriorityBadge.propTypes = {
  priority: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '500',
  },
});

export default PriorityBadge;
