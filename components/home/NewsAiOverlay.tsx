import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NewsAiMessage } from '../../lib/news-ai-chat-storage';
import type { NewsArticle } from '../../lib/rss-feed-service';

type NewsAiOverlayProps = {
  article: NewsArticle | null;
  error: string;
  input: string;
  isSending: boolean;
  messages: NewsAiMessage[];
  onChangeInput: (value: string) => void;
  onClose: () => void;
  onSend: () => void;
  visible: boolean;
};

export function NewsAiOverlay({
  article,
  error,
  input,
  isSending,
  messages,
  onChangeInput,
  onClose,
  onSend,
  visible,
}: NewsAiOverlayProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [inputHeight, setInputHeight] = useState(22);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const articleMetaLabel = useMemo(() => {
    if (!article) {
      return '';
    }

    return `${article.category} · ${article.sourceTitle}`;
  }, [article]);

  const keyboardLift = keyboardHeight > 0 ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable className="absolute inset-0 bg-black/35" onPress={onClose} />

        <View
          className="flex-1 px-3 pt-10"
          style={{
            paddingTop: Math.max(insets.top + 8, 40),
            paddingBottom: Math.max(insets.bottom + 12, 16) + keyboardLift,
          }}>
          <View className="flex-1 overflow-hidden rounded-[28px] border border-[#e4d6bd] bg-[#f7f0e2]">
            <View className="border-b border-[#eadcc3] bg-[#f5ecdb] px-4 pb-4 pt-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 flex-row items-start gap-3">
                  <View className="relative mt-1 h-11 w-11 items-center justify-center rounded-2xl bg-[#201813]">
                    <View className="absolute h-11 w-11 rounded-2xl bg-[#f3b23c]" />
                    <Ionicons color="#fff4df" name="sparkles" size={20} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-[2px] text-[#8a7865]">
                      Current Story AI
                    </Text>

                    {article ? (
                      <Text
                        className="mt-1 text-xl font-bold tracking-tight text-[#201813]"
                        numberOfLines={3}>
                        {article.title}
                      </Text>
                    ) : null}

                    {articleMetaLabel ? (
                      <Text className="mt-2 text-xs uppercase tracking-[1.5px] text-[#8a7865]">
                        {articleMetaLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.9}
                  className="h-10 w-10 items-center justify-center rounded-2xl border border-[#ddceb6] bg-[#fff8ec]"
                  onPress={onClose}>
                  <Ionicons color="#4f4034" name="close" size={18} />
                </TouchableOpacity>
              </View>
            </View>

            <View className="min-h-0 flex-1 bg-[#f7f0e2]">
              <ScrollView
                ref={scrollViewRef}
                bounces={false}
                style={{ flex: 1 }}
                contentContainerStyle={{
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingTop: 16,
                  paddingBottom: 24,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}>
                {messages.length === 0 && isSending ? (
                  <View className="rounded-3xl border border-[#e5d4b5] bg-[#fff9ef] px-4 py-4">
                    <Text className="text-sm leading-6 text-[#59483a]">
                      Pulling together a deeper read on this story...
                    </Text>
                  </View>
                ) : null}

                {messages.map((message) => {
                  const isUserMessage = message.role === 'user';

                  return (
                    <View
                      key={message.id}
                      className={`rounded-3xl px-4 py-3 ${
                        isUserMessage
                          ? 'self-end border border-[#2f241b] bg-[#2f241b]'
                          : 'self-start border border-[#dfcfb4] bg-[#fbf4e8]'
                      }`}>
                      <Text
                        className={`text-sm leading-6 ${
                          isUserMessage ? 'text-[#f5ead6]' : 'text-[#43342a]'
                        }`}>
                        {message.content}
                      </Text>
                    </View>
                  );
                })}

                {isSending && messages.length > 0 ? (
                  <View className="self-start rounded-3xl border border-[#e5d4b5] bg-[#fff9ef] px-4 py-3">
                    <Text className="text-sm leading-6 text-[#59483a]">
                      Thinking about this story...
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>

            <View className="border-t border-[#eadcc3] bg-[#f7efe0] px-4 pb-4 pt-4">
              {error ? <Text className="mb-3 text-sm leading-6 text-red-700">{error}</Text> : null}

              <View className="rounded-[24px] border border-[#e2d2b8] bg-[#fff9ef] px-3 py-2.5">
                <View className="flex-row items-end gap-3">
                  <View className="min-w-0 flex-1 justify-center">
                    <TextInput
                      multiline
                      className="text-[15px] leading-5 text-[#201813]"
                      editable={!isSending}
                      onContentSizeChange={(event) => {
                        const nextHeight = Math.min(
                          Math.max(22, Math.ceil(event.nativeEvent.contentSize.height)),
                          112
                        );

                        if (Math.abs(nextHeight - inputHeight) > 2) {
                          setInputHeight(nextHeight);
                        }
                      }}
                      onFocus={() => {
                        requestAnimationFrame(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        });
                      }}
                      onChangeText={onChangeInput}
                      placeholder="Ask about this article..."
                      placeholderTextColor="#8f7e6f"
                      scrollEnabled={inputHeight >= 112}
                      style={{
                        height: inputHeight,
                        minHeight: 22,
                        maxHeight: 112,
                        textAlignVertical: 'top',
                      }}
                      value={input}
                    />
                  </View>

                  <View className="justify-end">
                    <TouchableOpacity
                      activeOpacity={0.9}
                      className={`h-10 w-10 items-center justify-center rounded-2xl ${
                        isSending || !input.trim() ? 'bg-stone-400' : 'bg-[#f59e0b]'
                      }`}
                      disabled={isSending || !input.trim()}
                      onPress={onSend}>
                      <Ionicons color="#201813" name="send" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
