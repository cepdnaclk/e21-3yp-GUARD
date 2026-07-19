import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { authApi, deviceApi } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function AssignWorkerScreen({ route, navigation }) {
  const { deviceId, currentWorkers = [] } = route.params;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const loadWorkers = useCallback(async () => {
    try {
      const allWorkers = await authApi.getWorkers();
      setWorkers(allWorkers);
    } catch (err) {
      Alert.alert('Error', 'Failed to load workers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const toggleWorker = async (workerId, isAssigned) => {
    setProcessing(true);
    try {
      if (isAssigned) {
        await deviceApi.unassignWorker(deviceId, { workerId });
      } else {
        await deviceApi.assignWorker(deviceId, { workerId });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update assignment');
    } finally {
      setProcessing(false);
    }
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
      <Text style={styles.title}>Manage Workers</Text>
      <FlatList
        data={workers}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => {
          const isAssigned = currentWorkers.some(w => w.id === item.id);
          return (
            <View style={styles.workerRow}>
              <View style={styles.workerInfo}>
                <Ionicons name="person-circle-outline" size={32} color={theme.textSecondary} style={{ marginRight: 12 }} />
                <Text style={styles.workerName}>{item.username}</Text>
              </View>
              <TouchableOpacity onPress={() => toggleWorker(item.id, isAssigned)} disabled={processing}>
                <LinearGradient 
                  colors={isAssigned ? theme.gradientDanger : theme.gradientPrimary} 
                  style={styles.actionButton}
                >
                  <Text style={styles.actionText}>{isAssigned ? 'Remove' : 'Assign'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.noData}>No workers found.</Text>}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 24 },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  workerInfo: { flexDirection: 'row', alignItems: 'center' },
  workerName: { color: theme.text, fontSize: 16, fontWeight: '500' },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: theme.iconColor, fontWeight: 'bold' },
  noData: { color: theme.textSecondary, textAlign: 'center', marginTop: 24 },
});
