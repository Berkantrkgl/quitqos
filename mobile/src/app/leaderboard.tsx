import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function LeaderboardScreen() {
  const { t } = useTranslation();
  // Leaderboard is registered-only; a guest sees a sign-in hint, not a rank.
  return (
    <PlaceholderScreen
      title={t('tabs.leaderboard')}
      hint={t('tabs.leaderboardGuestHint')}
      icon="🏆"
    />
  );
}
