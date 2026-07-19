import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { authApi, deviceApi } from '../services/api';

export default function AssignWorkerScreen({ route, navigation }) {
  const { deviceId, currentWorkers = [] } = route.params;
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

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
        <ActivityIndicator size="large" color="#38bdf8" />
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
              <Text style={styles.workerName}>{item.username}</Text>
              <TouchableOpacity
                style={[styles.actionButton, isAssigned ? styles.removeButton : styles.addButton]}
                onPress={() => toggleWorker(item.id, isAssigned)}
                disabled={processing}
              >
                <Text style={styles.actionText}>{isAssigned ? 'Remove' : 'Assign'}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.noData}>No workers found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 24 },
  workerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  workerName: { color: '#f8fafc', fontSize: 16 },
  actionButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButton: { backgroundColor: '#38bdf8' },
  removeButton: { backgroundColor: '#ef4444' },
  actionText: { color: '#0f172a', fontWeight: 'bold' },
  noData: { color: '#64748b', textAlign: 'center', marginTop: 24 },
});
