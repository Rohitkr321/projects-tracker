import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import PropTypes from 'prop-types';
import { getStatusColor } from '../../utils/helpers';
import { STATUS_LABELS } from '../../constants';

const LIGHT_BG_COLORS = ['#DFE1E6', '#6B7280', '#97A0AF'];

const StatusBadge = ({ status, size = 'medium', style }) => {
  // status can be a WorkflowStatus object {name, color, ...} or a legacy string key
  const isObject = status && typeof status === 'object';
  const statusName = isObject ? (status.name || '') : (status || '');
  const color = isObject
    ? (status.color || getStatusColor('todo'))
    : getStatusColor(status);
  const label = isObject ? statusName : (STATUS_LABELS[status] || status);

  const isLight = LIGHT_BG_COLORS.includes(color) || (!isObject && ['todo', 'cancelled'].includes(status));
  const textColor = isLight ? '#172B4D' : '#FFFFFF';

  const sizes = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10, borderRadius: 4 },
    medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, borderRadius: 4 },
    large: { paddingHorizontal: 10, paddingVertical: 5, fontSize: 13, borderRadius: 6 },
  };

  const sizeStyle = sizes[size] || sizes.medium;
  const isTodo = isObject ? status.category === 'todo' : status === 'todo';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          borderRadius: sizeStyle.borderRadius,
        },
        isTodo && styles.todoBorder,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: textColor,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start' },
  todoBorder: { borderWidth: 1, borderColor: '#C1C7D0' },
  text: { fontWeight: '600', letterSpacing: 0 },
});

export default StatusBadge;
