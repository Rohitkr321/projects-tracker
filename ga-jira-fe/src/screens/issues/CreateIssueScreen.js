import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, StyleSheet, Alert, Platform,
  Image, TouchableOpacity, Modal, ActivityIndicator,
} from 'react-native';
import { Text, useTheme, TextInput, Button, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { useSelector, useDispatch } from 'react-redux';
import { useCreateIssueMutation } from '../../api/issueApi';
import { issueApi } from '../../api/issueApi';
import { useGetProjectWorkflowQuery } from '../../api/projectApi';
import { API_BASE_URL } from '../../constants';

const NAVY = '#0F2557';

const TYPE_CONFIG = {
  bug:     { icon: 'bug',                            color: '#E53935', label: 'Bug' },
  story:   { icon: 'book-open-page-variant-outline', color: '#7C4DFF', label: 'Story' },
  task:    { icon: 'checkbox-marked-circle-outline', color: '#1976D2', label: 'Task' },
  epic:    { icon: 'lightning-bolt',                 color: '#F57C00', label: 'Epic' },
  subtask: { icon: 'subdirectory-arrow-right',       color: '#546E7A', label: 'Subtask' },
};

const PRIORITY_CONFIG = {
  highest: { icon: 'arrow-up-bold',   color: '#D32F2F', label: 'Highest' },
  high:    { icon: 'arrow-up',        color: '#F57C00', label: 'High' },
  medium:  { icon: 'minus',           color: '#FBC02D', label: 'Medium' },
  low:     { icon: 'arrow-down',      color: '#388E3C', label: 'Low' },
  lowest:  { icon: 'arrow-down-bold', color: '#757575', label: 'Lowest' },
};

const schema = Yup.object({
  title:    Yup.string().required('Title is required').min(3, 'Title too short'),
  type:     Yup.string().required('Type is required'),
  priority: Yup.string().required('Priority is required'),
});

// ─── Web date input ───────────────────────────────────────────────────────────
const WebDateInput = ({ value, onChange, theme }) => {
  if (Platform.OS !== 'web') return null;
  return (
    <View style={[wDateStyles.wrapper, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}>
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
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
  },
});

// ─── Native date picker ────────────────────────────────────────────────────────
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
  const [month, setMonth] = useState(parsed.getMonth() + 1);
  const [day,   setDay]   = useState(parsed.getDate());

  const daysInMonth = new Date(year, month, 0).getDate();
  const minMonth = year === todayYear ? todayMonth : 1;
  const minDay   = year === todayYear && month === todayMonth ? todayDay : 1;

  useEffect(() => {
    if (year === todayYear) {
      setMonth(m => {
        if (m < todayMonth) { setDay(todayDay); return todayMonth; }
        return m;
      });
    }
  }, [year]);

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

  const displayValue = value
    ? (() => { const [y, m, d] = value.split('-'); return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`; })()
    : '';

  return (
    <>
      <TouchableOpacity
        onPress={open_}
        activeOpacity={0.75}
        style={[dpStyles.trigger, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surfaceVariant }]}
      >
        <MaterialCommunityIcons name="calendar-outline" size={18} color={theme.colors.primary} />
        <Text style={[dpStyles.triggerText, { color: displayValue ? theme.colors.onSurface : theme.colors.onSurfaceVariant }]}>
          {displayValue || 'Select due date'}
        </Text>
        {displayValue ? (
          <TouchableOpacity onPress={() => onChange('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <MaterialCommunityIcons name="close-circle" size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.onSurfaceVariant} />
        )}
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
                label="Month" v={MONTHS[month - 1]} width={56}
                onInc={() => setMonth(m => m === 12 ? 1 : m + 1)}
                onDec={() => setMonth(m => Math.max(minMonth, m > 1 ? m - 1 : m))}
              />
              <View style={[dpStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              <Step
                label="Day" v={String(day).padStart(2, '0')}
                onInc={() => setDay(d => d >= daysInMonth ? minDay : d + 1)}
                onDec={() => setDay(d => Math.max(minDay, d > 1 ? d - 1 : d))}
              />
              <View style={[dpStyles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
              <Step
                label="Year" v={year} width={64}
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
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14,
  },
  triggerText: { flex: 1, fontSize: 14 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { width: 320, borderRadius: 16, padding: 24, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  row: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center' },
  stepCol: { alignItems: 'center' },
  arrowBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  divider: { width: 1, height: 80, marginHorizontal: 4 },
});

// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, icon, iconColor, children, theme }) => (
  <View style={[scStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
    <View style={[scStyles.hdr, { borderBottomColor: theme.colors.outlineVariant }]}>
      <View style={[scStyles.iconBadge, { backgroundColor: (iconColor || theme.colors.primary) + '22' }]}>
        <MaterialCommunityIcons name={icon} size={15} color={iconColor || theme.colors.primary} />
      </View>
      <Text style={[scStyles.hdrLabel, { color: theme.colors.onSurface }]}>{title}</Text>
    </View>
    <View style={scStyles.body}>{children}</View>
  </View>
);

const scStyles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  hdr: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  hdrLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  body: { padding: 14, gap: 12 },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
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

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (!result.canceled) {
        const docs = result.assets.map((a) => ({
          uri: a.uri, mimeType: a.mimeType || 'application/octet-stream',
          fileName: a.name || 'file', isDocument: true,
        }));
        setAttachments((prev) => [...prev, ...docs].slice(0, 10));
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker');
    }
  };

  const removeAttachment = (index) => setAttachments((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (values) => {
    const workflowStatusId = statuses[0]?.id;

    if (attachments.length > 0) {
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
      showsVerticalScrollIndicator={false}
    >
      <Formik
        initialValues={{ title: '', description: '', type: 'task', priority: 'medium', storyPoints: '', dueDate: '' }}
        validationSchema={schema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, handleSubmit: formSubmit, setFieldValue }) => (
          <View style={styles.form}>

            {/* ── Issue Type ── */}
            <SectionCard title="Issue Type" icon="layers-outline" iconColor={TYPE_CONFIG[values.type]?.color} theme={theme}>
              <View style={styles.typeGrid}>
                {Object.entries(TYPE_CONFIG).map(([value, cfg]) => {
                  const selected = values.type === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setFieldValue('type', value)}
                      activeOpacity={0.75}
                      style={[styles.typeChip, {
                        backgroundColor: selected ? cfg.color + '14' : theme.colors.background,
                        borderColor: selected ? cfg.color : theme.colors.outlineVariant,
                        borderWidth: selected ? 2 : 1,
                      }]}
                    >
                      <View style={[styles.typeIconBadge, { backgroundColor: cfg.color + (selected ? '28' : '18') }]}>
                        <MaterialCommunityIcons name={cfg.icon} size={17} color={cfg.color} />
                      </View>
                      <Text style={[styles.typeChipLabel, { color: selected ? cfg.color : theme.colors.onSurface, fontWeight: selected ? '700' : '500' }]}>
                        {cfg.label}
                      </Text>
                      {selected && (
                        <MaterialCommunityIcons name="check-circle" size={14} color={cfg.color} style={{ marginLeft: 'auto' }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SectionCard>

            {/* ── Details ── */}
            <SectionCard title="Details" icon="text-box-outline" iconColor={NAVY} theme={theme}>
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
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: -6 }}>{errors.title}</Text>
              )}
              <TextInput
                label="Description"
                value={values.description}
                onChangeText={handleChange('description')}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />
            </SectionCard>

            {/* ── Properties ── */}
            <SectionCard title="Properties" icon="tune-vertical-variant" iconColor="#6366F1" theme={theme}>

              {/* Priority */}
              <View>
                <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Priority</Text>
                <View style={styles.priorityRow}>
                  {Object.entries(PRIORITY_CONFIG).map(([value, cfg]) => {
                    const selected = values.priority === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setFieldValue('priority', value)}
                        activeOpacity={0.75}
                        style={[styles.priorityChip, {
                          backgroundColor: selected ? cfg.color : theme.colors.background,
                          borderColor: selected ? cfg.color : theme.colors.outlineVariant,
                        }]}
                      >
                        <MaterialCommunityIcons name={cfg.icon} size={13} color={selected ? '#fff' : cfg.color} />
                        <Text style={[styles.priorityLabel, { color: selected ? '#fff' : theme.colors.onSurface }]}>
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Story Points */}
              <View style={styles.storyRow}>
                <View style={[styles.storyIconBadge, { backgroundColor: '#6366F122' }]}>
                  <MaterialCommunityIcons name="poker-chip" size={15} color="#6366F1" />
                </View>
                <Text style={[styles.storyLabel, { color: theme.colors.onSurface }]}>Story Points</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: theme.colors.outlineVariant }]}
                    onPress={() => {
                      const v = parseInt(values.storyPoints, 10);
                      if (!isNaN(v) && v > 0) setFieldValue('storyPoints', String(v - 1));
                    }}
                  >
                    <MaterialCommunityIcons name="minus" size={14} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                  <TextInput
                    value={values.storyPoints}
                    onChangeText={handleChange('storyPoints')}
                    mode="flat"
                    keyboardType="numeric"
                    style={styles.spInput}
                    contentStyle={styles.spInputContent}
                    placeholder="0"
                    dense
                  />
                  <TouchableOpacity
                    style={[styles.stepperBtn, { borderColor: theme.colors.outlineVariant }]}
                    onPress={() => {
                      const v = parseInt(values.storyPoints, 10);
                      setFieldValue('storyPoints', isNaN(v) ? '1' : String(v + 1));
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={14} color={theme.colors.onSurface} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Due Date */}
              <View>
                <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Due Date</Text>
                {Platform.OS === 'web' ? (
                  <WebDateInput value={values.dueDate} onChange={(val) => setFieldValue('dueDate', val)} theme={theme} />
                ) : (
                  <NativeDatePicker value={values.dueDate} onChange={(val) => setFieldValue('dueDate', val)} theme={theme} />
                )}
              </View>

            </SectionCard>

            {/* ── Attachments (native only) ── */}
            {Platform.OS !== 'web' && (
              <SectionCard
                title={`Attachments${attachments.length > 0 ? ` · ${attachments.length}/10` : ''}`}
                icon="paperclip"
                iconColor="#0097A7"
                theme={theme}
              >
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={pickImages}
                    style={[styles.attachBtn, { borderColor: '#0097A7', backgroundColor: '#0097A714' }]}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="image-plus" size={18} color="#0097A7" />
                    <Text style={[styles.attachBtnLabel, { color: '#0097A7' }]}>Photos</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={pickFiles}
                    style={[styles.attachBtn, { borderColor: '#6366F1', backgroundColor: '#6366F114' }]}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons name="file-plus-outline" size={18} color="#6366F1" />
                    <Text style={[styles.attachBtnLabel, { color: '#6366F1' }]}>Files</Text>
                  </TouchableOpacity>
                </View>
                {attachments.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {attachments.map((asset, index) => (
                        <View key={index} style={styles.thumbWrap}>
                          {asset.isDocument ? (
                            <View style={[styles.thumb, styles.docThumb, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
                              <MaterialCommunityIcons name="file-document-outline" size={26} color={theme.colors.primary} />
                              <Text style={{ fontSize: 9, color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={2}>
                                {asset.fileName}
                              </Text>
                            </View>
                          ) : (
                            <Image source={{ uri: asset.uri }} style={styles.thumb} resizeMode="cover" />
                          )}
                          <TouchableOpacity
                            style={[styles.thumbRemove, { backgroundColor: theme.colors.error }]}
                            onPress={() => removeAttachment(index)}
                          >
                            <MaterialCommunityIcons name="close" size={12} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </SectionCard>
            )}

            {/* ── Submit ── */}
            <TouchableOpacity
              onPress={formSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
              style={[styles.submitBtn, {
                backgroundColor: isSubmitting ? theme.colors.surfaceVariant : NAVY,
                opacity: isSubmitting ? 0.75 : 1,
              }]}
            >
              {isSubmitting ? (
                <View style={styles.submitInner}>
                  <ActivityIndicator size={18} color="#fff" />
                  <Text style={styles.submitLabel}>{uploading ? 'Uploading…' : 'Creating…'}</Text>
                </View>
              ) : (
                <View style={styles.submitInner}>
                  <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitLabel}>Create Issue</Text>
                </View>
              )}
            </TouchableOpacity>

          </View>
        )}
      </Formik>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, gap: 14, paddingBottom: 32 },

  // Type selector
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
    flexBasis: '48%', flexGrow: 1,
  },
  typeIconBadge: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  typeChipLabel: { fontSize: 13, flex: 1 },

  // Priority
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  priorityLabel: { fontSize: 12, fontWeight: '600' },

  // Story Points
  storyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storyIconBadge: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  storyLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepperBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  spInput: { backgroundColor: 'transparent', width: 56, textAlign: 'center' },
  spInputContent: { textAlign: 'center', paddingHorizontal: 0 },

  input: { backgroundColor: 'transparent' },

  // Attachments
  attachBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 13,
  },
  attachBtnLabel: { fontSize: 14, fontWeight: '600' },
  thumbWrap: { position: 'relative' },
  thumb: { width: 80, height: 80, borderRadius: 10 },
  docThumb: { justifyContent: 'center', alignItems: 'center', gap: 4, borderWidth: 1 },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  // Submit
  submitBtn: { borderRadius: 14, marginTop: 4, overflow: 'hidden' },
  submitInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  submitLabel: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
});

export default CreateIssueScreen;
