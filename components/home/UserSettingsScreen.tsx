import { Ionicons } from '@expo/vector-icons';
import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Alert, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import useSWR from 'swr';

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
  const [currentPassword, setCurrentPassword] = useState('');
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isOpenAiKeyLoading, setIsOpenAiKeyLoading] = useState(true);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');
  const isBusy = useAuthStore((state) => state.isBusy);
  const signOut = useAuthStore((state) => state.signOut);
  const syncSession = useAuthStore((state) => state.syncSession);
  const {
    data: profile,
    error: profileError,
    isLoading: isProfileLoading,
    mutate: mutateProfile,
  } = useSWR(['user-profile', user.id], () => getUserProfile(user), {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    async function loadOpenAiKey() {
      try {
        const storedKey = await getStoredOpenAiKey();
        setOpenAiKey(storedKey ?? '');
      } catch {
        setOpenAiKey('');
      } finally {
        setIsOpenAiKeyLoading(false);
      }
    }

    void loadOpenAiKey();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setFirstName(profile.firstName);
    setLastName(profile.lastName);
    setEmail(profile.email);
  }, [profile]);

  async function handleSaveSettings() {
    setIsSaving(true);
    setSavedMessage('');

    try {
      const updatedProfile = await saveUserProfile({
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

      await mutateProfile(updatedProfile, { revalidate: false });
      syncSession(data.session);
      setFirstName(updatedProfile.firstName);
      setLastName(updatedProfile.lastName);
      setEmail(updatedProfile.email);
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

  function closeChangePasswordModal() {
    setCurrentPassword('');
    setNewPassword('');
    setIsChangePasswordOpen(false);
  }

  async function handleChangePassword() {
    const normalizedEmail = (user.email ?? email).trim().toLowerCase();

    if (!normalizedEmail || !currentPassword || !newPassword) {
      Alert.alert('Missing details', 'Enter your current password and a new password.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Invalid password', 'New password must be at least 6 characters.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: currentPassword,
      });

      if (reAuthError) {
        throw new Error('Current password is incorrect.');
      }

      const { data, error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      syncSession(data.session ?? null);
      setSavedMessage('Password updated.');
      closeChangePasswordModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password.';
      Alert.alert('Password change failed', message);
    } finally {
      setIsPasswordSaving(false);
    }
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
        {profileError ? (
          <Text className="mt-10 text-sm leading-6 text-red-700">
            {profileError instanceof Error ? profileError.message : 'Unable to load profile.'}
          </Text>
        ) : null}

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

          <View className="mt-2 flex-row gap-3">
            <TouchableOpacity
              activeOpacity={0.9}
              className={`h-14 flex-1 items-center justify-center rounded-2xl px-5 ${
                isSaving ? 'bg-stone-500' : 'bg-stone-900'
              }`}
              disabled={isSaving}
              onPress={handleSaveSettings}>
              <Ionicons color="#f5f1e8" name="save-outline" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              className="h-14 flex-1 items-center justify-center rounded-2xl border border-[#d8c8af] bg-[#fbf8f2] px-5"
              disabled={isPasswordSaving}
              onPress={() => setIsChangePasswordOpen(true)}>
              <Ionicons color="#6f5d4f" name="key-outline" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              className={`h-14 flex-1 items-center justify-center rounded-2xl border px-5 ${
                isBusy ? 'border-stone-300 bg-stone-200' : 'border-[#d9b5a9] bg-[#fff0ea]'
              }`}
              disabled={isBusy}
              onPress={() => {
                void handleLogout();
              }}>
              <Ionicons color={isBusy ? '#78716c' : '#a34d35'} name="log-out-outline" size={20} />
            </TouchableOpacity>
          </View>

          {savedMessage ? (
            <Text className="text-sm leading-6 text-stone-600">{savedMessage}</Text>
          ) : null}
        </View>
      </KeyboardAwareScrollView>

      <Modal
        animationType="fade"
        transparent
        statusBarTranslucent
        visible={isChangePasswordOpen}
        onRequestClose={closeChangePasswordModal}>
        <View className="flex-1 items-center justify-center bg-black/35 px-6">
          <Pressable className="absolute inset-0" onPress={closeChangePasswordModal} />

          <View className="w-full max-w-md rounded-3xl border border-stone-200 bg-[#fbf8f2] px-5 py-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#2b221c]">
                <Ionicons color="#f2e6cf" name="key-outline" size={20} />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[2px] text-stone-500">
                  Security
                </Text>
                <Text className="mt-1 text-2xl font-bold tracking-tight text-stone-950">
                  Change password
                </Text>
              </View>
            </View>

            <View className="mt-5 gap-3">
              <View className="gap-2">
                <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  Current Password
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-14 rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4 text-base text-stone-950"
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor="#78716c"
                  secureTextEntry
                  value={currentPassword}
                />
              </View>

              <View className="gap-2">
                <Text className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  New Password
                </Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="h-14 rounded-2xl border border-stone-300 bg-[#fbf8f2] px-4 text-base text-stone-950"
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  placeholderTextColor="#78716c"
                  secureTextEntry
                  value={newPassword}
                />
              </View>
            </View>

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.9}
                className="h-12 flex-1 items-center justify-center rounded-2xl border border-[#d8c8af] bg-[#f6edde] px-4"
                disabled={isPasswordSaving}
                onPress={closeChangePasswordModal}>
                <Ionicons color="#6f5d4f" name="close-outline" size={20} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                className={`h-12 flex-1 items-center justify-center rounded-2xl px-4 ${
                  isPasswordSaving ? 'bg-stone-500' : 'bg-stone-900'
                }`}
                disabled={isPasswordSaving}
                onPress={() => {
                  void handleChangePassword();
                }}>
                <Ionicons color="#f5f1e8" name="save-outline" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingModal visible={isProfileLoading || isOpenAiKeyLoading || isSaving} />
    </>
  );
}
