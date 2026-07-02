import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function BadgesScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.badges')} hint={t('common.comingSoon')} icon="🏅" />;
}
