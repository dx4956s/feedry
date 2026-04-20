import { useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Text,
  TextInput,
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
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail);
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail);

  const [email, setEmail] = useState('');
  const [isCreatePromptOpen, setIsCreatePromptOpen] = useState(false);
  const [password, setPassword] = useState('');

  const now = new Date();
  const editionLabel = `${weekdayFormatter.format(now)} Edition`;
  const currentDateLabel = dateFormatter.format(now);
  const submitLabel = 'Continue';

  async function handleSubmit() {
    const result = await signInWithEmail(email, password);

    if (result === 'invalid_credentials') {
      setIsCreatePromptOpen(true);
    }
  }

  async function handleCreateAccount() {
    setIsCreatePromptOpen(false);
    await signUpWithEmail(email, password);
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
                      <View className="gap-1.5">
                        <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-[#7b6858]">
                          Email Address
                        </Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="h-12 rounded-2xl border border-[#d8c8af] bg-[#f8f1e4] px-4 text-sm text-[#1f1712]"
                          keyboardType="email-address"
                          onChangeText={setEmail}
                          placeholder="you@newsroom.com"
                          placeholderTextColor="#8f7e6f"
                          returnKeyType="next"
                          value={email}
                        />
                      </View>

                      <View className="gap-1.5">
                        <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-[#7b6858]">
                          Password
                        </Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="h-12 rounded-2xl border border-[#d8c8af] bg-[#f8f1e4] px-4 text-sm text-[#1f1712]"
                          onChangeText={setPassword}
                          onSubmitEditing={() => {
                            void handleSubmit();
                          }}
                          placeholder="Password"
                          placeholderTextColor="#8f7e6f"
                          returnKeyType="go"
                          secureTextEntry
                          value={password}
                        />
                      </View>

                      {error ? (
                        <Text className="text-xs leading-5 text-rose-700">{error}</Text>
                      ) : null}

                      <View className="mt-1 border-t border-[#d8c8af] pt-3">
                        <TouchableOpacity
                          activeOpacity={0.9}
                          className={`h-12 flex-row items-center justify-center rounded-2xl border px-5 ${
                            isBusy || !isSupabaseConfigured
                              ? 'border-stone-300 bg-stone-300'
                              : 'border-[#2b221c] bg-[#2b221c]'
                          }`}
                          disabled={isBusy || !isSupabaseConfigured}
                          onPress={() => {
                            void handleSubmit();
                          }}>
                          {isBusy ? (
                            <ActivityIndicator color="#f2e6cf" />
                          ) : (
                            <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-[#f2e6cf]">
                              {submitLabel}
                            </Text>
                          )}
                        </TouchableOpacity>
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

      <Modal animationType="fade" transparent statusBarTranslucent visible={isCreatePromptOpen}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <View className="w-full max-w-sm rounded-3xl border border-stone-200 bg-[#fbf8f2] px-5 py-5">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-stone-500">
              Account
            </Text>
            <Text className="mt-2 text-2xl font-bold tracking-tight text-stone-950">
              User not present
            </Text>
            <Text className="mt-3 text-sm leading-6 text-stone-700">
              No account was found for this email. Create one now and continue into Feedry?
            </Text>

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.9}
                className="h-12 flex-1 items-center justify-center rounded-2xl border border-stone-300 bg-stone-100 px-4"
                onPress={() => setIsCreatePromptOpen(false)}>
                <Text className="text-sm font-semibold uppercase tracking-[1.6px] text-stone-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-stone-900 px-4"
                onPress={() => {
                  void handleCreateAccount();
                }}>
                <Text className="text-sm font-semibold uppercase tracking-[1.6px] text-[#f5f1e8]">
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
