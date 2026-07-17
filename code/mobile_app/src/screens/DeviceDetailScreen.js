import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { deviceApi, sensorApi } from '../services/api';
import { getSocket } from '../services/socket';
import { SENSOR_META } from '../constants/sensorConstants';

export default function DeviceDetailScreen({ route }) {
  const { deviceId } = route.params;
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const d = await deviceApi.get(deviceId);
      setDevice(d);

      const r = await sensorApi.latest(deviceId);
      setReadings(Array.isArray(r) ? r : []);
    } catch (err) {
      console.error('Failed to load device details:', err);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket) return;

    const handleSensorData = (data) => {
      if (data.tankId !== deviceId) return;
      
      setReadings(prev => prev.map(r => {
        const rName = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
        const dType = data.sensorType.replace(/\s+/g, '').toLowerCase();
        if (rName === dType) {
          return { ...r, value: data.value, readingTime: data.timestamp };
        }
        return r;
      }));
    };

    socket.on('sensor_data', handleSensorData);
    return () => socket.off('sensor_data', handleSensorData);
  }, [loadData, deviceId]);

  if (loading || !device) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{device.deviceName || `Tank ${deviceId}`}</Text>
        <Text style={styles.subtitle}>Status: {device.status || 'unknown'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Current Readings</Text>
      <View style={styles.sensorGrid}>
        {readings.length > 0 ? readings.map(r => {
          const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
          const meta = SENSOR_META[name];
          if (!meta) return null;

          return (
            <View key={r.sensorId} style={styles.sensorCard}>
              <Text style={styles.sensorLabel}>{meta.label}</Text>
              <Text style={styles.sensorValue}>{r.value !== null ? r.value : '--'}</Text>
              <Text style={styles.sensorUnit}>{meta.unit}</Text>
            </View>
          );
        }) : (
          <Text style={styles.noData}>No sensor data available.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: '#334155' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#e2e8f0', margin: 16 },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  sensorCard: {
    width: (Dimensions.get('window').width / 2) - 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorLabel: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  sensorValue: { color: '#38bdf8', fontSize: 32, fontWeight: 'bold' },
  sensorUnit: { color: '#64748b', fontSize: 14, marginTop: 4 },
  noData: { color: '#64748b', textAlign: 'center', padding: 16 },
});
