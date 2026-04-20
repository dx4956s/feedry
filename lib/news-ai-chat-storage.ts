import AsyncStorage from '@react-native-async-storage/async-storage';

export type NewsAiMessage = {
  content: string;
  createdAt: number;
  id: string;
  role: 'assistant' | 'user';
};

const NEWS_AI_CHAT_STORAGE_PREFIX = 'feedry.news_ai_chat';

function getNewsAiChatStorageKey(userId: string, articleId: string) {
  return `${NEWS_AI_CHAT_STORAGE_PREFIX}.${userId}.${articleId}`;
}

export async function getStoredNewsAiMessages(
  userId: string,
  articleId: string
): Promise<NewsAiMessage[]> {
  const storedValue = await AsyncStorage.getItem(getNewsAiChatStorageKey(userId, articleId));

  if (!storedValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(
      (item): item is NewsAiMessage =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.content === 'string' &&
        typeof item.createdAt === 'number' &&
        (item.role === 'assistant' || item.role === 'user')
    );
  } catch {
    return [];
  }
}

export async function setStoredNewsAiMessages(
  userId: string,
  articleId: string,
  messages: NewsAiMessage[]
) {
  if (messages.length === 0) {
    await AsyncStorage.removeItem(getNewsAiChatStorageKey(userId, articleId));
    return;
  }

  await AsyncStorage.setItem(getNewsAiChatStorageKey(userId, articleId), JSON.stringify(messages));
}

export async function removeStoredNewsAiMessages(userId: string, articleId: string) {
  await AsyncStorage.removeItem(getNewsAiChatStorageKey(userId, articleId));
}
