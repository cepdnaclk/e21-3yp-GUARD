import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { deviceApi, sensorApi } from '../services/api';
import { getSocket } from '../services/socket';
import { SENSOR_META } from '../constants/sensorConstants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DeviceDetailScreen({ route, navigation }) {
  const { deviceId } = route.params;
  const { hasRole } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const isAdmin = hasRole(['ADMIN', 'SUPER_ADMIN']);
  const [device, setDevice] = useState(null);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingCommand, setSendingCommand] = useState(false);

  const handleCommand = async (commandName) => {
    Alert.alert(
      `Confirm ${commandName.replace('_', ' ').toUpperCase()}`,
      `Are you sure you want to send the '${commandName.replace('_', ' ').toUpperCase()}' command to this tank?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: async () => {
            setSendingCommand(true);
            try {
              await deviceApi.sendCommand(deviceId, commandName);
              Alert.alert('Success', `Command '${commandName}' sent successfully.`);
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to send command.');
            } finally {
              setSendingCommand(false);
            }
          }
        }
      ]
    );
  };

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

    const handleSensorHealth = (data) => {
      if (data.tankId !== deviceId) return;
      setDevice(prev => ({
        ...prev,
        hardwareHealth: {
          tempOk: data.health.temp_ok ?? true,
          waterOk: data.health.water_ok ?? true,
          tdsOk: data.health.tds_ok ?? true,
          phOk: data.health.ph_ok ?? true,
          turbOk: data.health.turb_ok ?? true
        }
      }));
    };

    socket.on('sensor_data', handleSensorData);
    socket.on('sensor_health', handleSensorHealth);
    
    return () => {
      socket.off('sensor_data', handleSensorData);
      socket.off('sensor_health', handleSensorHealth);
    };
  }, [loadData, deviceId]);

  if (loading || !device) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{device.deviceName || `Tank ${deviceId}`}</Text>
        <Text style={styles.subtitle}>Status: {device.status || 'unknown'}</Text>
      </View>

      {/* Hardware Fault Banner */}
      {(() => {
        const hh = device.hardwareHealth || {};
        const brokenSensors = [];
        if (hh.tempOk === false) brokenSensors.push('Temp');
        if (hh.waterOk === false) brokenSensors.push('Water Level');
        if (hh.tdsOk === false) brokenSensors.push('TDS');
        if (hh.phOk === false) brokenSensors.push('pH');
        if (hh.turbOk === false) brokenSensors.push('Turbidity');
        
        if (brokenSensors.length > 0) {
          return (
            <View style={{ backgroundColor: theme.danger, padding: 12, marginHorizontal: 16, marginTop: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="warning" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', flex: 1 }}>
                Hardware Fault: {brokenSensors.join(', ')} disconnected
              </Text>
            </View>
          );
        }
        return null;
      })()}

      <Text style={styles.sectionTitle}>Manual Actions</Text>
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.primary }]} 
          onPress={() => handleCommand('feed')}
          disabled={sendingCommand}
        >
          <MaterialCommunityIcons name="fish" size={24} color={theme.iconColor} />
          <Text style={styles.actionButtonText}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.success }]} 
          onPress={() => handleCommand('pump_on')}
          disabled={sendingCommand}
        >
          <MaterialCommunityIcons name="water-pump" size={24} color={theme.iconColor} />
          <Text style={styles.actionButtonText}>Pump On</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.danger }]} 
          onPress={() => handleCommand('pump_off')}
          disabled={sendingCommand}
        >
          <MaterialCommunityIcons name="water-pump-off" size={24} color={theme.iconColor} />
          <Text style={styles.actionButtonText}>Pump Off</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.info || '#17a2b8' }]} 
          onPress={() => handleCommand('pump_auto')}
          disabled={sendingCommand}
        >
          <MaterialCommunityIcons name="autorenew" size={24} color={theme.iconColor} />
          <Text style={styles.actionButtonText}>Auto</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Current Readings</Text>
      <View style={styles.sensorGrid}>
        {readings.length > 0 ? readings.map(r => {
          const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
          const meta = SENSOR_META[name];
          if (!meta) return null;

          const iconName = name.includes('temp') ? 'thermometer' : name.includes('ph') ? 'flask-outline' : name.includes('tds') ? 'water-outline' : name.includes('turb') ? 'waves' : 'chart-bubble';

          return (
            <View key={r.sensorId} style={styles.sensorCard}>
              <MaterialCommunityIcons name={iconName} size={28} color={theme.primary} style={{ marginBottom: 8 }} />
              <Text style={styles.sensorLabel}>{meta.label}</Text>
              <Text style={styles.sensorValue}>{r.value !== null ? r.value : '--'}</Text>
              <Text style={styles.sensorUnit}>{meta.unit}</Text>
            </View>
          );
        }) : (
          <Text style={styles.noData}>No sensor data available.</Text>
        )}
      </View>

      {isAdmin && device.thresholds && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Thresholds & Limits</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditThresholds', { deviceId, currentThresholds: device.thresholds })} style={styles.editButton}>
              <Ionicons name="create-outline" size={18} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Temp: {device.thresholds.tempMin} - {device.thresholds.tempMax} °C</Text>
            <Text style={styles.infoText}>pH: {device.thresholds.phMin} - {device.thresholds.phMax}</Text>
            <Text style={styles.infoText}>TDS: {device.thresholds.tdsMin} - {device.thresholds.tdsMax} ppm</Text>
            <Text style={styles.infoText}>Turbidity Max: {device.thresholds.turbidityMax} NTU</Text>
          </View>
        </>
      )}

      {isAdmin && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Assigned Workers</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AssignWorker', { deviceId, currentWorkers: device.workers })} style={styles.editButton}>
              <Ionicons name="people-outline" size={18} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={styles.editButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            {device.workers && device.workers.length > 0 ? (
              device.workers.map(w => (
                <Text key={w.id} style={styles.infoText}>• {w.username}</Text>
              ))
            ) : (
              <Text style={styles.infoText}>No workers assigned.</Text>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  subtitle: { fontSize: 14, color: theme.textSecondary, marginTop: 4, textTransform: 'capitalize' },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 8 },
  actionButton: { 
    flex: 1, 
    marginHorizontal: 4, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'column'
  },
  actionButtonText: { color: theme.iconColor, fontWeight: 'bold', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.text, margin: 16 },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
  sensorCard: {
    width: (Dimensions.get('window').width / 2) - 24,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sensorLabel: { color: theme.textSecondary, fontSize: 14, marginBottom: 8 },
  sensorValue: { color: theme.primary, fontSize: 32, fontWeight: 'bold' },
  sensorUnit: { color: theme.textSecondary, fontSize: 14, marginTop: 4 },
  noData: { color: theme.textSecondary, textAlign: 'center', padding: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoText: {
    color: theme.text,
    fontSize: 16,
    marginBottom: 8,
  },
});
