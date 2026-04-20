import { useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated';
import { BasicScreenCard } from './BasicScreenCard';
import { BottomNavBar, type NavItem } from './BottomNavBar';
import { FeedListScreen, type FeedListPage } from './FeedListScreen';
import { NewsScreen } from './NewsScreen';
import { UserSettingsScreen } from './UserSettingsScreen';

type HomeScreenProps = {
  user: User;
};

export function HomeScreen({ user: _user }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<NavItem>('Home');
  const [aiOpenSignal, setAiOpenSignal] = useState(0);
  const [addFeedSignal, setAddFeedSignal] = useState(0);
  const [feedListPage, setFeedListPage] = useState<FeedListPage>('rss-links');
  const isAiEnabled = activeTab === 'Home' || activeTab === 'Feed';
  const isAddFeedEnabled = activeTab === 'Feed List' && feedListPage === 'rss-links';
  const isCenterActionEnabled = isAiEnabled || isAddFeedEnabled;
  const centerIcon = activeTab === 'Feed List' ? 'add' : 'sparkles';
  const orderedTabs: NavItem[] = ['Home', 'Feed', 'Feed List', 'Settings'];
  const previousTabRef = useRef<NavItem>('Home');

  function handleNavPress(tab: NavItem) {
    if (tab === 'AI') {
      if (isAiEnabled) {
        setAiOpenSignal((currentValue) => currentValue + 1);
      } else if (isAddFeedEnabled) {
        setAddFeedSignal((currentValue) => currentValue + 1);
      }

      return;
    }

    previousTabRef.current = activeTab;
    setActiveTab(tab);
  }

  const activeTabIndex = orderedTabs.indexOf(activeTab);
  const previousTabIndex = orderedTabs.indexOf(previousTabRef.current);
  const isMovingForward = activeTabIndex >= previousTabIndex;

  function renderActiveScreen() {
    if (activeTab === 'Home') {
      return <NewsScreen aiOpenSignal={aiOpenSignal} unreadOnly user={_user} />;
    }

    if (activeTab === 'Feed') {
      return <NewsScreen aiOpenSignal={aiOpenSignal} user={_user} />;
    }

    if (activeTab === 'Feed List') {
      return (
        <FeedListScreen addFeedSignal={addFeedSignal} onPageChange={setFeedListPage} user={_user} />
      );
    }

    return (
      <BasicScreenCard>
        <UserSettingsScreen user={_user} />
      </BasicScreenCard>
    );
  }

  return (
    <View className="flex-1 bg-[#f5f1e8] px-4 pb-28 pt-4 md:px-5 md:pt-5">
      <Animated.View
        key={activeTab}
        className="flex-1"
        entering={isMovingForward ? SlideInRight.duration(220) : SlideInLeft.duration(220)}
        exiting={isMovingForward ? SlideOutLeft.duration(180) : SlideOutRight.duration(180)}
        layout={LinearTransition.duration(180)}>
        <Animated.View
          className="flex-1"
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}>
          {renderActiveScreen()}
        </Animated.View>
      </Animated.View>
      <BottomNavBar
        activeTab={activeTab}
        centerEnabled={isCenterActionEnabled}
        centerIcon={centerIcon}
        onTabPress={handleNavPress}
      />
    </View>
  );
}
