import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { deviceApi, sensorApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { SENSOR_META } from '../constants/sensorConstants';

function TankCard({ device, readings, onPress }) {
  const { isOnline } = useOnlineStatus(device.currentStats?.lastReadingTime);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{device.deviceName || `Tank ${device.deviceId}`}</Text>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22c55e' : '#ef4444' }]} />
      </View>

      <View style={styles.sensorGrid}>
        {readings.length > 0 ? (
          readings.map(r => {
            const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
            const meta = SENSOR_META[name];
            if (!meta) return null;

            return (
              <View key={r.sensorId} style={styles.sensorItem}>
                <Text style={styles.sensorLabel}>{meta.label}</Text>
                <Text style={styles.sensorValue}>{r.value !== null ? r.value : '--'} {meta.unit}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.noData}>No sensor data available.</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen({ navigation }) {
  const [devices, setDevices] = useState([]);
  const [sensorData, setSensorData] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [fabVisible, setFabVisible] = useState(false);
  const { logout, role, user, hasRole } = useAuth();
  const isAdmin = hasRole(['ADMIN', 'SUPER_ADMIN']);

  const loadData = useCallback(async () => {
    try {
      const devs = await deviceApi.list();
      setDevices(devs);

      const results = await Promise.all(
        devs.map(async (d) => {
          try {
            const readings = await sensorApi.latest(d.deviceId);
            return [d.deviceId, Array.isArray(readings) ? readings : []];
          } catch {
            return [d.deviceId, []];
          }
        })
      );
      setSensorData(Object.fromEntries(results));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket) return;

    const handleSensorData = (data) => {
      setSensorData(prev => ({
        ...prev,
        [data.tankId]: (prev[data.tankId] || []).map(r => {
          const rName = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
          const dType = data.sensorType.replace(/\s+/g, '').toLowerCase();
          if (rName === dType) {
            return { ...r, value: data.value, readingTime: data.timestamp };
          }
          return r;
        })
      }));
    };

    const handleDeviceStatus = (data) => {
      const { tankId, status } = data;
      setDevices(prev => prev.map(d => {
        if (d.deviceId === tankId) {
          return {
            ...d,
            status,
            currentStats: {
              ...d.currentStats,
              lastReadingTime: status === 'online' ? new Date().toISOString() : '1970-01-01T00:00:00.000Z'
            }
          };
        }
        return d;
      }));
    };

    socket.on('sensor_data', handleSensorData);
    socket.on('device_status', handleDeviceStatus);

    return () => {
      socket.off('sensor_data', handleSensorData);
      socket.off('device_status', handleDeviceStatus);
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <Text style={styles.topHeaderTitle}>Welcome, {user?.username || 'User'}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.burgerButton}>
          <Text style={styles.burgerIcon}>☰</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={devices}
        keyExtractor={item => item.deviceId}
        renderItem={({ item }) => (
          <TankCard 
            device={item} 
            readings={sensorData[item.deviceId] || []} 
            onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.deviceId })} 
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.noData}>No devices found.</Text>}
      />

      <Modal transparent={true} visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }}>
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); logout(); }}>
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {isAdmin && (
        <>
          {fabVisible && (
            <View style={styles.fabOptions}>
              <TouchableOpacity style={styles.fabOption} onPress={() => { setFabVisible(false); navigation.navigate('AddTank'); }}>
                <Text style={styles.fabOptionText}>Add Tank</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabOption} onPress={() => { setFabVisible(false); navigation.navigate('AddUser'); }}>
                <Text style={styles.fabOptionText}>Add Worker</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.fabMain} onPress={() => setFabVisible(!fabVisible)}>
            <Text style={styles.fabIcon}>{fabVisible ? '×' : '+'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topHeaderTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  burgerButton: { padding: 4 },
  burgerIcon: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorItem: {
    width: '30%',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  sensorLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
  sensorValue: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold' },
  noData: { color: '#64748b', textAlign: 'center', marginTop: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#1e293b',
    width: 200,
    marginTop: 60,
    marginRight: 16,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemText: { color: '#f8fafc', fontSize: 16 },
  fabMain: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
  },
  fabIcon: { color: '#0f172a', fontSize: 32, fontWeight: 'bold', lineHeight: 34 },
  fabOptions: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    alignItems: 'flex-end',
  },
  fabOption: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 12,
    elevation: 4,
  },
  fabOptionText: { color: '#f8fafc', fontWeight: 'bold' },
});
