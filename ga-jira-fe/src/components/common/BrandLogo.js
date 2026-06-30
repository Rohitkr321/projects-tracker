import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

const BAR_COLORS = ['#60A5FA', '#6BA4F8', '#7B8EF5', '#8B7AF0', '#8B5CF6'];

const CadenceLogoMark = ({ height = 28, style }) => {
  const bH = [height * 0.36, height * 0.64, height, height * 0.64, height * 0.36];
  const bW = Math.max(4, height * 0.18);
  const gap = Math.max(3, height * 0.14);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap }, style]}>
      {bH.map((h, i) => (
        <View
          key={i}
          style={{ width: bW, height: h, borderRadius: bW / 2, backgroundColor: BAR_COLORS[i] }}
        />
      ))}
    </View>
  );
};

const BrandLogo = ({ width = 200, height = 80, variant = 'wordmark', style }) => {
  const markH = Math.min(36, height * 0.42);

  if (variant === 'sidebar') {
    return (
      <View style={[styles.sidebarLockup, { width, height }, style]}>
        <View style={styles.sidebarLogoFrame}>
          <CadenceLogoMark height={markH} />
          <Text style={styles.sidebarWordmark}>Cadence</Text>
        </View>
        <View style={styles.sidebarMeta}>
          <View style={styles.sidebarMetaDot} />
          <Text style={styles.sidebarMetaText}>PROJECT PLATFORM</Text>
        </View>
      </View>
    );
  }

  if (variant === 'mark') {
    const sz = Math.min(width, height);
    return (
      <View style={[styles.markWrap, { width: sz, height: sz, borderRadius: sz * 0.22 }, style]}>
        <CadenceLogoMark height={sz * 0.48} />
      </View>
    );
  }

  return (
    <View style={[styles.wordmarkWrap, { width, height }, style]}>
      <CadenceLogoMark height={Math.min(28, height * 0.44)} />
      <Text style={[styles.wordmarkText, { fontSize: Math.max(16, height * 0.28) }]}>Cadence</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  markWrap: {
    backgroundColor: '#0D1B36',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  wordmarkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmarkText: {
    fontWeight: '900',
    letterSpacing: -0.5,
    color: '#F1F5F9',
  },
  sidebarLockup: {
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#0D1B36',
    borderWidth: 1,
    borderColor: '#1E3358',
  },
  sidebarLogoFrame: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#0A1528',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
    padding: 10,
  },
  sidebarWordmark: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  sidebarMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 7,
  },
  sidebarMetaDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#60A5FA',
  },
  sidebarMetaText: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default BrandLogo;
