import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

const previewTopics = ['Unread Queue', 'Top Stories', 'World Scan', 'AI Companion'];
const weekdayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export function LoginScreen() {
  const error = useAuthStore((state) => state.error);
  const isBusy = useAuthStore((state) => state.isBusy);
  const signInWithGoogle = useAuthStore((state) => state.signInWithGoogle);

  const now = new Date();
  const editionLabel = `${weekdayFormatter.format(now)} Edition`;
  const currentDateLabel = dateFormatter.format(now);

  async function handleGoogleSignIn() {
    await signInWithGoogle();
  }

  return (
    <View className="flex-1 bg-[#f5f1e8]">
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <KeyboardAwareScrollView
          bounces={false}
          contentContainerStyle={{ flexGrow: 1 }}
          enableAutomaticScroll
          enableOnAndroid
          extraHeight={96}
          extraScrollHeight={36}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="flex-1">
            <View className="border-b border-[#cdbca1] bg-[#f5f1e8] px-5 pb-4 pt-4 md:px-6">
              <View className="border-y border-stone-400 py-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[10px] font-semibold uppercase tracking-[2.6px] text-stone-600">
                    {editionLabel}
                  </Text>
                  <Text className="text-[10px] font-semibold uppercase tracking-[2.4px] text-stone-500">
                    Digital Morning Paper
                  </Text>
                </View>
              </View>

              <View className="border-b border-stone-300 pb-3 pt-3">
                <View className="flex-row items-end justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-center text-[36px] font-bold tracking-[-0.04em] text-stone-950">
                      FEEDRY
                    </Text>
                  </View>

                  <View className="absolute right-0 top-1 items-end">
                    <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                      Date
                    </Text>
                    <Text className="mt-1 text-[11px] text-stone-600">{currentDateLabel}</Text>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="text-[26px] font-bold leading-8 tracking-tight text-stone-950">
                    Read the day like it was printed for you.
                  </Text>

                  <Text className="mt-2 text-sm leading-6 text-stone-700">
                    A calm reading desk for daily news, built around clean article cards, category
                    browsing, and focused story follow-up.
                  </Text>
                </View>

                <View className="w-24 border-l border-stone-300 pl-3">
                  <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                    Status
                  </Text>
                  <Text className="mt-1 text-[11px] leading-5 text-stone-800">
                    {isSupabaseConfigured ? 'On Press' : 'Held'}
                  </Text>
                </View>
              </View>

              <View className="mt-4 border-y border-stone-300 py-2">
                <View className="flex-row items-center justify-between gap-2">
                  {previewTopics.map((topic) => (
                    <View
                      key={topic}
                      className="flex-1 rounded-full border border-[#d8c8af] bg-[#ede2cf] px-2 py-1.5">
                      <Text
                        className="text-center text-[9px] font-semibold uppercase tracking-[1.4px] text-stone-700"
                        numberOfLines={1}>
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="flex-[1.18] bg-[#eadfcb] px-5 py-5 md:px-6">
              <View className="flex-1 items-center justify-center">
                <View className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#3a2d22] bg-[#fbf7ef]">
                  <View className="border-b border-[#cdbca1] bg-[#f2e6cf] px-4 py-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[9px] font-semibold uppercase tracking-[2.2px] text-[#7c6958]">
                        Front Desk Access
                      </Text>
                      <Text className="text-[9px] uppercase tracking-[2px] text-[#8f7e6f]">
                        Morning Edition
                      </Text>
                    </View>
                  </View>

                  <View className="border-b border-[#d8c8af] px-4 py-4">
                    <View className="mb-3 flex-row items-start justify-between gap-4">
                      <View className="flex-1">
                        <Text className="text-[10px] font-semibold uppercase tracking-[2.6px] text-[#927240]">
                          Feedry Access
                        </Text>
                        <Text className="mt-2 text-2xl font-bold tracking-tight text-[#1f1712]">
                          Sign in or create account
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="px-4 py-4">
                    <View className="gap-3">
                      <TouchableOpacity
                        activeOpacity={0.9}
                        className={`h-12 flex-row items-center justify-center gap-2 rounded-2xl border px-5 ${
                          isBusy || !isSupabaseConfigured
                            ? 'border-[#d7cbb7] bg-[#efe7d8]'
                            : 'border-[#cdbca1] bg-[#f8f1e4]'
                        }`}
                        disabled={isBusy || !isSupabaseConfigured}
                        onPress={() => {
                          void handleGoogleSignIn();
                        }}>
                        {isBusy ? (
                          <ActivityIndicator color="#3a2d22" />
                        ) : (
                          <>
                            <Ionicons color="#927240" name="logo-google" size={18} />
                            <Text className="text-sm font-semibold tracking-[0.01em] text-[#2b221c]">
                              Continue with Google
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {error ? (
                        <Text className="text-xs leading-5 text-rose-700">{error}</Text>
                      ) : null}

                      <View className="rounded-2xl border border-[#d8c8af] bg-[#f6edde] px-4 py-3">
                        <Text className="text-center text-[11px] leading-5 text-[#6e5a49]">
                          Sign in with your Google account to use a verified identity in Feedry.
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="border-t border-[#d8c8af] bg-[#f6edde] px-4 py-3">
                    <Text className="text-center text-[9px] uppercase tracking-[2px] text-[#7c6958]">
                      Feedry • Curated Reading Interface
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </TouchableWithoutFeedback>
    </View>
  );
}
