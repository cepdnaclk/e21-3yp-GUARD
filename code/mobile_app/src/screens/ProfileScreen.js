import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await authApi.updateProfile({
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
      });
      if (refreshUser) {
        await refreshUser();
      }
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Profile</Text>

      <Text style={styles.label}>Username</Text>
      <TextInput
        style={styles.input}
        value={formData.username}
        onChangeText={t => setFormData({ ...formData, username: t })}
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        value={formData.email}
        onChangeText={t => setFormData({ ...formData, email: t })}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#94a3b8"
      />

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        value={formData.phone}
        onChangeText={t => setFormData({ ...formData, phone: t })}
        keyboardType="phone-pad"
        placeholderTextColor="#94a3b8"
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Save Changes</Text>}
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
    backgroundColor: '#38bdf8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
});
