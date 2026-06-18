import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';

const MetricCard = ({ title, value, subtitle, icon, color, onPress, trend, style }) => {
  const theme = useTheme();
  const trendIcon = trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : 'trending-neutral';
  const trendColor = trend > 0 ? theme.colors.error : trend < 0 ? '#00875A' : theme.colors.onSurfaceVariant;

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper onPress={onPress} activeOpacity={0.8} style={[styles.wrapper, style]}>
      <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
        <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text variant="labelMedium" style={[styles.title, { color: theme.colors.onSurfaceVariant }]}>
          {title}
        </Text>
        <Text variant="headlineMedium" style={[styles.value, { color: theme.colors.onSurface }]}>
          {value}
        </Text>
        <View style={styles.footer}>
          {subtitle && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          )}
          {trend !== undefined && (
            <View style={styles.trend}>
              <MaterialCommunityIcons name={trendIcon} size={14} color={trendColor} />
              <Text variant="labelSmall" style={{ color: trendColor }}>
                {Math.abs(trend)}%
              </Text>
            </View>
          )}
        </View>
      </Surface>
    </CardWrapper>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  onPress: PropTypes.func,
  trend: PropTypes.number,
  style: PropTypes.object,
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  card: { borderRadius: 8, padding: 16, gap: 4, borderWidth: 1, minHeight: 132 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { marginBottom: 2 },
  value: { fontWeight: '700', marginBottom: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

export default MetricCard;
