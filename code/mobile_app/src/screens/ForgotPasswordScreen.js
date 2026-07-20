import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { authApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [step, setStep] = useState(1);
  const [method, setMethod] = useState('username'); // 'username' | 'email'
  const [data, setData] = useState({
    username: '', email: '', maskedEmail: '', code: '', newPassword: '',
  });
  const [busy, setBusy] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const update = (field, value) => setData((prev) => ({ ...prev, [field]: value }));

  const handleInit = async () => {
    if (!data.username) return Alert.alert('Error', 'Please enter your username');
    setBusy(true);
    try {
      const res = await authApi.forgotPasswordInit(data.username);
      update('maskedEmail', res.maskedEmail);
      setStep(2);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!data.email) return Alert.alert('Error', 'Please enter your email address');
    setBusy(true);
    try {
      const payload = method === 'username' 
        ? { username: data.username, email: data.email } 
        : { email: data.email };

      const res = await authApi.forgotPasswordVerifyEmail(payload.username, payload.email);
      update('username', res.username || data.username);
      setStep(3);
      setResendTimer(60);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!data.code) return Alert.alert('Error', 'Please enter the verification code');
    setBusy(true);
    try {
      await authApi.forgotPasswordVerifyCode(data.username, data.code);
      setStep(4);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!data.newPassword) return Alert.alert('Error', 'Please enter a new password');
    setBusy(true);
    try {
      await authApi.forgotPasswordReset(data.username, data.code, data.newPassword);
      Alert.alert('Success', 'Password reset successfully! Please log in.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Reset Password</Text>

      {step === 1 && (
        <View>
          {method === 'username' ? (
            <View>
              <Text style={styles.subtitle}>Enter your username to begin.</Text>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                value={data.username}
                onChangeText={(val) => update('username', val)}
              />
              <TouchableOpacity onPress={handleInit} disabled={busy}>
                <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                  {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Next</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMethod('email')} style={styles.linkButton}>
                <Text style={styles.linkText}>I don't remember my username</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.subtitle}>Enter your registered email address.</Text>
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={data.email}
                onChangeText={(val) => update('email', val)}
              />
              <TouchableOpacity onPress={handleVerifyEmail} disabled={busy}>
                <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                  {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Send Code</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMethod('username')} style={styles.linkButton}>
                <Text style={styles.linkText}>I remember my username</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {step === 2 && (
        <View>
          <Text style={styles.subtitle}>Your account is linked to: {data.maskedEmail}</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter Full Email Address"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={data.email}
            onChangeText={(val) => update('email', val)}
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={() => setStep(1)} style={[styles.button, styles.outlineButton, {flex: 1, marginRight: 8}]}>
              <Text style={styles.outlineButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleVerifyEmail} disabled={busy} style={{flex: 1, marginLeft: 8}}>
              <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Send Code</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.subtitle}>A 6-digit code has been sent to: {data.email}</Text>
          <TextInput
            style={styles.input}
            placeholder="Verification Code"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            maxLength={6}
            value={data.code}
            onChangeText={(val) => update('code', val.replace(/\D/g, ''))}
          />
          <View style={[styles.row, {marginBottom: 16, justifyContent: 'center'}]}>
            {resendTimer > 0 ? (
              <Text style={styles.countdownText}>Resend code in {resendTimer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleVerifyEmail}>
                <Text style={styles.linkText}>Resend code</Text>
              </TouchableOpacity>
            )}
            <Text style={{color: theme.textSecondary, marginHorizontal: 8}}>|</Text>
            <TouchableOpacity onPress={() => setStep(method === 'username' ? 2 : 1)}>
              <Text style={styles.linkText}>Change email</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleVerifyCode} disabled={busy}>
            <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
              {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Verify Code</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {step === 4 && (
        <View>
          <Text style={styles.subtitle}>Resetting password for: {data.username}</Text>
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            value={data.newPassword}
            onChangeText={(val) => update('newPassword', val)}
          />
          <Text style={styles.hintText}>Minimum 8 characters with at least one number.</Text>
          <TouchableOpacity onPress={handleReset} disabled={busy}>
            <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
              {busy ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Reset Password</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={[styles.linkButton, {marginTop: 32}]}>
        <Text style={styles.linkText}>Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
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
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.iconColor,
    fontSize: 18,
    fontWeight: 'bold',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  outlineButtonText: {
    color: theme.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownText: {
    color: theme.textSecondary,
    fontSize: 16,
  },
  hintText: {
    color: theme.textSecondary,
    fontSize: 12,
    marginBottom: 16,
    marginTop: -8,
  }
});
