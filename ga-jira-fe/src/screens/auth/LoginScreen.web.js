import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  useTheme,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLoginMutation } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
import BrandLogo from '../../components/common/BrandLogo';

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login } = useAuth();
  const [loginMutation, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleLogin = async (values) => {
    setServerError('');
    try {
      const result = await loginMutation(values).unwrap();
      await login(result.data);
    } catch (error) {
      setServerError(error?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <View style={styles.root}>
      {/* Left branding panel */}
      <View style={[styles.leftPanel, { backgroundColor: theme.colors.primary }]}>
        <View style={styles.brandContent}>
          <BrandLogo width={310} height={124} tone="light" />
          <Text variant="titleMedium" style={styles.brandTagline}>
            Internal task tracker for General Aeronautics teams.
          </Text>
          <View style={styles.brandRule} />
        </View>
        <Text style={styles.copyright}>© 2026 General Aeronautics</Text>
      </View>

      {/* Right form panel */}
      <View style={[styles.rightPanel, { backgroundColor: theme.colors.background }]}>
        <Surface
          style={[styles.formCard, { backgroundColor: theme.colors.surface }]}
          elevation={1}
        >
          <Text
            variant="headlineSmall"
            style={{ color: theme.colors.onSurface, fontWeight: '800', marginBottom: 6 }}
          >
            Sign In
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 28 }}
          >
            Welcome back to your workspace.
          </Text>

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
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                  error={touched.password && !!errors.password}
                  style={styles.input}
                />
                <HelperText type="error" visible={touched.password && !!errors.password}>
                  {errors.password}
                </HelperText>

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

                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotBtn}
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
                  style={styles.submitBtn}
                  contentStyle={styles.submitBtnContent}
                  labelStyle={{ fontSize: 16, fontWeight: '600' }}
                >
                  Sign In
                </Button>

                <View style={styles.registerRow}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.primary, fontWeight: '600' }}
                    >
                      Register with invite
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>
        </Surface>
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
  },
  brandContent: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTagline: {
    color: 'rgba(255,255,255,0.84)',
    marginTop: 24,
    maxWidth: 300,
    lineHeight: 28,
  },
  brandRule: {
    width: 96,
    height: 3,
    backgroundColor: '#B7AA70',
    marginTop: 30,
  },
  copyright: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  rightPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  formCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 8,
    padding: 40,
    borderWidth: 1,
    borderColor: '#E7EDF4',
    boxShadow: '0px 14px 40px rgba(20,33,61,0.08)',
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: -4,
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
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 4,
  },
  submitBtn: {
    borderRadius: 8,
    marginTop: 8,
  },
  submitBtnContent: {
    height: 52,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
});

export default LoginScreen;
