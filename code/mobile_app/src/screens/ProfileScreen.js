import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Profile</Text>
        <View style={styles.themeToggle}>
          <Ionicons name="sunny" size={20} color={theme.textSecondary} />
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor={theme.card}
            style={{ marginHorizontal: 8 }}
          />
          <Ionicons name="moon" size={20} color={theme.textSecondary} />
        </View>
      </View>

      <Text style={styles.label}>Username</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={formData.username}
          onChangeText={t => setFormData({ ...formData, username: t })}
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={t => setFormData({ ...formData, email: t })}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Text style={styles.label}>Phone Number</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={t => setFormData({ ...formData, phone: t })}
          keyboardType="phone-pad"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <TouchableOpacity onPress={handleUpdate} disabled={loading}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
          {loading ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text },
  themeToggle: { flexDirection: 'row', alignItems: 'center' },
  label: { color: theme.textSecondary, marginBottom: 8, fontSize: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icon: { marginRight: 12 },
  input: {
    flex: 1,
    color: theme.text,
    paddingVertical: 16,
    fontSize: 16,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: theme.iconColor, fontSize: 18, fontWeight: 'bold' },
});
