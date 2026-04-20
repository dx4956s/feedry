import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, type AppStateStatus } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabasePublishableKey ?? 'missing-publishable-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);

let currentAppState: AppStateStatus = AppState.currentState;

AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState === currentAppState) {
    return;
  }

  currentAppState = nextAppState;

  if (nextAppState === 'active') {
    supabase.auth.startAutoRefresh();
    return;
  }

  supabase.auth.stopAutoRefresh();
});
