import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authApi, loadCustomApiUrl } from './src/services/api';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// In SDK 53, Expo Go no longer supports Push Notifications on Android and throws a fatal error.
// We must skip setting up the notification handler if running inside Expo Go.
const isExpoGo = Constants.executionEnvironment === 'storeClient' || Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}
import LoginScreen from './src/screens/LoginScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import DeviceDetailScreen from './src/screens/DeviceDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import AddTankScreen from './src/screens/AddTankScreen';
import AddUserScreen from './src/screens/AddUserScreen';
import EditThresholdsScreen from './src/screens/EditThresholdsScreen';
import FishLibraryScreen from './src/screens/FishLibraryScreen';
import AssignWorkerScreen from './src/screens/AssignWorkerScreen';
import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  React.useEffect(() => {
    if (user && !isExpoGo) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          authApi.savePushToken(token).catch(err => console.warn('Failed to save push token:', err));
        }
      });
    }
  }, [user]);

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
          <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="DeviceDetail" component={DeviceDetailScreen} options={{ title: 'Device Details' }} />
          <Stack.Screen name="AddTank" component={AddTankScreen} options={{ title: 'Register Tank' }} />
          <Stack.Screen name="AddUser" component={AddUserScreen} options={{ title: 'Create Worker' }} />
          <Stack.Screen name="EditThresholds" component={EditThresholdsScreen} options={{ title: 'Edit Limits' }} />
          <Stack.Screen name="FishLibrary" component={FishLibraryScreen} options={{ title: 'Fish Library' }} />
          <Stack.Screen name="AssignWorker" component={AssignWorkerScreen} options={{ title: 'Manage Workers' }} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    async function init() {
      await loadCustomApiUrl();
      setIsReady(true);
    }
    init();
  }, []);

  if (!isReady) return null;

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

async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return;
    }
    
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.warn('Failed to get Expo push token. Are you running in a bare workflow without a project ID?', e);
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}
