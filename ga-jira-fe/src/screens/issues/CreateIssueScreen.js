import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Platform,
  Image, TouchableOpacity, Modal,
} from 'react-native';
import { Text, useTheme, TextInput, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
import { useCreateIssueMutation } from '../../api/issueApi';
import { issueApi } from '../../api/issueApi';
import { useGetProjectWorkflowQuery } from '../../api/projectApi';
import { ISSUE_TYPE_LABELS, PRIORITY_LABELS, API_BASE_URL } from '../../constants';

const schema = Yup.object({
  title: Yup.string().required('Title is required').min(3, 'Title too short'),
  type: Yup.string().required('Type is required'),
  priority: Yup.string().required('Priority is required'),
});

// ─── Web date input ──────────────────────────────────────────────────────────
const WebDateInput = ({ value, onChange, theme }) => {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={[wDateStyles.wrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
      <MaterialCommunityIcons name="calendar" size={18} color={theme.colors.onSurfaceVariant} style={{ marginRight: 8 }} />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>Due Date</Text>
      <input
        type="date"
        value={value || ''}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, border: 'none', outline: 'none',
          backgroundColor: 'transparent', fontSize: 14,
          color: theme.colors.onSurface, fontFamily: 'inherit', cursor: 'pointer',
        }}
      />
    </View>
  );
};
const wDateStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 4, paddingHorizontal: 12, paddingVertical: 14, marginTop: 4,
  },
});

// ─── Pure-JS date picker (no native modules) ─────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const NativeDatePicker = ({ value, onChange, theme }) => {
  const today = new Date();
  const todayYear  = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay   = today.getDate();

  const parsed = value ? new Date(value) : today;
  const [open, setOpen] = useState(false);
  const [year,  setYear]  = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth() + 1);   // 1-12
  const [day,   setDay]   = useState(parsed.getDate());

  const daysInMonth = new Date(year, month, 0).getDate();
  const minMonth = year === todayYear ? todayMonth : 1;
  const minDay   = year === todayYear && month === todayMonth ? todayDay : 1;

  // When year is changed to today's year, push month/day forward if they're in the past
  useEffect(() => {
    if (year === todayYear) {
      setMonth(m => {
        if (m < todayMonth) { setDay(todayDay); return todayMonth; }
        return m;
      });
    }
  }, [year]);

  // When month is changed into the current month of today's year, push day forward
  useEffect(() => {
    if (year === todayYear && month === todayMonth) {
      setDay(d => Math.max(d, todayDay));
    }
  }, [month]);

  const open_ = () => {
    const d = value ? new Date(value) : today;
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setDay(d.getDate());
    setOpen(true);
  };

  const confirm = () => {
    const safeDay = clamp(day, minDay, new Date(year, month, 0).getDate());
    const mm = String(month).padStart(2, '0');
    const dd = String(safeDay).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setOpen(false);
  };

  const Step = ({ label, v, onDec, onInc, width = 72 }) => (
    <View style={dpStyles.stepCol}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>{label}</Text>
      <TouchableOpacity onPress={onInc} style={[dpStyles.arrowBtn, { borderColor: theme.colors.outline }]}>
        <MaterialCommunityIcons name="chevron-up" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
      <Text variant="titleMedium" style={{ width, textAlign: 'center', color: theme.colors.onSurface, fontWeight: '700', marginVertical: 6 }}>
        {v}
      </Text>
      <TouchableOpacity onPress={onDec} style={[dpStyles.arrowBtn, { borderColor: theme.colors.outline }]}>
        <MaterialCommunityIcons name="chevron-down" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <TouchableOpacity onPress={open_} activeOpacity={0.7}>
        <TextInput
          label="Due Date"
          value={value ? (() => { const [y, m, d] = value.split('-'); return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`; })() : ''}
          mode="outlined"
          editable={false}
          pointerEvents="none"
          style={styles.input}
          placeholder="Select a date"
          right={<TextInput.Icon icon="calendar" onPress={open_} />}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={dpStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={dpStyles.sheet}>
          <View style={[dpStyles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', textAlign: 'center', marginBottom: 16 }}>
              Select Due Date
            </Text>

            <View style={dpStyles.row}>
              <Step
                label="Month"
                v={MONTHS[month - 1]}
                width={56}
                onInc={() => setMonth(m => m === 12 ? 1 : m + 1)}
                onDec={() => setMonth(m => Math.max(minMonth, m > 1 ? m - 1 : m))}
              />
              <View style={[dpStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              <Step
                label="Day"
                v={String(day).padStart(2, '0')}
                onInc={() => setDay(d => d >= daysInMonth ? minDay : d + 1)}
                onDec={() => setDay(d => Math.max(minDay, d > 1 ? d - 1 : d))}
              />
              <View style={[dpStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              <Step
                label="Year"
                v={year}
                width={64}
                onInc={() => setYear(y => y + 1)}
                onDec={() => setYear(y => Math.max(todayYear, y - 1))}
              />
            </View>

            <Divider style={{ marginVertical: 16 }} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button mode="outlined" style={{ flex: 1 }} onPress={() => setOpen(false)}>Cancel</Button>
              <Button mode="contained" style={{ flex: 1 }} onPress={confirm}>Confirm</Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const dpStyles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: 320, borderRadius: 16, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  stepCol: { alignItems: 'center' },
  arrowBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  divider: { width: 1, height: 80, marginHorizontal: 4 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
const CreateIssueScreen = ({ route, navigation }) => {
  const { projectId, sprintId, epicId } = route.params || {};
  const theme = useTheme();
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth?.accessToken);
  const [createIssue, { isLoading }] = useCreateIssueMutation();
  const { data: workflowData } = useGetProjectWorkflowQuery(projectId, { skip: !projectId });
  const workflows = workflowData?.data || [];
  const defaultWorkflow = workflows.find((w) => w.isDefault) || workflows[0];
  const statuses = defaultWorkflow?.statuses
    ? [...defaultWorkflow.statuses].sort((a, b) => a.order - b.order)
    : [];

  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAttachments((prev) => [...prev, ...result.assets].slice(0, 10));
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (values) => {
    const workflowStatusId = statuses[0]?.id;

    if (attachments.length > 0) {
      // ── FormData path: use XMLHttpRequest ──────────────────────────────────
      // React Native's XHR uses the native bridge and reliably handles
      // { uri, type, name } file parts. The newer fetch() in RN 0.76+ changed
      // its FormData serialisation and throws "Unsupported FormDataPart".
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('title', values.title.trim());
        if (values.description) formData.append('description', values.description);
        formData.append('type', values.type);
        formData.append('priority', values.priority);
        formData.append('projectId', projectId);
        if (sprintId) formData.append('sprintId', sprintId);
        if (epicId) formData.append('epicId', epicId);
        if (workflowStatusId) formData.append('workflowStatusId', workflowStatusId);
        if (values.storyPoints) formData.append('storyPoints', String(parseInt(values.storyPoints, 10)));
        if (values.dueDate) formData.append('dueDate', values.dueDate);
        attachments.forEach((asset, idx) => {
          formData.append('attachments', {
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `photo_${idx}.jpg`,
          });
        });

        const json = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${API_BASE_URL}/issues`);
          if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.onload = () => {
            try {
              const parsed = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300) resolve(parsed);
              else reject({ data: parsed });
            } catch {
              reject({ data: { message: `Server error (${xhr.status})` } });
            }
          };
          xhr.onerror   = () => reject({ data: { message: 'Network error' } });
          xhr.ontimeout = () => reject({ data: { message: 'Request timed out' } });
          xhr.timeout   = 30000;
          xhr.send(formData);
        });

        // Invalidate RTK Query cache so issue lists refresh
        dispatch(issueApi.util.invalidateTags([
          'Issue',
          { type: 'Issue', id: `project-${projectId}` },
          ...(sprintId ? [{ type: 'Issue', id: `sprint-${sprintId}` }] : []),
        ]));

        const issueId = json?.data?.id;
        navigation.goBack();
        if (issueId) navigation.navigate('IssueDetail', { issueId });
      } catch (err) {
        Alert.alert('Error', err?.data?.message || 'Failed to create issue');
      } finally {
        setUploading(false);
      }
    } else {
      // ── Plain JSON path: use RTK Query mutation ────────────────────────────
      try {
        const result = await createIssue({
          ...values,
          projectId,
          sprintId: sprintId || undefined,
          epicId: epicId || undefined,
          workflowStatusId,
          storyPoints: values.storyPoints ? parseInt(values.storyPoints, 10) : undefined,
          dueDate: values.dueDate || undefined,
        }).unwrap();
        const issueId = result.data?.id;
        navigation.goBack();
        if (issueId) navigation.navigate('IssueDetail', { issueId });
      } catch (err) {
        Alert.alert('Error', err?.data?.message || 'Failed to create issue');
      }
    }
  };

  const isSubmitting = isLoading || uploading;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <Formik
        initialValues={{ title: '', description: '', type: 'task', priority: 'medium', storyPoints: '', dueDate: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit: formSubmit, setFieldValue }) => (
          <View style={styles.form}>

            {/* Issue Type */}
            <Text variant="titleSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Issue Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {Object.entries(ISSUE_TYPE_LABELS).map(([value, label]) => (
                <Button
                  key={value}
                  mode={values.type === value ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setFieldValue('type', value)}
                  style={styles.typeBtn}
                >
                  {label}
                </Button>
              ))}
            </ScrollView>

            {/* Title */}
            <TextInput
              label="Title *"
              value={values.title}
              onChangeText={handleChange('title')}
              onBlur={handleBlur('title')}
              mode="outlined"
              error={touched.title && !!errors.title}
              style={styles.input}
            />
            {touched.title && errors.title && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>{errors.title}</Text>
            )}

            {/* Description */}
            <TextInput
              label="Description"
              value={values.description}
              onChangeText={handleChange('description')}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
            />

            {/* Priority */}
            <Text variant="titleSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>Priority</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <Button
                  key={value}
                  mode={values.priority === value ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setFieldValue('priority', value)}
                  style={styles.typeBtn}
                >
                  {label}
                </Button>
              ))}
            </ScrollView>

            {/* Story Points */}
            <TextInput
              label="Story Points"
              value={values.storyPoints}
              onChangeText={handleChange('storyPoints')}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
            />

            {/* Due Date */}
            {Platform.OS === 'web' ? (
              <WebDateInput
                value={values.dueDate}
                onChange={(val) => setFieldValue('dueDate', val)}
                theme={theme}
              />
            ) : (
              <NativeDatePicker
                value={values.dueDate}
                onChange={(val) => setFieldValue('dueDate', val)}
                theme={theme}
              />
            )}

            {/* Attachments — native only */}
            {Platform.OS !== 'web' && (
              <View>
                <Text variant="titleSmall" style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
                  Attachments{attachments.length > 0 ? ` (${attachments.length})` : ''}
                </Text>
                <Button mode="outlined" icon="image-plus" onPress={pickImages} style={styles.attachBtn}>
                  Attach Images
                </Button>
                {attachments.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                    {attachments.map((asset, index) => (
                      <View key={index} style={styles.thumbWrap}>
                        <Image source={{ uri: asset.uri }} style={styles.thumb} resizeMode="cover" />
                        <TouchableOpacity
                          style={[styles.thumbRemove, { backgroundColor: theme.colors.error }]}
                          onPress={() => removeAttachment(index)}
                        >
                          <MaterialCommunityIcons name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            <Button
              mode="contained"
              onPress={formSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitBtn}
              contentStyle={styles.submitBtnContent}
            >
              {uploading ? 'Uploading…' : 'Create Issue'}
            </Button>
          </View>
        )}
      </Formik>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, gap: 12 },
  label: { fontWeight: '600', marginBottom: 4 },
  chipRow: { marginBottom: 4 },
  typeBtn: { marginRight: 8, borderRadius: 20 },
  input: { backgroundColor: 'transparent' },
  attachBtn: { borderRadius: 8 },
  thumbRow: { marginTop: 8 },
  thumbWrap: { position: 'relative', marginRight: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  thumbRemove: {
    position: 'absolute', top: 2, right: 2,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  submitBtn: { marginTop: 8, borderRadius: 8 },
  submitBtnContent: { height: 48 },
});

export default CreateIssueScreen;
