import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import type { NewsArticle } from '../../lib/rss-feed-service';

type NewsWebOverlayProps = {
  article: NewsArticle | null;
  onClose: () => void;
  visible: boolean;
};

export function NewsWebOverlay({ article, onClose, visible }: NewsWebOverlayProps) {
  const insets = useSafeAreaInsets();
  const targetUrl = article?.link?.trim() ?? '';
  const injectedJavaScript = `
    (function() {
      function disableAnchors() {
        var anchors = document.querySelectorAll('a');
        for (var index = 0; index < anchors.length; index += 1) {
          anchors[index].addEventListener('click', function(event) {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }, true);
          anchors[index].setAttribute('href', 'javascript:void(0)');
        }
      }

      document.addEventListener('click', function(event) {
        var target = event.target;
        while (target && target.tagName) {
          if (target.tagName.toLowerCase() === 'a') {
            event.preventDefault();
            event.stopPropagation();
            return false;
          }
          target = target.parentElement;
        }
      }, true);

      disableAnchors();
      true;
    })();
  `;

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
          className="flex-1 px-3"
          style={{
            paddingTop: Math.max(insets.top + 8, 40),
            paddingBottom: Math.max(insets.bottom + 12, 16),
          }}>
          <View className="flex-1 overflow-hidden rounded-[28px] border border-[#e4d6bd] bg-[#f7f0e2]">
            <View className="border-b border-[#eadcc3] bg-[#f5ecdb] px-4 pb-4 pt-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-[2px] text-[#8a7865]">
                    Article View
                  </Text>

                  {article ? (
                    <Text
                      className="mt-1 text-xl font-bold tracking-tight text-[#201813]"
                      numberOfLines={2}>
                      {article.title}
                    </Text>
                  ) : null}

                  {article ? (
                    <Text className="mt-2 text-xs uppercase tracking-[1.5px] text-[#8a7865]">
                      {article.category} · {article.sourceTitle}
                    </Text>
                  ) : null}
                </View>

                <View className="gap-2">
                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="h-10 w-10 items-center justify-center rounded-2xl border border-[#ddceb6] bg-[#fff8ec]"
                    onPress={onClose}>
                    <Ionicons color="#4f4034" name="close" size={18} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.9}
                    className="h-10 w-10 items-center justify-center rounded-2xl border border-[#ddceb6] bg-[#fff8ec]"
                    disabled={!targetUrl}
                    onPress={() => {
                      if (targetUrl) {
                        void Linking.openURL(targetUrl);
                      }
                    }}>
                    <Ionicons
                      color={targetUrl ? '#4f4034' : '#a8a29e'}
                      name="globe-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {targetUrl ? (
              <WebView
                injectedJavaScript={injectedJavaScript}
                source={{ uri: targetUrl }}
                startInLoadingState
                onShouldStartLoadWithRequest={(request) => request.url === targetUrl}
                renderLoading={() => (
                  <View className="flex-1 items-center justify-center bg-[#f7f0e2]">
                    <ActivityIndicator color="#2f241b" />
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 items-center justify-center bg-[#f7f0e2] px-6">
                <Text className="text-center text-lg font-bold tracking-tight text-[#201813]">
                  No article link available
                </Text>
                <Text className="mt-3 text-center text-sm leading-6 text-[#5c4d41]">
                  This story does not include a valid source link to open.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
