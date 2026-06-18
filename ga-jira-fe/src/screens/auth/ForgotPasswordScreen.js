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
} from 'react-native-paper';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useForgotPasswordMutation } from '../../api/authApi';
import BrandLogo from '../../components/common/BrandLogo';

const validationSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email address').required('Email is required'),
});

const ForgotPasswordScreen = ({ navigation }) => {
  const theme = useTheme();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [submitted, setSubmitted] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const handleSubmit = async (values) => {
    try {
      await forgotPassword(values).unwrap();
      setSubmitted(true);
    } catch (error) {
      setSnackbar({
        visible: true,
        message: error?.data?.message || 'Failed to send reset email. Try again.',
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
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>

        <View style={styles.header}>
          <BrandLogo width={200} height={80} />
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={40}
              color={theme.colors.primary}
            />
          </View>
          <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            Reset Password
          </Text>
          <Text
            variant="bodyMedium"
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            {submitted
              ? 'Check your email for a password reset link'
              : "Enter your email and we'll send you a reset link"}
          </Text>
        </View>

        {!submitted ? (
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <Formik
              initialValues={{ email: '' }}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
            >
              {({ handleChange, handleBlur, handleSubmit: formikSubmit, values, errors, touched }) => (
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <TextInput
                      label="Email Address"
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

                  <Button
                    mode="contained"
                    onPress={formikSubmit}
                    loading={isLoading}
                    disabled={isLoading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                  >
                    Send Reset Link
                  </Button>
                </View>
              )}
            </Formik>
          </Surface>
        ) : (
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]} elevation={1}>
            <View style={styles.successContent}>
              <MaterialCommunityIcons
                name="email-check"
                size={48}
                color={theme.colors.primary}
                style={styles.successIcon}
              />
              <Text
                variant="bodyMedium"
                style={[styles.successText, { color: theme.colors.onSurfaceVariant }]}
              >
                If an account exists with that email, you'll receive a password reset link shortly.
              </Text>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
              >
                Back to Sign In
              </Button>
            </View>
          </Surface>
        )}
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
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 32, gap: 10 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontWeight: '700', marginBottom: 8 },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  card: { borderRadius: 8, padding: 24, marginBottom: 24, borderWidth: 1 },
  form: { gap: 8 },
  inputGroup: { marginBottom: 8 },
  button: { borderRadius: 8, marginTop: 8 },
  buttonContent: { height: 48 },
  buttonLabel: { fontSize: 16, fontWeight: '600' },
  successContent: { alignItems: 'center', gap: 16 },
  successIcon: { marginBottom: 8 },
  successText: { textAlign: 'center', lineHeight: 22 },
});

export default ForgotPasswordScreen;
