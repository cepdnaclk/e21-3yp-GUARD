import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { Appearance, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@app_theme_v1';

export const lightTheme = {
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  primary: '#0ea5e9',
  success: '#16a34a',
  danger: '#dc2626',
  inputBg: '#f1f5f9',
  iconColor: '#0f172a',
  gradientPrimary: ['#38bdf8', '#0284c7'],
  gradientSuccess: ['#4ade80', '#16a34a'],
  gradientDanger: ['#f87171', '#dc2626'],
  gradientCard: ['#ffffff', '#f8fafc'],
};

export const darkTheme = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  primary: '#38bdf8',
  success: '#22c55e',
  danger: '#ef4444',
  inputBg: '#1e293b',
  iconColor: '#f8fafc',
  gradientPrimary: ['#38bdf8', '#0284c7'],
  gradientSuccess: ['#22c55e', '#16a34a'],
  gradientDanger: ['#ef4444', '#dc2626'],
  gradientCard: ['#1e293b', '#334155'],
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = Appearance.getColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [isLoaded, setIsLoaded] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [overlayColor, setOverlayColor] = useState('transparent');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme !== null) {
          setIsDark(savedTheme === 'dark');
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const animateTransition = (targetColor, actionCallback) => {
    if (animating) return;
    setAnimating(true);
    setOverlayColor(targetColor);
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: false,
    }).start(async () => {
      if (actionCallback) {
        await actionCallback();
      }
      
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start(() => {
        setAnimating(false);
      });
    });
  };

  const toggleTheme = async () => {
    const newTheme = !isDark;
    const targetBg = newTheme ? darkTheme.background : lightTheme.background;
    
    animateTransition(targetBg, async () => {
      setIsDark(newTheme);
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme ? 'dark' : 'light');
      } catch (e) {
        console.error('Failed to save theme preference', e);
      }
    });
  };

  const theme = isDark ? darkTheme : lightTheme;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, theme, animateTransition }}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
            opacity: fadeAnim,
            zIndex: 9999,
            elevation: 9999,
          }
        ]}
      />
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
