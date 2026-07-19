import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { deviceApi, sensorApi } from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { SENSOR_META } from '../constants/sensorConstants';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

function TankCard({ device, readings, onPress }) {
  const { isOnline } = useOnlineStatus(device.currentStats?.lastReadingTime);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{device.deviceName || `Tank ${device.deviceId}`}</Text>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? theme.success : theme.danger }]} />
      </View>

      <View style={styles.sensorGrid}>
        {readings.length > 0 ? (
          readings.map(r => {
            const name = (r.sensorType?.sensorName || r.sensorTypeName || '').replace(/\s+/g, '').toLowerCase();
            const meta = SENSOR_META[name];
            if (!meta) return null;

            const iconName = name.includes('temp') ? 'thermometer' : name.includes('ph') ? 'flask-outline' : name.includes('tds') ? 'water-outline' : name.includes('turb') ? 'waves' : 'chart-bubble';

            return (
              <View key={r.sensorId} style={styles.sensorItem}>
                <MaterialCommunityIcons name={iconName} size={24} color={theme.primary} style={{ marginBottom: 4 }} />
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
  const { theme, toggleTheme, isDark } = useTheme();
  const styles = getStyles(theme);
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
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color={theme.iconColor} />
          </View>
          <Text style={styles.topHeaderTitle}>Welcome, {user?.username || 'User'}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={toggleTheme} style={styles.burgerButton}>
            <Ionicons name={isDark ? "sunny" : "moon"} size={24} color={theme.text} style={{ marginRight: 16 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.burgerButton}>
            <Ionicons name="menu" size={28} color={theme.text} />
          </TouchableOpacity>
        </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.noData}>No devices found.</Text>}
      />

      <Modal transparent={true} visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Profile'); }}>
              <Ionicons name="person-outline" size={20} color={theme.text} style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>My Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); logout(); }}>
              <Ionicons name="log-out-outline" size={20} color={theme.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: theme.danger }]}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {isAdmin && (
        <>
          {fabVisible && (
            <View style={styles.fabOptions}>
              <TouchableOpacity style={styles.fabOption} onPress={() => { setFabVisible(false); navigation.navigate('AddTank'); }}>
                <LinearGradient colors={theme.gradientCard} style={styles.fabOptionInner}>
                  <Ionicons name="hardware-chip-outline" size={20} color={theme.primary} style={{marginRight: 8}}/>
                  <Text style={styles.fabOptionText}>Add Tank</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabOption} onPress={() => { setFabVisible(false); navigation.navigate('AddUser'); }}>
                <LinearGradient colors={theme.gradientCard} style={styles.fabOptionInner}>
                  <Ionicons name="person-add-outline" size={20} color={theme.primary} style={{marginRight: 8}}/>
                  <Text style={styles.fabOptionText}>Add Worker</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={() => setFabVisible(!fabVisible)} style={styles.fabMainWrapper}>
            <LinearGradient colors={theme.gradientPrimary} style={styles.fabMain}>
              <Ionicons name={fabVisible ? 'close' : 'add'} size={32} color={theme.iconColor} />
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    elevation: 4,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topHeaderTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  burgerButton: { padding: 4 },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: theme.card,
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
  cardTitle: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensorItem: {
    width: '30%',
    backgroundColor: theme.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  sensorLabel: { color: theme.textSecondary, fontSize: 12, marginBottom: 4 },
  sensorValue: { color: theme.primary, fontSize: 16, fontWeight: 'bold' },
  noData: { color: theme.textSecondary, textAlign: 'center', marginTop: 24 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuContainer: {
    backgroundColor: theme.card,
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
    borderBottomColor: theme.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: { color: theme.text, fontSize: 16 },
  fabMainWrapper: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
  },
  fabMain: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabOptions: {
    position: 'absolute',
    right: 24,
    bottom: 90,
    alignItems: 'flex-end',
  },
  fabOption: {
    marginBottom: 12,
    elevation: 4,
  },
  fabOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
  },
  fabOptionText: { color: theme.text, fontWeight: 'bold' },
});
