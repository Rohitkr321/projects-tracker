import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, TextInput, HelperText, useTheme } from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLoginMutation, useChallenge2faMutation } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const NAVY  = '#0D1B36';
const GOLD  = '#60A5FA';
const PANEL = '#0A1528';
const BAR_COLORS = ['#60A5FA', '#6BA4F8', '#7B8EF5', '#8B7AF0', '#8B5CF6'];

const validationSchema = Yup.object().shape({
  email:    Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'At least 6 characters').required('Password is required'),
});

const FEATURES = [
  { icon: 'rocket-launch-outline',    title: 'Sprint Management',  desc: 'Plan, start and ship sprints on schedule' },
  { icon: 'chart-gantt',              title: 'Issue Tracking',     desc: 'Bugs, tasks and stories in one board' },
  { icon: 'account-multiple-outline', title: 'Team Collaboration', desc: 'Real-time updates and notifications' },
];

const STATS = [
  { value: 'Cadence',  label: 'Project Platform' },
  { value: 'RBAC',     label: 'Access Control'     },
  { value: 'Live',     label: 'Real-Time Sync'     },
];

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { login } = useAuth();
  const [loginMutation, { isLoading }]       = useLoginMutation();
  const [challenge2fa, { isLoading: verifying }] = useChallenge2faMutation();
  const [showPassword, setShowPassword]      = useState(false);
  const [serverError, setServerError]        = useState('');
  const [twoFactorStep, setTwoFactorStep]    = useState(false);
  const [tempToken, setTempToken]            = useState('');
  const [otpCode, setOtpCode]                = useState('');

  const handleLogin = async (values) => {
    setServerError('');
    try {
      const result = await loginMutation(values).unwrap();
      if (result.data?.requiresTwoFactor) {
        setTempToken(result.data.tempToken);
        setTwoFactorStep(true);
      } else {
        await login(result.data);
      }
    } catch (err) {
      setServerError(err?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleVerify2fa = async () => {
    if (!otpCode.trim()) return;
    setServerError('');
    try {
      const result = await challenge2fa({ tempToken, code: otpCode.trim() }).unwrap();
      await login(result.data);
    } catch (err) {
      setServerError(err?.data?.message || 'Invalid code. Please try again.');
      setOtpCode('');
    }
  };

  const bg = theme.dark ? theme.colors.background : '#EFF3F9';

  return (
    <View style={styles.root}>

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <View style={styles.leftPanel}>
        {/* Subtle background circles for depth */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        <View style={styles.bgCircle3} />

        {/* ── Logo card ── */}
        <View style={styles.logoCard}>
          <View style={styles.logoInner}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginBottom: 14 }}>
              {[12, 22, 32, 22, 12].map((h, i) => (
                <View key={i} style={{ width: 7, height: h, borderRadius: 3.5, backgroundColor: BAR_COLORS[i] }} />
              ))}
            </View>
            <Text style={styles.logoBrandName}>Cadence</Text>
          </View>
          <View style={styles.logoOrgBadge}>
            <View style={styles.logoBadgeDot} />
            <Text style={styles.logoOrgText}>PROJECT PLATFORM</Text>
            <View style={styles.logoBadgeDot} />
          </View>
        </View>

        {/* ── Accent rule ── */}
        <View style={styles.goldRule} />

        {/* ── Tagline ── */}
        <Text style={styles.tagline}>
          The project platform built{'\n'}for your entire organization.
        </Text>

        {/* ── Feature list ── */}
        <View style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <MaterialCommunityIcons name={f.icon} size={16} color={GOLD} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Stats bar ── */}
        <View style={styles.statsBar}>
          {STATS.map((s, i) => (
            <View key={i} style={[styles.statItem, i < STATS.length - 1 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.copyright}>© 2026 Cadence</Text>
      </View>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <View style={[styles.rightPanel, { backgroundColor: bg }]}>

        <View style={styles.formWrap}>
          <Text style={[styles.formHeading, { color: theme.colors.onSurface }]}>
            {twoFactorStep ? 'Two-Factor Auth' : 'Welcome back'}
          </Text>
          <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {twoFactorStep
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your Cadence workspace'}
          </Text>

          {/* ── 2FA challenge card ── */}
          {twoFactorStep && (
            <View style={[styles.formCard, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.dark ? theme.colors.outlineVariant : '#DDE4EE',
            }]}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: NAVY + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={28} color={NAVY} />
                </View>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 15 }}>Verification required</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                  Open your authenticator app and enter the code shown
                </Text>
              </View>

              <TextInput
                label="6-digit code"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={8}
                mode="outlined"
                left={<TextInput.Icon icon="numeric" />}
                style={[styles.input, { letterSpacing: 8, fontSize: 20, textAlign: 'center' }]}
                onSubmitEditing={handleVerify2fa}
                autoFocus
              />

              {!!serverError && (
                <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer, marginTop: 12 }]}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.error} />
                  <Text variant="bodySmall" style={{ color: theme.colors.error, flex: 1 }}>{serverError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handleVerify2fa}
                disabled={verifying || !otpCode.trim()}
                style={[styles.submitBtn, { marginTop: 20, opacity: (verifying || !otpCode.trim()) ? 0.6 : 1 }]}
              >
                <Text style={styles.submitBtnText}>{verifying ? 'Verifying…' : 'Verify'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setTwoFactorStep(false); setOtpCode(''); setServerError(''); }} style={{ alignItems: 'center', marginTop: 16 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>← Back to login</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Main login card ── */}
          {!twoFactorStep && <View style={[styles.formCard, {
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark ? theme.colors.outlineVariant : '#DDE4EE',
          }]}>
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={validationSchema}
              onSubmit={handleLogin}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <>
                  <TextInput
                    label="Email address"
                    value={values.email}
                    onChangeText={handleChange('email')}
                    onBlur={handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    mode="outlined"
                    left={<TextInput.Icon icon="email-outline" />}
                    error={touched.email && !!errors.email}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={touched.email && !!errors.email}>
                    {errors.email}
                  </HelperText>

                  <TextInput
                    label="Password"
                    value={values.password}
                    onChangeText={handleChange('password')}
                    onBlur={handleBlur('password')}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    mode="outlined"
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={
                      <TextInput.Icon
                        icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        onPress={() => setShowPassword(v => !v)}
                      />
                    }
                    error={touched.password && !!errors.password}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={touched.password && !!errors.password}>
                    {errors.password}
                  </HelperText>

                  {!!serverError && (
                    <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.error} />
                      <Text variant="bodySmall" style={{ color: theme.colors.error, flex: 1 }}>{serverError}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotBtn}
                  >
                    <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '600' }}>Forgot Password?</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isLoading}
                    style={[styles.submitBtn, isLoading && { opacity: 0.72 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.submitBtnText}>{isLoading ? 'Signing in…' : 'Sign In'}</Text>
                      {!isLoading && <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={[styles.divLine, { backgroundColor: theme.colors.outlineVariant }]} />
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, paddingHorizontal: 10 }}>or</Text>
                    <View style={[styles.divLine, { backgroundColor: theme.colors.outlineVariant }]} />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                      Don't have an account?{'  '}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                      <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 13 }}>Register with invite</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Formik>
          </View>}

          {!twoFactorStep && (
            <View style={styles.secFooter}>
              <MaterialCommunityIcons name="shield-lock-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginLeft: 5 }}>
                Protected by enterprise-grade security · AES-256
              </Text>
            </View>
          )}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  /* ── Left panel ── */
  leftPanel: {
    width: 440,
    backgroundColor: PANEL,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingVertical: 40,
    gap: 24,
  },

  /* Background depth circles */
  bgCircle1: {
    position: 'absolute', top: -120, right: -120,
    width: 380, height: 380, borderRadius: 190,
    backgroundColor: 'rgba(15,37,87,0.5)',
  },
  bgCircle2: {
    position: 'absolute', bottom: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: 'rgba(183,170,112,0.06)',
  },
  bgCircle3: {
    position: 'absolute', top: '45%', left: '60%',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 1, borderColor: 'rgba(183,170,112,0.10)',
    backgroundColor: 'transparent',
  },

  /* Logo card — floating panel */
  logoCard: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
  },
  logoInner: {
    backgroundColor: '#0A1528',
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  logoImage: {
    width: 240,
    height: 90,
  },
  logoOrgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: NAVY,
    paddingVertical: 8,
  },
  logoBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
    opacity: 0.7,
  },
  logoBrandName: {
    color: '#F1F5F9',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoOrgText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },

  /* Gold separator */
  goldRule: {
    width: 48,
    height: 4,
    backgroundColor: GOLD,
    borderRadius: 2,
  },

  /* Tagline */
  tagline: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },

  /* Features */
  featureList: { gap: 14, alignSelf: 'stretch' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: 'rgba(183,170,112,0.12)',
    borderWidth: 1, borderColor: 'rgba(183,170,112,0.22)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  featureTitle: { color: '#fff', fontSize: 13, fontWeight: '700', marginBottom: 1 },
  featureDesc:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 16 },

  /* Stats */
  statsBar: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  statItem:  { flex: 1, paddingVertical: 12, alignItems: 'center' },
  statBorder:{ borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.40)', fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

  copyright: { color: 'rgba(255,255,255,0.30)', fontSize: 11 },

  /* ── Right panel ── */
  rightPanel: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  formWrap: { width: '100%', maxWidth: 460, paddingHorizontal: 24 },
  formHeading:  { fontSize: 28, fontWeight: '800', marginBottom: 6 },
  formSubtitle: { fontSize: 14, marginBottom: 24, lineHeight: 20 },

  formCard: {
    borderRadius: 16, padding: 32, borderWidth: 1,
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    marginBottom: 14,
  },
  input: { backgroundColor: 'transparent', marginBottom: -4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 8,
  },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 6, marginBottom: 18 },

  submitBtn: {
    background: 'linear-gradient(90deg,#3B82F6,#6366F1)',
    backgroundColor: '#3B82F6',
    borderRadius: 10, height: 52,
    justifyContent: 'center', alignItems: 'center',
    boxShadow: '0 4px 22px rgba(59,130,246,0.45)',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  divLine:    { flex: 1, height: StyleSheet.hairlineWidth },

  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', flexWrap: 'wrap',
  },
  secFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', opacity: 0.65,
  },
});
