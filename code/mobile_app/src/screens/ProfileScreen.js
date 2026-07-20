import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    address: '',
    phoneNumber: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        address: user.address || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await authApi.updateProfile({
        fullName: formData.fullName,
        address: formData.address,
        phoneNumber: formData.phoneNumber,
      });
      if (refreshUser) {
        await refreshUser();
      }
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        address: user.address || '',
        phoneNumber: user.phoneNumber || '',
      });
    }
    setIsEditing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      {/* Top Profile Section */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person" size={50} color={theme.primary} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user?.fullName || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user?.role?.toUpperCase() || 'USER'}</Text>
          </View>
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.card}>
        <View style={styles.fieldRow}>
          <Text style={styles.label}>Username</Text>
          <View style={styles.statusLabel}>
            <Ionicons name="lock-closed" size={12} color="#f59e0b" />
            <Text style={[styles.statusText, {color: '#f59e0b'}]}>LOCKED</Text>
          </View>
        </View>
        <View style={[styles.inputContainer, styles.readOnlyInput]}>
          <Text style={styles.readOnlyText}>{user?.username}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Member Since</Text>
        </View>
        <View style={[styles.inputContainer, styles.readOnlyInput]}>
          <Text style={styles.readOnlyText}>{formatDate(user?.createdAt)}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Full Name</Text>
        </View>
        <View style={[styles.inputContainer, !isEditing && styles.readOnlyInput]}>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={t => setFormData({ ...formData, fullName: t })}
            editable={isEditing}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Address</Text>
        </View>
        <View style={[styles.inputContainer, !isEditing && styles.readOnlyInput]}>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={t => setFormData({ ...formData, address: t })}
            editable={isEditing}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.statusLabel}>
            <Ionicons name="checkmark-circle" size={12} color="#10b981" />
            <Text style={[styles.statusText, {color: '#10b981'}]}>
              VERIFIED
            </Text>
          </View>
        </View>
        <View style={[styles.inputContainer, styles.readOnlyInput]}>
          <Text style={styles.readOnlyText}>{user?.email}</Text>
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.label}>Phone Number (for Telegram Alert Notifications)</Text>
          <View style={styles.statusLabel}>
            <Ionicons name={user?.phoneVerified ? "checkmark-circle" : "close-circle"} size={12} color={user?.phoneVerified ? "#10b981" : "#ef4444"} />
            <Text style={[styles.statusText, {color: user?.phoneVerified ? '#10b981' : '#ef4444'}]}>
              {user?.phoneVerified ? 'VERIFIED' : 'NOT VERIFIED'}
            </Text>
          </View>
        </View>
        <View style={[styles.inputContainer, !isEditing && styles.readOnlyInput]}>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={t => setFormData({ ...formData, phoneNumber: t })}
            editable={isEditing}
            keyboardType="phone-pad"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {isEditing ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={cancelEdit} style={[styles.button, styles.cancelButton, {flex: 1, marginRight: 8}]}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleUpdate} disabled={loading} style={{flex: 1, marginLeft: 8}}>
              <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                {loading ? <ActivityIndicator color={theme.iconColor} /> : <Text style={styles.buttonText}>Save</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionsRow}>
            <View style={{flex: 1}} />
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <LinearGradient colors={theme.gradientPrimary} style={styles.button}>
                <Text style={styles.buttonText}>Edit Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.inputBg,
    borderWidth: 3,
    borderColor: '#38bdf8', // Web app uses a blue border for avatar
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  statusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  inputContainer: {
    backgroundColor: theme.inputBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    height: 50,
    justifyContent: 'center',
  },
  readOnlyInput: {
    backgroundColor: theme.background,
    opacity: 0.8,
  },
  readOnlyText: {
    color: theme.textSecondary,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  input: {
    flex: 1,
    color: theme.text,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: theme.iconColor,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  cancelButtonText: {
    color: theme.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
