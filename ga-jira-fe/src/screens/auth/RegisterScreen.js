import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  HelperText,
  useTheme,
  Snackbar,
  Chip,
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRegisterMutation } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';
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
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'error' });

  const prefillToken = route?.params?.inviteToken || '';

  const handleRegister = async (values) => {
    try {
      const { confirmPassword, ...registerData } = values;
      const result = await registerMutation(registerData).unwrap();
      setSnackbar({ visible: true, message: 'Account created! Signing in...', type: 'success' });
      setTimeout(() => login(result.data), 1000);
    } catch (error) {
      setSnackbar({
        visible: true,
        message: error?.data?.message || 'Registration failed. Please try again.',
        type: 'error',
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.header}>
          <BrandLogo width={210} height={84} />
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
            Create Account
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Join your General Aeronautics workspace
          </Text>
        </View>

        <Chip
          icon="shield-check"
          style={[styles.inviteChip, { backgroundColor: theme.colors.primaryContainer }]}
          textStyle={{ color: theme.colors.primary }}
        >
          Invite-only registration
        </Chip>

        <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
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
                <View style={styles.inputGroup}>
                  <TextInput
                    label="Full Name"
                    value={values.name}
                    onChangeText={handleChange('name')}
                    onBlur={handleBlur('name')}
                    autoCapitalize="words"
                    autoComplete="name"
                    mode="outlined"
                    left={<TextInput.Icon icon="account" />}
                    error={touched.name && !!errors.name}
                  />
                  <HelperText type="error" visible={touched.name && !!errors.name}>
                    {errors.name}
                  </HelperText>
                </View>

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
                  />
                  <HelperText type="error" visible={touched.password && !!errors.password}>
                    {errors.password}
                  </HelperText>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    label="Confirm Password"
                    value={values.confirmPassword}
                    onChangeText={handleChange('confirmPassword')}
                    onBlur={handleBlur('confirmPassword')}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    mode="outlined"
                    left={<TextInput.Icon icon="lock-check" />}
                    right={
                      <TextInput.Icon
                        icon={showConfirm ? 'eye-off' : 'eye'}
                        onPress={() => setShowConfirm(!showConfirm)}
                      />
                    }
                    error={touched.confirmPassword && !!errors.confirmPassword}
                  />
                  <HelperText type="error" visible={touched.confirmPassword && !!errors.confirmPassword}>
                    {errors.confirmPassword}
                  </HelperText>
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    label="Invite Token"
                    value={values.inviteToken}
                    onChangeText={handleChange('inviteToken')}
                    onBlur={handleBlur('inviteToken')}
                    autoCapitalize="none"
                    mode="outlined"
                    left={<TextInput.Icon icon="ticket" />}
                    error={touched.inviteToken && !!errors.inviteToken}
                  />
                  <HelperText type="error" visible={touched.inviteToken && !!errors.inviteToken}>
                    {errors.inviteToken}
                  </HelperText>
                </View>

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  loading={isLoading}
                  disabled={isLoading}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  Create Account
                </Button>
              </View>
            )}
          </Formik>
        </Surface>

        <View style={styles.footer}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{
          backgroundColor: snackbar.type === 'success' ? '#00875A' : theme.colors.error,
        }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60 },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 18, marginTop: 28, gap: 6 },
  title: { fontWeight: '700', marginBottom: 4 },
  inviteChip: { alignSelf: 'center', marginBottom: 20 },
  card: { borderRadius: 8, padding: 24, marginBottom: 24, borderWidth: 1 },
  form: { gap: 4 },
  inputGroup: { marginBottom: 4 },
  button: { borderRadius: 8, marginTop: 8 },
  buttonContent: { height: 48 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});

export default RegisterScreen;
