import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { deviceApi, fishApi } from '../services/api';
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

  // Listen for a selected fish returned from FishLibraryScreen
  useEffect(() => {
    if (route.params?.selectedFish) {
      const fish = route.params.selectedFish;
      applyPreset(fish);
      // Clear the param so it doesn't trigger again if the component re-renders
      navigation.setParams({ selectedFish: undefined });
    }
  }, [route.params?.selectedFish]);

  const applyPreset = (fish) => {
    Alert.alert(
      `Apply ${fish.name} Preset`,
      `This will overwrite your current threshold inputs with the recommended safe ranges for ${fish.name}. Proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apply', 
          onPress: () => {
            setForm(prev => ({
              ...prev,
              tempMin: fish.tempMin !== null ? fish.tempMin.toString() : prev.tempMin,
              tempMax: fish.tempMax !== null ? fish.tempMax.toString() : prev.tempMax,
              phMin: fish.phMin !== null ? fish.phMin.toString() : prev.phMin,
              phMax: fish.phMax !== null ? fish.phMax.toString() : prev.phMax,
              tdsMin: fish.tdsMin !== null ? fish.tdsMin.toString() : prev.tdsMin,
              tdsMax: fish.tdsMax !== null ? fish.tdsMax.toString() : prev.tdsMax,
              turbidityMax: fish.turbidityMax !== null ? fish.turbidityMax.toString() : prev.turbidityMax,
            }));
          } 
        }
      ]
    );
  };

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
      
      {/* Presets Section */}
      <View style={styles.presetSection}>
        <Text style={styles.sectionTitle}>Apply a Preset (Fish Species)</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate('FishLibrary', { 
            deviceId, 
            currentThresholds 
          })}
        >
          <Text style={styles.browseButtonText}>Browse Fish Library</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Manual Thresholds</Text>
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
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 16 },
  presetSection: {
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.textSecondary, marginBottom: 8 },
  browseButton: {
    backgroundColor: theme.inputBg,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.primary,
  },
  browseButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
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
