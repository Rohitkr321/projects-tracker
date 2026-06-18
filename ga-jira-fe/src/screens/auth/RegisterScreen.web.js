import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  useTheme,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRegisterMutation, useValidateInviteQuery } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_LABELS } from '../../constants';
import BrandLogo from '../../components/common/BrandLogo';

const validationSchema = Yup.object().shape({
  name: Yup.string().min(2, 'Name too short').required('Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain uppercase letter')
    .matches(/[0-9]/, 'Must contain a number')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  inviteToken: Yup.string().required('Invite token is required'),
});

const RegisterScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { login } = useAuth();
  const [registerMutation, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [tokenInput, setTokenInput] = useState('');

  const prefillToken = route?.params?.inviteToken || '';

  // Validate token as user types (skip if < 20 chars — tokens are 64 hex chars)
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
    } catch (error) {
      setServerError(error?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <View style={styles.root}>
      {/* Left branding panel */}
      <View style={styles.leftPanel}>
        <View style={styles.brandContent}>
          <BrandLogo width={312} height={124} tone="onDark" />
          <Text variant="titleMedium" style={styles.brandTagline}>
            Create your General Aeronautics workspace account.
          </Text>
          <View style={[styles.inviteNotice, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <MaterialCommunityIcons name="shield-check" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.inviteText}>
              Registration is invite-only. You need a valid invite token from your team admin to create an account.
            </Text>
          </View>
        </View>
        <Text style={styles.copyright}>© 2026 General Aeronautics</Text>
      </View>

      {/* Right form panel */}
      <View style={[styles.rightPanel, { backgroundColor: theme.colors.background }]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Surface
            style={[styles.formCard, { backgroundColor: theme.colors.surface }]}
            elevation={1}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <MaterialCommunityIcons name="arrow-left" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Back to Sign In</Text>
            </TouchableOpacity>

            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 6, marginTop: 8 }}
            >
              Create Account
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 24 }}
            >
              Join your team using your invite token.
            </Text>

            <Chip
              icon="shield-check"
              style={[styles.inviteChip, { backgroundColor: theme.colors.primaryContainer }]}
              textStyle={{ color: theme.colors.primary }}
            >
              Invite-only registration
            </Chip>

            <Formik
              initialValues={{
                name: '',
                email: '',
                password: '',
                confirmPassword: '',
                inviteToken: prefillToken,
              }}
              validationSchema={validationSchema}
              onSubmit={handleRegister}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.form}>
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
                  <HelperText type="error" visible={touched.name && !!errors.name}>
                    {errors.name}
                  </HelperText>

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
                            onPress={() => setShowPassword((v) => !v)}
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
                            onPress={() => setShowConfirm((v) => !v)}
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

                  <TextInput
                    label="Invite Token"
                    value={values.inviteToken}
                    onChangeText={(t) => { handleChange('inviteToken')(t); setTokenInput(t); }}
                    onBlur={handleBlur('inviteToken')}
                    autoCapitalize="none"
                    mode="outlined"
                    left={<TextInput.Icon icon="ticket-outline" />}
                    right={checkingToken ? <TextInput.Icon icon={() => <ActivityIndicator size={14} />} /> : undefined}
                    error={touched.inviteToken && !!errors.inviteToken}
                    style={styles.input}
                  />
                  <HelperText type="error" visible={touched.inviteToken && !!errors.inviteToken}>
                    {errors.inviteToken}
                  </HelperText>

                  {/* Token validation banner */}
                  {inviteInfo?.data && (
                    <View style={[styles.tokenBanner, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' }]}>
                      <MaterialCommunityIcons name="check-circle" size={16} color="#065F46" />
                      <Text variant="bodySmall" style={{ color: '#065F46', flex: 1, marginLeft: 8 }}>
                        You're joining <Text style={{ fontWeight: '700' }}>{inviteInfo.data.organizationName}</Text> as{' '}
                        <Text style={{ fontWeight: '700' }}>{ROLE_LABELS[inviteInfo.data.role] || inviteInfo.data.role}</Text>
                        {inviteInfo.data.invitedBy ? ` (invited by ${inviteInfo.data.invitedBy})` : ''}
                      </Text>
                    </View>
                  )}
                  {tokenInput.length >= 20 && tokenInvalid && !inviteInfo && !checkingToken && (
                    <View style={[styles.tokenBanner, { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#991B1B" />
                      <Text variant="bodySmall" style={{ color: '#991B1B', flex: 1, marginLeft: 8 }}>
                        Invalid or expired invite token
                      </Text>
                    </View>
                  )}

                  {serverError ? (
                    <View style={[styles.errorBox, { backgroundColor: theme.colors.errorContainer }]}>
                      <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={16}
                        color={theme.colors.error}
                      />
                      <Text variant="bodySmall" style={{ color: theme.colors.error, flex: 1 }}>
                        {serverError}
                      </Text>
                    </View>
                  ) : null}

                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.submitBtn}
                    contentStyle={styles.submitBtnContent}
                    labelStyle={{ fontSize: 16, fontWeight: '600' }}
                  >
                    Create Account
                  </Button>

                  <View style={styles.loginRow}>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Already have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.primary, fontWeight: '600' }}
                      >
                        Sign In
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Formik>
          </Surface>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: 430,
    padding: 52,
    justifyContent: 'space-between',
    backgroundColor: '#03060B',
  },
  brandContent: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.78)',
    marginTop: 24,
    marginBottom: 40,
    lineHeight: 28,
  },
  inviteNotice: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 12,
    padding: 16,
  },
  inviteText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  copyright: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  rightPanel: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 8,
    padding: 40,
    borderWidth: 1,
    borderColor: '#E7EDF4',
    boxShadow: '0px 18px 44px rgba(20,33,61,0.10)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  inviteChip: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  form: {
    gap: 0,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: -4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 16,
  },
  colItem: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  submitBtn: {
    borderRadius: 8,
    marginTop: 12,
  },
  submitBtnContent: {
    height: 52,
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  tokenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
});

export default RegisterScreen;
