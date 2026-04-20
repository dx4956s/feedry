import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { LoginScreen } from './components/auth/LoginScreen';
import { HomeScreen } from './components/home/HomeScreen';
import { useAuthStore } from './stores/auth-store';

import './global.css';

function AuthGate() {
  const initialize = useAuthStore((state) => state.initialize);
  const initialized = useAuthStore((state) => state.initialized);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const unsubscribe = initialize();

    return unsubscribe;
  }, [initialize]);

  if (!initialized || status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-stone-950 px-5 md:px-6">
        <ActivityIndicator size="large" color="#f97316" />
        <Text className="text-center text-base text-stone-300">Checking your session…</Text>
      </View>
    );
  }

  if (status !== 'authenticated' || !user) {
    return <LoginScreen />;
  }

  return <HomeScreen user={user} />;
}

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <SafeAreaView className="flex-1 bg-stone-950" edges={['left', 'right']}>
          <View className="flex-1 items-center justify-center gap-4 bg-stone-950 px-5 md:px-6">
            <ActivityIndicator size="large" color="#f97316" />
            <Text className="text-center text-base text-stone-300">Loading interface…</Text>
          </View>
          <StatusBar hidden style="light" />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-stone-950" edges={['left', 'right']}>
        <AuthGate />
        <StatusBar hidden style="light" />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
