import * as SecureStore from 'expo-secure-store';

const OPENAI_KEY_STORAGE_KEY = 'feedry.openai_api_key';

export async function getStoredOpenAiKey() {
  return SecureStore.getItemAsync(OPENAI_KEY_STORAGE_KEY);
}

export async function setStoredOpenAiKey(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    await SecureStore.deleteItemAsync(OPENAI_KEY_STORAGE_KEY);
    return;
  }

  await SecureStore.setItemAsync(OPENAI_KEY_STORAGE_KEY, normalizedValue);
}
