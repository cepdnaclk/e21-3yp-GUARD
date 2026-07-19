import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { deviceApi } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function EditThresholdsScreen({ route, navigation }) {
  const { deviceId, currentThresholds } = route.params;
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    tempMin: currentThresholds?.tempMin?.toString() || '0',
    tempMax: currentThresholds?.tempMax?.toString() || '0',
    phMin: currentThresholds?.phMin?.toString() || '0',
    phMax: currentThresholds?.phMax?.toString() || '0',
    tdsMin: currentThresholds?.tdsMin?.toString() || '0',
    tdsMax: currentThresholds?.tdsMax?.toString() || '0',
    turbidityMax: currentThresholds?.turbidityMax?.toString() || '0',
    waterLevelThreshold: currentThresholds?.waterLevelThreshold?.toString() || '0',
    waterStopThreshold: currentThresholds?.waterStopThreshold?.toString() || '0',
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const payload = {
        tempMin: parseFloat(form.tempMin),
        tempMax: parseFloat(form.tempMax),
        phMin: parseFloat(form.phMin),
        phMax: parseFloat(form.phMax),
        tdsMin: parseFloat(form.tdsMin),
        tdsMax: parseFloat(form.tdsMax),
        turbidityMax: parseFloat(form.turbidityMax),
        waterLevelThreshold: parseFloat(form.waterLevelThreshold),
        waterStopThreshold: parseFloat(form.waterStopThreshold),
      };
      
      await deviceApi.updateThresholds(deviceId, payload);
      Alert.alert('Success', 'Thresholds updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update thresholds');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, key) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={form[key]}
        onChangeText={val => setForm({ ...form, [key]: val })}
        keyboardType="numeric"
        placeholderTextColor={theme.textSecondary}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Edit Limits</Text>
      
      <View style={styles.row}>
        {renderInput('Temp Min', 'tempMin')}
        {renderInput('Temp Max', 'tempMax')}
      </View>
      <View style={styles.row}>
        {renderInput('pH Min', 'phMin')}
        {renderInput('pH Max', 'phMax')}
      </View>
      <View style={styles.row}>
        {renderInput('TDS Min', 'tdsMin')}
        {renderInput('TDS Max', 'tdsMax')}
      </View>
      <View style={styles.row}>
        {renderInput('Turbidity Max', 'turbidityMax')}
        <View style={styles.inputGroup} />
      </View>

      <TouchableOpacity onPress={handleUpdate} disabled={loading}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
          {loading ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </LinearGradient>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputGroup: { flex: 1, marginHorizontal: 4 },
  label: { color: theme.textSecondary, marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: theme.inputBg,
    color: theme.text,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: theme.iconColor, fontSize: 18, fontWeight: 'bold' },
});
