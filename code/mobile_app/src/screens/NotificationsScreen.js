import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { alertApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

function AlertCard({ item, onResolve, theme }) {
  const styles = getStyles(theme);
  const isResolved = item.status === 'resolved';

  const getAlertIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('temp')) return 'thermometer-outline';
    if (t.includes('ph')) return 'flask-outline';
    if (t.includes('tds')) return 'water-outline';
    if (t.includes('turb')) return 'water';
    if (t.includes('level')) return 'swap-vertical-outline';
    return 'alert-circle-outline';
  };

  const formattedType = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Alert';

  return (
    <View style={[styles.card, isResolved && styles.cardResolved]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Ionicons name={getAlertIcon(item.type)} size={20} color={isResolved ? theme.textSecondary : theme.danger} style={{marginRight: 8}} />
          <Text style={[styles.cardTitle, isResolved && {color: theme.textSecondary}]}>
            {item.tank?.name || `Tank ${item.tankId}`}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isResolved ? theme.border : '#fee2e2' }]}>
          <Text style={[styles.badgeText, { color: isResolved ? theme.textSecondary : theme.danger }]}>
            {isResolved ? 'RESOLVED' : 'ACTIVE'}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailsContainer}>
        <Text style={[styles.typeText, isResolved && {color: theme.textSecondary}]}>
          {formattedType}: <Text style={styles.valueText}>{item.value}</Text>
        </Text>
        <Text style={[styles.message, isResolved && {color: theme.textSecondary}]}>{item.message}</Text>
      </View>

      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>

      {!isResolved && (
        <TouchableOpacity style={styles.resolveButton} onPress={() => onResolve(item.id)}>
          <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function NotificationsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await alertApi.list({ resolved: 'false' });
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAlerts();
  };

  const handleResolve = async (id) => {
    try {
      await alertApi.resolve(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Failed to resolve alert:', err);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <AlertCard item={item} onResolve={handleResolve} theme={theme} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications found.</Text>}
      />
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    paddingTop: 48, // approximate safe area top
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold' },
  listContent: { padding: 16 },
  emptyText: { color: theme.textSecondary, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.danger + '40', // light red border for active
  },
  cardResolved: {
    borderColor: theme.border,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  detailsContainer: { marginBottom: 8 },
  typeText: { color: theme.text, fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  valueText: { color: theme.primary, fontWeight: 'bold' },
  message: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  time: { color: theme.textSecondary, fontSize: 12, marginBottom: 12 },
  resolveButton: {
    backgroundColor: theme.primary + '20',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveButtonText: {
    color: theme.primary,
    fontWeight: 'bold',
  },
});
