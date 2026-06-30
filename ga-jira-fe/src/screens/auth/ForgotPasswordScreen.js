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

const BAR_COLORS = ['#60A5FA', '#6BA4F8', '#7B8EF5', '#8B7AF0', '#8B5CF6'];

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
          <MaterialCommunityIcons name="arrow-left" size={24} color="#60A5FA" />
        </TouchableOpacity>

        <View style={styles.header}>
          {/* Cadence brand mark */}
          <View style={styles.logoWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 10 }}>
              {[12, 22, 32, 22, 12].map((h, i) => (
                <View
                  key={i}
                  style={{ width: 7, height: h, borderRadius: 3.5, backgroundColor: BAR_COLORS[i] }}
                />
              ))}
            </View>
            <Text style={styles.brandName}>Cadence</Text>
            <Text style={styles.brandTag}>PROJECT PLATFORM</Text>
          </View>

          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={36}
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
          <Surface
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              },
            ]}
            elevation={0}
          >
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

                  <TouchableOpacity
                    onPress={formikSubmit}
                    disabled={isLoading}
                    style={[styles.submitBtn, isLoading && { opacity: 0.7 }]}
                  >
                    <Text style={styles.submitBtnText}>
                      {isLoading ? 'Sending…' : 'Send Reset Link'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Formik>
          </Surface>
        ) : (
          <Surface
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
              },
            ]}
            elevation={0}
          >
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
              <TouchableOpacity
                onPress={() => navigation.navigate('Login')}
                style={styles.submitBtn}
              >
                <Text style={styles.submitBtnText}>Back to Sign In</Text>
              </TouchableOpacity>
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
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 60, justifyContent: 'center', alignItems: 'center' },
  backButton: { position: 'absolute', top: 60, left: 24, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: 32, gap: 10, width: '100%', maxWidth: 440 },

  logoWrap: { alignItems: 'center', marginBottom: 8 },
  brandName: { color: '#F1F5F9', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  brandTag: { color: '#60A5FA', fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontWeight: '800', marginBottom: 4 },
  subtitle: { textAlign: 'center', lineHeight: 22 },

  card: { borderRadius: 14, padding: 28, marginBottom: 24, borderWidth: 1, width: '100%', maxWidth: 440 },
  form: { gap: 8 },
  inputGroup: { marginBottom: 8 },

  submitBtn: {
    background: 'linear-gradient(90deg,#3B82F6,#6366F1)',
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    boxShadow: '0 4px 22px rgba(59,130,246,0.45)',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  successContent: { alignItems: 'center', gap: 16 },
  successIcon: { marginBottom: 8 },
  successText: { textAlign: 'center', lineHeight: 22 },
});

export default ForgotPasswordScreen;
