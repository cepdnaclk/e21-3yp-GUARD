import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { fishApi, API_ENV } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function FishLibraryScreen({ navigation, route }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [fishList, setFishList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchFish = async () => {
      try {
        const data = await fishApi.list();
        setFishList(Array.isArray(data) ? data : []);
      } catch (error) {
        Alert.alert('Error', 'Failed to load fish library.');
      } finally {
        setLoading(false);
      }
    };
    fetchFish();
  }, []);

  const handleSelect = (fish) => {
    // Navigate back to EditThresholds and pass the selected fish
    navigation.navigate('EditThresholds', {
      deviceId: route.params?.deviceId,
      currentThresholds: route.params?.currentThresholds,
      selectedFish: fish
    });
  };

  const renderFishItem = ({ item }) => {
    const imageUrl = item.imageUrl ? `${API_ENV}${item.imageUrl}` : null;
    const isExpanded = expandedId === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Ionicons name="fish-outline" size={48} color={theme.textSecondary} />
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {item.scientificName ? <Text style={styles.scientificName}>{item.scientificName}</Text> : null}
            
            <View style={styles.ranges}>
              <Text style={styles.rangeText}>Temp: {item.tempMin ?? '--'} - {item.tempMax ?? '--'} °C</Text>
              <Text style={styles.rangeText}>pH: {item.phMin ?? '--'} - {item.phMax ?? '--'}</Text>
            </View>
          </View>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={theme.textSecondary} style={{ marginRight: 16 }} />
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            {item.description ? (
              <Text style={styles.fullDescription}>{item.description}</Text>
            ) : null}
            
            <View style={styles.expandedRangesRow}>
              <Text style={styles.rangeTextSecondary}>TDS: {item.tdsMin ?? '--'} - {item.tdsMax ?? '--'} ppm</Text>
              <Text style={styles.rangeTextSecondary}>Turbidity Max: {item.turbidityMax ?? '--'} NTU</Text>
            </View>

            <TouchableOpacity 
              style={[styles.useButton, { backgroundColor: theme.primary }]}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.useButtonText}>Use Preset</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : fishList.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No fish species available in the library.</Text>
        </View>
      ) : (
        <FlatList
          data={fishList}
          keyExtractor={(item) => item.id}
          renderItem={renderFishItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: theme.textSecondary, fontSize: 16 },
  card: {
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 100,
    backgroundColor: theme.inputBg,
  },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    padding: 12,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 2 },
  scientificName: { fontSize: 14, fontStyle: 'italic', color: theme.textSecondary, marginBottom: 6 },
  ranges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  rangeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.primary,
  },
  expandedContent: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.background,
  },
  fullDescription: {
    fontSize: 14,
    color: theme.text,
    marginBottom: 16,
    lineHeight: 20,
  },
  expandedRangesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rangeTextSecondary: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },
  useButton: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
