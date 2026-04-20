import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { LoadingModal } from '../LoadingModal';
import { getStoredOpenAiKey, setStoredOpenAiKey } from '../../lib/openai-key-storage';
import { getUserProfile, saveUserProfile } from '../../lib/profile-service';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth-store';

type UserSettingsScreenProps = {
  user: User;
};

export function UserSettingsScreen({ user }: UserSettingsScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(user.email ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [openAiKey, setOpenAiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const isBusy = useAuthStore((state) => state.isBusy);
  const signOut = useAuthStore((state) => state.signOut);
  const syncSession = useAuthStore((state) => state.syncSession);

  useEffect(() => {
    async function loadSettings() {
      try {
        const [storedKey, profile] = await Promise.all([
          getStoredOpenAiKey(),
          getUserProfile(user),
        ]);
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setEmail(profile.email);
        setOpenAiKey(storedKey ?? '');
      } catch {
        setFirstName('');
        setLastName('');
        setEmail(user.email ?? '');
        setOpenAiKey('');
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, [user]);

  async function handleSaveSettings() {
    setIsSaving(true);
    setSavedMessage('');

    try {
      const profile = await saveUserProfile({
        avatarUri: null,
        email,
        firstName,
        lastName,
        user,
      });
      await setStoredOpenAiKey(openAiKey);

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      syncSession(data.session);
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setEmail(profile.email);
      setSavedMessage(
        email.trim().toLowerCase() === (user.email ?? '').toLowerCase()
          ? 'Profile saved.'
          : 'Profile saved. Check your email if Supabase requires address confirmation.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save settings.';
      Alert.alert('Save failed', message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await signOut();
  }

  return (
    <>
      <KeyboardAwareScrollView
        bounces={false}
        className="flex-1"
        contentContainerClassName="gap-5 pb-6"
        enableAutomaticScroll
        enableOnAndroid
        extraHeight={120}
        extraScrollHeight={120}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled">
        <View className="mt-10 items-center gap-4 rounded-3xl border border-stone-200 bg-[#f6f0e5] px-5 py-6">
          <View className="items-center">
            <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Profile
            </Text>
            <Text className="mt-2 text-2xl font-bold tracking-tight text-stone-950">Settings</Text>
          </View>
        </View>

        <View className="gap-4 rounded-3xl border border-stone-200 bg-[#f8f3ea] p-4">
          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              First Name
            </Text>
            <TextInput
              className="h-14 rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4 text-base text-stone-950"
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#78716c"
              value={firstName}
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Last Name
            </Text>
            <TextInput
              className="h-14 rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4 text-base text-stone-950"
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#78716c"
              value={lastName}
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              Email
            </Text>
            <TextInput
              autoCapitalize="none"
              className="h-14 rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4 text-base text-stone-950"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#78716c"
              value={email}
            />
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
              OpenAI Key
            </Text>
            <View className="h-14 flex-row items-center rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4">
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit
                className="flex-1 text-base text-stone-950"
                multiline={false}
                numberOfLines={1}
                onChangeText={setOpenAiKey}
                placeholder="sk-..."
                placeholderTextColor="#78716c"
                returnKeyType="done"
                scrollEnabled
                secureTextEntry
                textAlignVertical="center"
                value={openAiKey}
              />
            </View>
            <Text className="text-xs leading-5 text-stone-500">
              Your OpenAI API key is stored locally on this device and is not shared anywhere.
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            className={`mt-2 h-14 items-center justify-center rounded-2xl px-5 ${
              isSaving ? 'bg-stone-500' : 'bg-stone-900'
            }`}
            disabled={isSaving}
            onPress={handleSaveSettings}>
            <Text className="text-sm font-semibold uppercase tracking-widest text-[#f5f1e8]">
              {isSaving ? 'Saving' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            className={`h-14 items-center justify-center rounded-2xl border px-5 ${
              isBusy ? 'border-stone-300 bg-stone-200' : 'border-red-300 bg-red-50'
            }`}
            disabled={isBusy}
            onPress={() => {
              void handleLogout();
            }}>
            <Text
              className={`text-sm font-semibold uppercase tracking-widest ${
                isBusy ? 'text-stone-500' : 'text-red-700'
              }`}>
              {isBusy ? 'Logging out' : 'Logout'}
            </Text>
          </TouchableOpacity>

          {savedMessage ? (
            <Text className="text-sm leading-6 text-stone-600">{savedMessage}</Text>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <LoadingModal visible={isLoading || isSaving} />
    </>
  );
}
