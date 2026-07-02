import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function HealthScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen title={t('tabs.health')} hint={t('common.comingSoon')} icon="🫀" />;
}
