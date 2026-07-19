import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { authApi } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function AddUserScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const handleCreateUser = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await authApi.createUser({ username, email, password });
      Alert.alert('Success', 'User created successfully!');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Worker</Text>

      <Text style={styles.label}>Username</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Worker username"
          autoCapitalize="none"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Text style={styles.label}>Email</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Worker email"
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <Text style={styles.label}>Password</Text>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color={theme.textSecondary} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Temporary password"
          secureTextEntry
          placeholderTextColor={theme.textSecondary}
        />
      </View>

      <TouchableOpacity onPress={handleCreateUser} disabled={loading}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
          {loading ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Create User</Text>}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background, padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 24 },
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
