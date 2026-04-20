import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const navItems = [
  { key: 'Home', icon: 'home' },
  { key: 'Feed', icon: 'newspaper-outline' },
  { key: 'AI', icon: 'sparkles' },
  { key: 'Feed List', icon: 'link-outline' },
  { key: 'Settings', icon: 'settings-outline' },
] as const;

const passiveItems: NavItem[] = ['AI'];

export type NavItem = (typeof navItems)[number]['key'];

type BottomNavBarProps = {
  activeTab: NavItem;
  aiEnabled: boolean;
  onTabPress: (tab: NavItem) => void;
};

export function BottomNavBar({ activeTab, aiEnabled, onTabPress }: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(30)).current;
  const entranceScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(entranceTranslateY, {
        damping: 16,
        mass: 0.9,
        stiffness: 170,
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        damping: 18,
        mass: 0.9,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [entranceOpacity, entranceScale, entranceTranslateY]);

  return (
    <Animated.View
      className="absolute inset-x-0 bottom-0 bg-[#f3ecde]"
      style={{
        opacity: entranceOpacity,
        paddingBottom: Math.max(insets.bottom, 4),
        paddingTop: 4,
        transform: [{ translateY: entranceTranslateY }, { scale: entranceScale }],
      }}>
      <View className="px-3 md:px-3">
        <View
          className="overflow-visible rounded-2xl border border-[#5a4b3d] bg-[#eee4d3] px-0 py-0"
          style={navShellStyle}>
          <View className="flex-row items-center">
            {navItems.map((item) => {
              const isCenterAction = item.key === 'AI';
              const isPassiveItem = passiveItems.includes(item.key);
              const isActiveItem = item.key === activeTab;
              const isDisabledCenterAction = isCenterAction && !aiEnabled;

              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.9}
                  className={`flex-1 items-center justify-center ${isCenterAction ? 'py-0.5' : 'py-2'}`}
                  disabled={isDisabledCenterAction}
                  onPress={() => onTabPress(item.key)}>
                  <View
                    className={`items-center justify-center ${
                      isCenterAction || isActiveItem
                        ? isActiveItem
                          ? 'h-10 w-10 rounded-xl border border-[#cfbea1] bg-[#2b221c]'
                          : isDisabledCenterAction
                            ? 'absolute h-[42px] w-[42px] overflow-visible rounded-lg border border-[#9d907f] bg-[#d9cfbf]'
                            : 'absolute h-[42px] w-[42px] overflow-visible rounded-lg border border-[#2b221c] bg-[#f59e0b]'
                        : 'h-9 w-9 rounded-lg border border-[#cdbc9f] bg-[#efe4d3]'
                    }`}
                    style={
                      isCenterAction || isActiveItem
                        ? isActiveItem
                          ? {
                              shadowColor: '#1b1511',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: isPassiveItem ? 0.08 : 0.1,
                              shadowRadius: 8,
                            }
                          : {
                              shadowColor: '#d8d0c2',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: isPassiveItem ? 0.08 : 0.1,
                              shadowRadius: 8,
                            }
                        : undefined
                    }>
                    <Ionicons
                      color={
                        isCenterAction || isActiveItem
                          ? isActiveItem
                            ? '#efe2c6'
                            : isDisabledCenterAction
                              ? '#8a7d6f'
                              : '#352b23'
                          : '#352b23'
                      }
                      name={item.icon}
                      size={isCenterAction ? 28 : 18}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const navShellStyle: ViewStyle = {
  shadowColor: '#201914',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 5,
};
