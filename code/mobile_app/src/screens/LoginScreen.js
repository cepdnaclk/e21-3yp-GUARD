import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch, Modal } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENV, setCustomApiUrl } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme);

  // Developer settings state
  const [showDevModal, setShowDevModal] = useState(false);
  const [devPassword, setDevPassword] = useState('');
  const [devApiUrl, setDevApiUrl] = useState(API_ENV);
  const [devUnlocked, setDevUnlocked] = useState(false);

  const DEV_PASSWORD = 'guardadmindev';

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password.');
      return;
    }

    setBusy(true);
    try {
      await login({ username, password });
    } catch (err) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setBusy(false);
    }
  };

  const handleDevLogin = () => {
    if (devPassword === DEV_PASSWORD) {
      setDevUnlocked(true);
      setDevApiUrl(API_ENV);
    } else {
      Alert.alert('Access Denied', 'Incorrect developer password');
    }
  };

  const handleSaveDevSettings = async () => {
    await setCustomApiUrl(devApiUrl);
    Alert.alert('Success', 'API URL updated. App will now use this backend.');
    setShowDevModal(false);
    setDevUnlocked(false);
    setDevPassword('');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.devButton} 
        onPress={() => setShowDevModal(true)}
      >
        <Ionicons name="construct" size={24} color={theme.border} />
      </TouchableOpacity>

      <View style={styles.themeToggleContainer}>
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

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Sign in to G.U.A.R.D Dashboard</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleLogin} disabled={busy}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
          {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Log In</Text>}
        </LinearGradient>
      </TouchableOpacity>

      {/* Developer Modal */}
      <Modal visible={showDevModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Developer Settings</Text>
            
            {!devUnlocked ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Developer Password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  value={devPassword}
                  onChangeText={setDevPassword}
                />
                <TouchableOpacity onPress={handleDevLogin}>
                  <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                    <Text style={styles.buttonText}>Unlock</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{color: theme.text, marginBottom: 8}}>API URL:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="http://192.168.x.x:5000"
                  placeholderTextColor={theme.textSecondary}
                  autoCapitalize="none"
                  value={devApiUrl}
                  onChangeText={setDevApiUrl}
                />
                <TouchableOpacity onPress={handleSaveDevSettings}>
                  <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                    <Text style={styles.buttonText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: theme.border, marginTop: 16 }]} 
              onPress={() => {
                setShowDevModal(false);
                setDevUnlocked(false);
                setDevPassword('');
              }}
            >
              <Text style={[styles.buttonText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    justifyContent: 'center',
    padding: 24,
  },
  devButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    padding: 4,
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 60,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: theme.inputBg,
    color: theme.text,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 0,
    marginBottom: 0,
    backgroundColor: 'transparent',
  },
  eyeIcon: {
    padding: 10,
    paddingRight: 16,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.iconColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 24,
    textAlign: 'center',
  },
});
