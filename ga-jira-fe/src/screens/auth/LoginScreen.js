import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  useTheme,
  Snackbar,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLoginMutation, useChallenge2faMutation } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

const LOGO = require('../../../assets/ga-logo-full.jpg');

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login } = useAuth();
  const [loginMutation, { isLoading }] = useLoginMutation();
  const [challenge2fa, { isLoading: verifying }] = useChallenge2faMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleLogin = async (values) => {
    try {
      const result = await loginMutation(values).unwrap();
      if (result.data?.requiresTwoFactor) {
        setTempToken(result.data.tempToken);
        setTwoFactorStep(true);
        return;
      }
      await login(result.data);
    } catch (error) {
      setSnackbar({
        visible: true,
        message: error?.data?.message || 'Login failed. Please try again.',
      });
    }
  };

  const handleVerify2fa = async () => {
    if (otpCode.trim().length < 6) return;
    try {
      const result = await challenge2fa({ tempToken, code: otpCode.trim() }).unwrap();
      await login(result.data);
    } catch (error) {
      setSnackbar({
        visible: true,
        message: error?.data?.message || 'Invalid code. Please try again.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: '#fff', borderColor: '#B8AA6E', borderBottomWidth: 3 }]}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Internal task tracker
          </Text>
        </View>

        {twoFactorStep ? (
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <View style={styles.twoFaHeader}>
              <View style={[styles.twoFaIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name="shield-key-outline" size={28} color={theme.colors.primary} />
              </View>
              <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 4 }]}>
                Two-Factor Auth
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                Enter the 6-digit code from your authenticator app
              </Text>
            </View>

            <TextInput
              label="Verification Code"
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              mode="outlined"
              left={<TextInput.Icon icon="numeric" />}
              style={[styles.input, { marginTop: 16 }]}
              maxLength={6}
              autoFocus
              onSubmitEditing={handleVerify2fa}
            />

            <Button
              mode="contained"
              onPress={handleVerify2fa}
              loading={verifying}
              disabled={verifying || otpCode.length < 6}
              style={[styles.loginButton, { marginTop: 16 }]}
              contentStyle={styles.loginButtonContent}
              labelStyle={styles.loginButtonLabel}
            >
              Verify
            </Button>

            <TouchableOpacity onPress={() => { setTwoFactorStep(false); setOtpCode(''); setTempToken(''); }} style={{ alignSelf: 'center', marginTop: 12 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 13 }}>Back to Sign In</Text>
            </TouchableOpacity>
          </Surface>
        ) : (
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Sign In
            </Text>

            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={validationSchema}
              onSubmit={handleLogin}
            >
              {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <TextInput
                      label="Email"
                      value={values.email}
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      mode="outlined"
                      left={<TextInput.Icon icon="email" />}
                      error={touched.email && !!errors.email}
                      style={styles.input}
                    />
                    <HelperText type="error" visible={touched.email && !!errors.email}>
                      {errors.email}
                    </HelperText>
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      label="Password"
                      value={values.password}
                      onChangeText={handleChange('password')}
                      onBlur={handleBlur('password')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      mode="outlined"
                      left={<TextInput.Icon icon="lock" />}
                      right={
                        <TextInput.Icon
                          icon={showPassword ? 'eye-off' : 'eye'}
                          onPress={() => setShowPassword(!showPassword)}
                        />
                      }
                      error={touched.password && !!errors.password}
                      style={styles.input}
                    />
                    <HelperText type="error" visible={touched.password && !!errors.password}>
                      {errors.password}
                    </HelperText>
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    style={styles.forgotPassword}
                  >
                    <Text style={{ color: theme.colors.primary, fontSize: 14 }}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>

                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.loginButton}
                    contentStyle={styles.loginButtonContent}
                    labelStyle={styles.loginButtonLabel}
                  >
                    Sign In
                  </Button>
                </View>
              )}
            </Formik>
          </Surface>
        )}

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
              Register with invite
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: theme.colors.error }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 260,
    height: 110,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  logoImg: {
    width: 220,
    height: 88,
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    borderRadius: 8,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 24,
  },
  twoFaHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  twoFaIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  form: {
    gap: 4,
  },
  inputGroup: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'transparent',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  loginButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonContent: {
    height: 48,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoginScreen;
