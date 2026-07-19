import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Button } from 'react-native';
import { deviceApi } from '../services/api';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function AddTankScreen({ navigation }) {
  const [name, setName] = useState('');
  const [productKey, setProductKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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
      return <View style={[styles.container, styles.centered]}><ActivityIndicator color="#38bdf8" /></View>;
    }
    if (!permission.granted) {
      return (
        <View style={[styles.container, styles.centered]}>
          <Text style={{ color: '#fff', marginBottom: 16 }}>We need your permission to show the camera</Text>
          <Button onPress={requestPermission} title="Grant Permission" />
          <Button onPress={() => setScanning(false)} title="Cancel" color="#ef4444" />
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
        <TouchableOpacity style={styles.cancelScanButton} onPress={() => setScanning(false)}>
          <Text style={styles.buttonText}>Cancel Scan</Text>
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
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Product Key</Text>
      <View style={styles.productKeyRow}>
        <TextInput
          style={[styles.input, styles.flexInput]}
          value={productKey}
          onChangeText={setProductKey}
          placeholder="Enter product key"
          placeholderTextColor="#94a3b8"
        />
        <TouchableOpacity style={styles.scanBtn} onPress={() => setScanning(true)}>
          <Text style={styles.scanBtnText}>Scan QR</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAddTank} disabled={loading}>
        {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Register Tank</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 24 },
  label: { color: '#94a3b8', marginBottom: 8, fontSize: 14 },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  productKeyRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flexInput: { flex: 1, marginRight: 8 },
  scanBtn: {
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBtnText: { color: '#0f172a', fontWeight: 'bold' },
  cancelScanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
  },
});
