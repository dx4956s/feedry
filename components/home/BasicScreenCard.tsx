import type { ReactNode } from 'react';
import { View } from 'react-native';

type BasicScreenCardProps = {
  children?: ReactNode;
};

export function BasicScreenCard({ children }: BasicScreenCardProps) {
  return (
    <View className="flex-1 rounded-3xl border border-stone-300 bg-[#fbf8f2] p-4">{children}</View>
  );
}
