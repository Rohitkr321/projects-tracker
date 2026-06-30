import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text, TextInput, HelperText, useTheme, ActivityIndicator,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRegisterMutation, useValidateInviteQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';

const NAVY  = '#0D1B36';
const GOLD  = '#60A5FA';
const PANEL = '#0A1528';
const BAR_COLORS = ['#60A5FA', '#6BA4F8', '#7B8EF5', '#8B7AF0', '#8B5CF6'];

const validationSchema = Yup.object().shape({
  name:            Yup.string().min(2, 'Name too short').required('Name is required'),
  email:           Yup.string().email('Invalid email').required('Email is required'),
  password:        Yup.string()
    .min(8, 'At least 8 characters')
    .matches(/[A-Z]/, 'Must contain uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  inviteToken:     Yup.string().required('Invite token is required'),
});

const STEPS = [
  { icon: 'ticket-outline',        label: 'Get your invite token from your team admin' },
  { icon: 'form-textbox',          label: 'Fill in your name, email and password' },
  { icon: 'check-circle-outline',  label: 'Your account is ready instantly' },
];

export default function RegisterScreen({ navigation, route }) {
  const theme = useTheme();
  const { login } = useAuth();
  const [registerMutation, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [serverError, setServerError]     = useState('');
  const [tokenInput, setTokenInput]       = useState('');

  const prefillToken = route?.params?.inviteToken || '';

  const { data: inviteInfo, isFetching: checkingToken, isError: tokenInvalid } = useValidateInviteQuery(
    tokenInput,
    { skip: tokenInput.length < 20 }
  );

  const handleRegister = async (values) => {
    setServerError('');
    try {
      const { confirmPassword, ...registerData } = values;
      const result = await registerMutation(registerData).unwrap();
      await login(result.data);
    } catch (err) {
      setServerError(err?.data?.message || 'Registration failed. Please try again.');
    }
  };

  const bg = theme.dark ? theme.colors.background : '#EFF3F9';

  return (
    <View style={styles.root}>

      {/* ══════════════ LEFT PANEL ══════════════ */}
      <View style={styles.leftPanel}>
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

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
          Create your Cadence{'\n'}workspace account.
        </Text>

        {/* ── How it works ── */}
        <View style={styles.howSection}>
          <Text style={styles.howLabel}>HOW IT WORKS</Text>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBubble}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Invite notice ── */}
        <View style={styles.inviteNotice}>
          <MaterialCommunityIcons name="shield-check" size={16} color={GOLD} style={{ marginTop: 1 }} />
          <Text style={styles.inviteText}>
            Registration is{' '}
            <Text style={{ color: GOLD, fontWeight: '700' }}>invite-only</Text>
            {'. '}Get your token from your team admin.
          </Text>
        </View>

        <Text style={styles.copyright}>© 2026 Cadence</Text>
      </View>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <View style={[styles.rightPanel, { backgroundColor: bg }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formWrap}>

            {/* Back link */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={18} color="#60A5FA" />
              <Text style={{ color: '#60A5FA', fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Back to Sign In</Text>
            </TouchableOpacity>

            <Text style={[styles.formHeading, { color: theme.colors.onSurface }]}>Create Account</Text>
            <Text style={[styles.formSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Join your team using your invite token
            </Text>

            <View style={[styles.formCard, {
              backgroundColor: theme.colors.surface,
              borderColor: theme.dark ? theme.colors.outlineVariant : '#DDE4EE',
            }]}>
              <Formik
                initialValues={{ name: '', email: '', password: '', confirmPassword: '', inviteToken: prefillToken }}
                validationSchema={validationSchema}
                onSubmit={handleRegister}
              >
                {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                  <View style={styles.form}>

                    {/* Full Name */}
                    <TextInput
                      label="Full Name"
                      value={values.name}
                      onChangeText={handleChange('name')}
                      onBlur={handleBlur('name')}
                      autoCapitalize="words"
                      autoComplete="name"
                      mode="outlined"
                      left={<TextInput.Icon icon="account-outline" />}
                      error={touched.name && !!errors.name}
                      style={styles.input}
                    />
                    <HelperText type="error" visible={touched.name && !!errors.name}>{errors.name}</HelperText>

                    {/* Email */}
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
                    <HelperText type="error" visible={touched.email && !!errors.email}>{errors.email}</HelperText>

                    {/* Password row */}
                    <View style={styles.twoCol}>
                      <View style={styles.colItem}>
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
                      </View>
                      <View style={styles.colItem}>
                        <TextInput
                          label="Confirm Password"
                          value={values.confirmPassword}
                          onChangeText={handleChange('confirmPassword')}
                          onBlur={handleBlur('confirmPassword')}
                          secureTextEntry={!showConfirm}
                          autoCapitalize="none"
                          mode="outlined"
                          left={<TextInput.Icon icon="lock-check-outline" />}
                          right={
                            <TextInput.Icon
                              icon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                              onPress={() => setShowConfirm(v => !v)}
                            />
                          }
                          error={touched.confirmPassword && !!errors.confirmPassword}
                          style={styles.input}
                        />
                        <HelperText type="error" visible={touched.confirmPassword && !!errors.confirmPassword}>
                          {errors.confirmPassword}
                        </HelperText>
                      </View>
                    </View>

                    {/* Password strength hints */}
                    <View style={styles.pwHints}>
                      {[
                        { label: '8+ characters', ok: values.password.length >= 8 },
                        { label: 'Uppercase', ok: /[A-Z]/.test(values.password) },
                        { label: 'Number', ok: /[0-9]/.test(values.password) },
                      ].map((r, i) => (
                        <View key={i} style={styles.pwHintItem}>
                          <MaterialCommunityIcons
                            name={r.ok ? 'check-circle' : 'circle-outline'}
                            size={12}
                            color={r.ok ? '#059669' : theme.colors.onSurfaceVariant}
                          />
                          <Text style={{ fontSize: 11, color: r.ok ? '#059669' : theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                            {r.label}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Invite Token */}
                    <TextInput
                      label="Invite Token"
                      value={values.inviteToken}
                      onChangeText={(t) => { handleChange('inviteToken')(t); setTokenInput(t); }}
                      onBlur={handleBlur('inviteToken')}
                      autoCapitalize="none"
                      mode="outlined"
                      left={<TextInput.Icon icon="ticket-outline" />}
                      right={checkingToken
                        ? <TextInput.Icon icon={() => <ActivityIndicator size={14} />} />
                        : undefined}
                      error={touched.inviteToken && !!errors.inviteToken}
                      style={styles.input}
                    />
                    <HelperText type="error" visible={touched.inviteToken && !!errors.inviteToken}>
                      {errors.inviteToken}
                    </HelperText>

                    {inviteInfo?.data && (
                      <View style={[styles.tokenBanner, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                        <MaterialCommunityIcons name="check-circle" size={15} color="#065F46" />
                        <Text variant="bodySmall" style={{ color: '#065F46', flex: 1, marginLeft: 8 }}>
                          Joining <Text style={{ fontWeight: '700' }}>{inviteInfo.data.organizationName}</Text> as{' '}
                          <Text style={{ fontWeight: '700' }}>{ROLE_LABELS[inviteInfo.data.role] || inviteInfo.data.role}</Text>
                          {inviteInfo.data.invitedBy ? ` — invited by ${inviteInfo.data.invitedBy}` : ''}
                        </Text>
                      </View>
                    )}
                    {tokenInput.length >= 20 && tokenInvalid && !inviteInfo && !checkingToken && (
                      <View style={[styles.tokenBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                        <MaterialCommunityIcons name="alert-circle" size={15} color="#991B1B" />
                        <Text variant="bodySmall" style={{ color: '#991B1B', flex: 1, marginLeft: 8 }}>
                          Invalid or expired invite token
                        </Text>
                      </View>
                    )}

                    {!!serverError && (
                      <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.colors.error} />
                        <Text variant="bodySmall" style={{ color: theme.colors.error, flex: 1 }}>{serverError}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={handleSubmit}
                      disabled={isLoading}
                      style={[styles.submitBtn, isLoading && { opacity: 0.72 }]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.submitBtnText}>{isLoading ? 'Creating account…' : 'Create Account'}</Text>
                        {!isLoading && <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                        Already have an account?{'  '}
                      </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={{ color: '#60A5FA', fontWeight: '700', fontSize: 13 }}>Sign In</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </Formik>
            </View>

            <View style={styles.secFooter}>
              <MaterialCommunityIcons name="shield-lock-outline" size={13} color={theme.colors.onSurfaceVariant} />
              <Text style={{ fontSize: 11, color: theme.colors.onSurfaceVariant, marginLeft: 5 }}>
                Protected by enterprise-grade security · AES-256
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },

  /* ── Left panel ── */
  leftPanel: {
    width: 420,
    backgroundColor: PANEL,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 36,
    gap: 20,
  },
  bgCircle1: {
    position: 'absolute', top: -100, right: -100,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: 'rgba(15,37,87,0.5)',
  },
  bgCircle2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(183,170,112,0.06)',
  },

  /* Logo card */
  logoCard: {
    alignSelf: 'stretch',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
  },
  logoBrandName: {
    color: '#F1F5F9',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  logoInner: {
    backgroundColor: '#0A1528',
    paddingHorizontal: 28,
    paddingVertical: 18,
    alignItems: 'center',
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
  logoOrgText: {
    color: '#60A5FA',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },

  goldRule: { width: 44, height: 4, backgroundColor: GOLD, borderRadius: 2 },

  tagline: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 14, lineHeight: 22, textAlign: 'center',
  },

  /* How it works */
  howSection: { gap: 12, alignSelf: 'stretch' },
  howLabel: {
    color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: '700',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBubble: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(184,170,110,0.18)',
    borderWidth: 1, borderColor: 'rgba(184,170,110,0.35)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  stepNum:  { color: GOLD, fontSize: 11, fontWeight: '800' },
  stepText: { color: 'rgba(255,255,255,0.60)', fontSize: 12, lineHeight: 17, flex: 1 },

  /* Invite notice */
  inviteNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(184,170,110,0.08)',
    borderWidth: 1, borderColor: 'rgba(184,170,110,0.18)',
    borderRadius: 12, padding: 12,
    alignSelf: 'stretch',
  },
  inviteText: { color: 'rgba(255,255,255,0.68)', fontSize: 12, lineHeight: 18, flex: 1 },

  copyright: { color: 'rgba(255,255,255,0.28)', fontSize: 11 },

  /* ── Right panel ── */
  rightPanel: { flex: 1 },
  scrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 40, paddingHorizontal: 24,
  },
  formWrap: { width: '100%', maxWidth: 600 },

  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  formHeading:  { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  formSubtitle: { fontSize: 14, marginBottom: 20, lineHeight: 20 },

  formCard: {
    borderRadius: 16, padding: 28, borderWidth: 1,
    boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    marginBottom: 14,
  },
  form: { gap: 0 },
  input: { backgroundColor: 'transparent', marginBottom: -4 },

  twoCol: { flexDirection: 'row', gap: 12 },
  colItem: { flex: 1 },

  pwHints: { flexDirection: 'row', gap: 14, marginTop: 2, marginBottom: 12, flexWrap: 'wrap' },
  pwHintItem: { flexDirection: 'row', alignItems: 'center' },

  tokenBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10,
  },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 8, padding: 12, marginTop: 4, marginBottom: 8,
  },
  submitBtn: {
    background: 'linear-gradient(90deg,#3B82F6,#6366F1)',
    backgroundColor: '#3B82F6',
    borderRadius: 10, height: 50,
    justifyContent: 'center', alignItems: 'center', marginTop: 12,
    boxShadow: '0 4px 22px rgba(59,130,246,0.45)',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 18, flexWrap: 'wrap',
  },
  secFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', opacity: 0.65,
  },
});
