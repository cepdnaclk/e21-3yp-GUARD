import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { deviceApi, sensorApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { SENSOR_META, SENSOR_FIELDS } from '../constants/sensorConstants';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const [tanks, setTanks] = useState([]);
  const [selectedTank, setSelectedTank] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const loadTanks = useCallback(async () => {
    try {
      const devs = await deviceApi.list();
      setTanks(devs);
      if (devs.length > 0) {
        setSelectedTank(devs[0].deviceId);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to load tanks:', err);
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (tankId) => {
    setLoading(true);
    try {
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const data = await sensorApi.history({ deviceId: tankId, from: past24h });
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTanks();
  }, [loadTanks]);

  useEffect(() => {
    if (selectedTank) {
      loadHistory(selectedTank);
    }
  }, [selectedTank, loadHistory]);

  const groupDataBySensor = () => {
    const grouped = {};
    SENSOR_FIELDS.forEach(([key]) => {
      grouped[key] = [];
    });
    
    // Sort history by time
    const sorted = [...history].sort((a, b) => new Date(a.readingTime) - new Date(b.readingTime));
    
    sorted.forEach(reading => {
      if (grouped[reading.sensorId]) {
        grouped[reading.sensorId].push(reading);
      }
    });

    return grouped;
  };

  const chartConfig = {
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    color: (opacity = 1) => theme.primary,
    labelColor: (opacity = 1) => theme.textSecondary,
    strokeWidth: 2, // optional, default 3
    barPercentage: 0.5,
    useShadowColorFromDataset: false // optional
  };

  const groupedData = groupDataBySensor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
      </View>

      {/* Tank Selector Pills */}
      <View style={styles.tankSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {tanks.map(tank => (
            <TouchableOpacity 
              key={tank.deviceId} 
              style={[styles.tankPill, selectedTank === tank.deviceId && styles.tankPillActive]}
              onPress={() => setSelectedTank(tank.deviceId)}
            >
              <Text style={[styles.tankPillText, selectedTank === tank.deviceId && styles.tankPillTextActive]}>
                {tank.deviceName || `Tank ${tank.deviceId}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.chartsContainer}>
          {tanks.length === 0 ? (
            <Text style={styles.emptyText}>No tanks available.</Text>
          ) : history.length === 0 ? (
            <Text style={styles.emptyText}>No data recorded in the last 24 hours.</Text>
          ) : (
            SENSOR_FIELDS.map(([key, name]) => {
              const dataPoints = groupedData[key];
              if (!dataPoints || dataPoints.length === 0) return null;

              // Extract values and labels
              // Max 10 points for readable chart
              const step = Math.ceil(dataPoints.length / 10);
              const sampled = dataPoints.filter((_, i) => i % step === 0);
              
              const labels = sampled.map(d => {
                const date = new Date(d.readingTime);
                return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
              });
              const data = sampled.map(d => d.value);

              const metaName = name.replace(/\s+/g, '').toLowerCase();
              const unit = SENSOR_META[metaName]?.unit || '';

              return (
                <View key={key} style={styles.chartCard}>
                  <Text style={styles.chartTitle}>{name} {unit ? `(${unit})` : ''}</Text>
                  <LineChart
                    data={{
                      labels: labels.length > 0 ? labels : ['00:00'],
                      datasets: [
                        {
                          data: data.length > 0 ? data : [0]
                        }
                      ]
                    }}
                    width={screenWidth - 32 - 32} // padding adjustments
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chartStyle}
                  />
                </View>
              );
            })
          )}
          <View style={{height: 40}} />
        </ScrollView>
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    paddingTop: 48, // safe area approximation
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerTitle: { color: theme.text, fontSize: 24, fontWeight: 'bold' },
  tankSelectorContainer: {
    paddingVertical: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tankPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.inputBg,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tankPillActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tankPillText: {
    color: theme.textSecondary,
    fontWeight: 'bold',
  },
  tankPillTextActive: {
    color: theme.iconColor,
  },
  chartsContainer: {
    padding: 16,
  },
  chartCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  chartTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyText: {
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  }
});
