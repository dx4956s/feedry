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

const previewTopics = ['Unread', 'Tech', 'World', 'AI Briefs'];
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
  const submitLabel = 'Open Feedry';

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
    <View className="flex-1 bg-[#f3eee2]">
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
            <View className="border-b border-stone-400 bg-[#f5f1e8] px-5 pb-4 pt-4 md:px-6">
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
                    Catch up before the feed gets away.
                  </Text>

                  <Text className="mt-2 text-sm leading-6 text-stone-700">
                    A newspaper-style reader for unread stories, category scanning, and AI summaries
                    that stay tied to the original reporting.
                  </Text>
                </View>

                <View className="w-24 border-l border-stone-300 pl-3">
                  <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                    Status
                  </Text>
                  <Text className="mt-1 text-[11px] leading-5 text-stone-800">
                    {isSupabaseConfigured ? 'On Press' : 'Held'}
                  </Text>

                  <Text className="mt-3 text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                    Desk
                  </Text>
                  <Text className="mt-1 text-[11px] leading-5 text-stone-700">Reader Access</Text>
                </View>
              </View>

              <View className="mt-4 border-y border-stone-300 py-2">
                <View className="flex-row flex-wrap gap-2">
                  {previewTopics.map((topic) => (
                    <View key={topic} className="border border-stone-300 bg-[#e9e1d3] px-3 py-1.5">
                      <Text className="text-[10px] font-semibold uppercase tracking-[1.8px] text-stone-700">
                        {topic}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View className="flex-[1.18] bg-[#111111] px-5 py-5 md:px-6">
              <View className="flex-1 items-center justify-center">
                <View className="w-full max-w-xl border border-stone-800 bg-[#0d0d0d]">
                  <View className="border-b border-stone-800 px-4 py-2.5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[9px] font-semibold uppercase tracking-[2.2px] text-stone-500">
                        Late Edition Access
                      </Text>
                      <Text className="text-[9px] uppercase tracking-[2px] text-stone-600">
                        Member Desk
                      </Text>
                    </View>
                  </View>

                  <View className="border-b border-stone-800 px-4 py-4">
                    <Text className="text-center text-[10px] font-semibold uppercase tracking-[2.6px] text-amber-300">
                      Return to your queue
                    </Text>
                    <Text className="mt-2 text-center text-2xl font-bold tracking-tight text-[#f5f1e8]">
                      Sign in to continue
                    </Text>
                    <Text className="mt-2 text-center text-xs leading-5 text-stone-400">
                      Resume unread tracking, jump between sections, and open AI briefs without
                      losing the feel of a structured front page.
                    </Text>
                  </View>

                  <View className="px-4 py-4">
                    <View className="gap-3">
                      <View className="gap-1.5">
                        <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                          Email Address
                        </Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="h-12 border border-stone-700 bg-[#151515] px-4 text-sm text-[#f5f1e8]"
                          keyboardType="email-address"
                          onChangeText={setEmail}
                          placeholder="you@newsroom.com"
                          placeholderTextColor="#78716c"
                          returnKeyType="next"
                          value={email}
                        />
                      </View>

                      <View className="gap-1.5">
                        <Text className="text-[10px] font-semibold uppercase tracking-[2px] text-stone-500">
                          Password
                        </Text>
                        <TextInput
                          autoCapitalize="none"
                          autoCorrect={false}
                          className="h-12 border border-stone-700 bg-[#151515] px-4 text-sm text-[#f5f1e8]"
                          onChangeText={setPassword}
                          onSubmitEditing={() => {
                            void handleSubmit();
                          }}
                          placeholder="Password"
                          placeholderTextColor="#78716c"
                          returnKeyType="go"
                          secureTextEntry
                          value={password}
                        />
                      </View>

                      {error ? (
                        <Text className="text-xs leading-5 text-rose-400">{error}</Text>
                      ) : null}

                      <View className="mt-1 border-t border-stone-800 pt-3">
                        <TouchableOpacity
                          activeOpacity={0.9}
                          className={`h-12 flex-row items-center justify-center border px-5 ${
                            isBusy || !isSupabaseConfigured
                              ? 'border-stone-700 bg-stone-700'
                              : 'border-[#f59e0b] bg-[#f59e0b]'
                          }`}
                          disabled={isBusy || !isSupabaseConfigured}
                          onPress={() => {
                            void handleSubmit();
                          }}>
                          {isBusy ? (
                            <ActivityIndicator color="#0c0a09" />
                          ) : (
                            <Text className="text-sm font-semibold uppercase tracking-[1.5px] text-stone-950">
                              {submitLabel}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View className="border-t border-stone-800 px-4 py-2.5">
                    <Text className="text-center text-[9px] uppercase tracking-[2px] text-stone-600">
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
              No account was found for this email. Create one now?
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
