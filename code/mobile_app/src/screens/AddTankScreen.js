import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Button } from 'react-native';
import { deviceApi } from '../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function AddTankScreen({ navigation }) {
  const [name, setName] = useState('');
  const [productKey, setProductKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handleBarcodeScanned = ({ type, data }) => {
    setScanning(false);
    setProductKey(data);
  };

  const handleAddTank = async () => {
    if (!name || !productKey) {
      Alert.alert('Error', 'Please enter both tank name and product key.');
      return;
    }

    setLoading(true);
    try {
      await deviceApi.register({ name, productKey });
      Alert.alert('Success', 'Tank added successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add tank');
    } finally {
      setLoading(false);
    }
  };

  if (scanning) {
    if (!permission) {
      return <View style={[styles.container, styles.centered]}><ActivityIndicator color={theme.primary} /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={{ color: theme.text, marginBottom: 16 }}>We need your permission to show the camera</Text>
          <Button onPress={requestPermission} title="Grant Permission" color={theme.primary} />
          <Button onPress={() => setScanning(false)} title="Cancel" color={theme.danger} />
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
        </View>
        <TouchableOpacity style={styles.cancelScanButton} onPress={() => setScanning(false)}>
          <Ionicons name="close-circle" size={56} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Tank</Text>

      <Text style={styles.label}>Tank Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g., Main Aquarium"
        placeholderTextColor={theme.textSecondary}
      />

      <Text style={styles.label}>Product Key</Text>
      <View style={styles.productKeyRow}>
        <TextInput
          style={[styles.input, styles.flexInput]}
          value={productKey}
          onChangeText={setProductKey}
          placeholder="Enter product key"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity onPress={() => setScanning(true)}>
          <LinearGradient colors={theme.gradientPrimary} style={styles.scanBtn}>
            <Ionicons name="qr-code-outline" size={24} color={theme.iconColor} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleAddTank} disabled={loading}>
        <LinearGradient colors={theme.gradientSuccess} style={styles.button}>
          {loading ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Register Tank</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 24 },
  label: { color: theme.textSecondary, marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: theme.inputBg,
    color: theme.text,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
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
  centered: { justifyContent: 'center', alignItems: 'center' },
  productKeyRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flexInput: { flex: 1, marginRight: 8 },
  scanBtn: {
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelScanButton: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
});
