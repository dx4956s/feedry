import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { View } from 'react-native';
import { BasicScreenCard } from './BasicScreenCard';
import { BottomNavBar, type NavItem } from './BottomNavBar';
import { FeedListScreen } from './FeedListScreen';
import { NewsScreen } from './NewsScreen';
import { UserSettingsScreen } from './UserSettingsScreen';

type HomeScreenProps = {
  user: User;
};

export function HomeScreen({ user: _user }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<NavItem>('Home');
  const [aiOpenSignal, setAiOpenSignal] = useState(0);
  const isAiEnabled = activeTab === 'Home' || activeTab === 'Feed';

  function handleNavPress(tab: NavItem) {
    if (tab === 'AI') {
      if (isAiEnabled) {
        setAiOpenSignal((currentValue) => currentValue + 1);
      }

      return;
    }

    setActiveTab(tab);
  }

  return (
    <View className="flex-1 bg-[#f5f1e8] px-4 pb-28 pt-4 md:px-5 md:pt-5">
      {activeTab === 'Home' ? (
        <NewsScreen aiOpenSignal={aiOpenSignal} unreadOnly user={_user} />
      ) : null}
      {activeTab === 'Feed' ? <NewsScreen aiOpenSignal={aiOpenSignal} user={_user} /> : null}
      {activeTab === 'Feed List' ? <FeedListScreen user={_user} /> : null}
      {activeTab === 'Settings' ? (
        <BasicScreenCard>
          <UserSettingsScreen user={_user} />
        </BasicScreenCard>
      ) : null}
      <BottomNavBar activeTab={activeTab} aiEnabled={isAiEnabled} onTabPress={handleNavPress} />
    </View>
  );
}
