import React, { useState, useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TYPES = {
  success: { icon: 'check-circle',     color: '#10B981', light: '#ECFDF5', border: '#A7F3D0' },
  error:   { icon: 'alert-circle',     color: '#EF4444', light: '#FEF2F2', border: '#FECACA' },
  warning: { icon: 'alert',            color: '#F59E0B', light: '#FFFBEB', border: '#FDE68A' },
  info:    { icon: 'information',      color: '#3B82F6', light: '#EFF6FF', border: '#BFDBFE' },
  moved:   { icon: 'arrow-right-circle', color: '#7C3AED', light: '#F5F3FF', border: '#DDD6FE' },
};

const DURATION = 3200;

/**
 * AppToast – modern slide-up notification banner
 *
 * Props:
 *   message  {string}   – text to display
 *   type     {string}   – 'success' | 'error' | 'warning' | 'info' | 'moved'  (default: 'success')
 *   onDone   {function} – called after the toast exits
 */
const AppToast = ({ message, type = 'success', onDone }) => {
  const translateY = useRef(new Animated.Value(-72)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const progress   = useRef(new Animated.Value(1)).current;

  const cfg = TYPES[type] || TYPES.success;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 180 }),
      Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    // Progress bar shrink
    Animated.timing(progress, {
      toValue: 0, duration: DURATION, useNativeDriver: false,
    }).start();

    // Slide out after delay
    const id = setTimeout(() => dismiss(), DURATION);
    return () => clearTimeout(id);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -72, duration: 260, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,  duration: 260, useNativeDriver: true }),
    ]).start(() => onDone?.());
  };

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.wrapper, { opacity, transform: [{ translateY }] }]}>
      <View style={[styles.toast, { backgroundColor: cfg.light, borderColor: cfg.border }]}>
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: cfg.color + '18' }]}>
          <MaterialCommunityIcons name={cfg.icon} size={17} color={cfg.color} />
        </View>

        {/* Message */}
        <Text style={styles.message} numberOfLines={2}>{message}</Text>

        {/* Close */}
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialCommunityIcons name="close" size={14} color="#94A3B8" />
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
    position: 'absolute', top: 20, left: 24,
    zIndex: 9999, minWidth: 280, maxWidth: 360,
    borderRadius: 12, overflow: 'hidden',
    boxShadow: '0px 8px 24px rgba(0,0,0,0.12), 0px 2px 6px rgba(0,0,0,0.08)',
  },
  toast: {
    flexDirection: 'row', alignItems: 'center',
    paddingRight: 12, paddingVertical: 13,
    borderWidth: 1, borderBottomWidth: 0,
    borderTopLeftRadius: 12, borderTopRightRadius: 12,
    gap: 10,
  },
  accentBar: {
    width: 4, alignSelf: 'stretch',
    borderTopLeftRadius: 12,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1, fontSize: 13, fontWeight: '600',
    color: '#1E293B', lineHeight: 18,
  },
  closeBtn: {
    width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  progressTrack: {
    height: 3, width: '100%',
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
  },
  progressFill: {
    height: '100%',
    borderBottomLeftRadius: 12,
  },
});

export default AppToast;
