import { ActivityIndicator, Modal, Text, View } from 'react-native';

type LoadingModalProps = {
  label?: string;
  visible: boolean;
};

export function LoadingModal({ label = 'Loading', visible }: LoadingModalProps) {
  return (
    <Modal animationType="fade" transparent statusBarTranslucent visible={visible}>
      <View className="flex-1 items-center justify-center bg-black/20 px-6">
        <View className="w-full max-w-sm items-center rounded-3xl border border-stone-200 bg-[#fbf8f2] px-6 py-6">
          <ActivityIndicator color="#f59e0b" size="large" />
          <Text className="mt-4 text-xs font-semibold uppercase tracking-widest text-stone-500">
            {label}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
