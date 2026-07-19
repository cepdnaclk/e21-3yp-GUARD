import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DeviceDetailScreen from './src/screens/DeviceDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddTankScreen from './src/screens/AddTankScreen';
import AddUserScreen from './src/screens/AddUserScreen';
import EditThresholdsScreen from './src/screens/EditThresholdsScreen';
import AssignWorkerScreen from './src/screens/AssignWorkerScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: theme.card }, headerTintColor: theme.text }}>
      {user ? (
        <>
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'G.U.A.R.D Dashboard' }} />
          <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Device Details' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
          <Stack.Screen name="AddTank" component={AddTankScreen} options={{ title: 'Register Tank' }} />
          <Stack.Screen name="AddUser" component={AddUserScreen} options={{ title: 'Create Worker' }} />
          <Stack.Screen name="EditThresholds" component={EditThresholdsScreen} options={{ title: 'Edit Limits' }} />
          <Stack.Screen name="AssignWorker" component={AssignWorkerScreen} options={{ title: 'Manage Workers' }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ThemeProvider>
  );
}
