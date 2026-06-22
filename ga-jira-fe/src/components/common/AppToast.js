import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TYPES = {
  success: { icon: 'check-circle',      color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', label: 'Success' },
  error:   { icon: 'close-circle',      color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5', label: 'Error' },
  warning: { icon: 'alert-circle',      color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', label: 'Warning' },
  info:    { icon: 'information',        color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', label: 'Info' },
  moved:   { icon: 'arrow-right-circle', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', label: 'Updated' },
};

const DURATION = 3500;

const AppToast = ({ message, type = 'success', onDone }) => {
  const translateY = useRef(new Animated.Value(-90)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;

  const cfg = TYPES[type] || TYPES.success;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220, mass: 0.8 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, { toValue: 0, duration: DURATION, useNativeDriver: false }).start();

    const id = setTimeout(dismiss, DURATION);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -90, duration: 220, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,   duration: 220, useNativeDriver: true }),
    ]).start(() => onDone?.());
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>

        {/* Icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: cfg.color + '18' }]}>
          <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        {/* Text */}
        <View style={styles.textBlock}>
          <Text style={[styles.typeLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.message} numberOfLines={2}>{message}</Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: cfg.border }]} />

        {/* Close */}
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialCommunityIcons name="close" size={15} color={cfg.color} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: cfg.border }]}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: cfg.color }]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 380,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingVertical: 12,
    paddingRight: 14,
    gap: 12,
    boxShadow: '0px 8px 30px rgba(0,0,0,0.10), 0px 2px 8px rgba(0,0,0,0.06)',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 1,
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 18,
  },
  divider: {
    width: 1,
    height: 28,
    borderRadius: 1,
    flexShrink: 0,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressTrack: {
    width: 380,
    height: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderBottomLeftRadius: 4,
  },
});

export default AppToast;
