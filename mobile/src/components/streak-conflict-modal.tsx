import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { elapsedFrom } from '@/utils/elapsed-time';

import { ThemedText } from './themed-text';

/** Which streak the user chose to keep. */
export type StreakChoice = 'local' | 'account';

export type StreakConflictPayload = {
  /** ISO start of the on-device (guest) streak. */
  localStartedAt: string;
  /** ISO start of the account (backend) streak. */
  accountStartedAt: string;
};

// ---- Module-level bridge --------------------------------------------------
// use-auth resolves the conflict from a plain async function (outside React),
// so we expose a module-level requestStreakChoice() that the mounted host wires
// up. The host registers its opener on mount; the function rejects to a safe
// default ('account') if no host is mounted.

type Opener = (payload: StreakConflictPayload) => Promise<StreakChoice>;
let opener: Opener | null = null;

/**
 * Ask the user which streak to keep. Shows the Sükût conflict sheet if a host is
 * mounted; otherwise falls back to 'account' (the safer default — usually the
 * longer, harder-won streak).
 */
export function requestStreakChoice(payload: StreakConflictPayload): Promise<StreakChoice> {
  if (!opener) return Promise.resolve('account');
  return opener(payload);
}

// ---- Host component (render once at the app root) --------------------------

type PendingState = {
  payload: StreakConflictPayload;
  resolve: (choice: StreakChoice) => void;
};

/**
 * Renders the streak-conflict bottom sheet and registers the module-level
 * opener. Mount once near the app root (above the navigator).
 */
export function StreakConflictHost() {
  const [pending, setPending] = useState<PendingState | null>(null);

  useEffect(() => {
    opener = (payload) =>
      new Promise<StreakChoice>((resolve) => {
        setPending({ payload, resolve });
      });
    return () => {
      opener = null;
    };
  }, []);

  function settle(choice: StreakChoice) {
    pending?.resolve(choice);
    setPending(null);
  }

  if (!pending) return null;

  // A plain absolute-fill overlay, not RN's <Modal>: the login screen is itself
  // presented as a native modal (Stack.Screen presentation:'modal'), and iOS
  // silently fails to show a second native modal stacked on top of one already
  // presented — the sheet would never appear even though this component's state
  // was updating correctly. An overlay has no such native-stacking limitation.
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Sheet payload={pending.payload} onChoose={settle} />
    </View>
  );
}

function Sheet({
  payload,
  onChoose,
}: {
  payload: StreakConflictPayload;
  onChoose: (choice: StreakChoice) => void;
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [selected, setSelected] = useState<StreakChoice>('account');

  const localDays = elapsedFrom(payload.localStartedAt).days;
  const accountDays = elapsedFrom(payload.accountStartedAt).days;
  const localDate = formatDate(payload.localStartedAt, i18n.language);
  const accountDate = formatDate(payload.accountStartedAt, i18n.language);

  const confirmLabel =
    selected === 'account'
      ? t('sync.confirmAccount')
      : t('sync.confirmLocal');

  return (
    <View style={styles.backdrop}>
      {/* Tap outside → safe default (account). */}
      <Pressable style={styles.scrim} onPress={() => onChoose('account')} />

      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />

        <ThemedText type="subtitle" style={styles.title}>
          {t('sync.conflictTitle')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.lede}>
          {t('sync.conflictLede')}
        </ThemedText>

        <View style={styles.choices}>
          <ChoiceCard
            icon="☁️"
            source={t('sync.sourceAccount')}
            days={t('home.dashboard.remDay', { count: accountDays })}
            date={t('sync.startedOn', { date: accountDate })}
            selected={selected === 'account'}
            onPress={() => setSelected('account')}
          />
          <ChoiceCard
            icon="📱"
            source={t('sync.sourceLocal')}
            days={t('home.dashboard.remDay', { count: localDays })}
            date={t('sync.startedOn', { date: localDate })}
            selected={selected === 'local'}
            onPress={() => setSelected('local')}
          />
        </View>

        <ThemedText type="small" themeColor="textTertiary" style={styles.warn}>
          {t('sync.conflictWarn')}
        </ThemedText>

        <Pressable
          onPress={() => onChoose(selected)}
          style={({ pressed }) => [
            styles.confirm,
            { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <ThemedText type="smallBold" themeColor="onPrimary" style={styles.confirmText}>
            {confirmLabel}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

function ChoiceCard({
  icon,
  source,
  days,
  date,
  selected,
  onPress,
}: {
  icon: string;
  source: string;
  days: string;
  date: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.choice,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.primaryMuted : theme.background,
        },
      ]}
    >
      <View style={[styles.choiceIcon, { backgroundColor: selected ? theme.background : theme.backgroundElement }]}>
        <ThemedText style={styles.choiceIconGlyph}>{icon}</ThemedText>
      </View>
      <View style={styles.choiceMeta}>
        <ThemedText type="eyebrow" themeColor={selected ? 'primaryText' : 'textTertiary'}>
          {source}
        </ThemedText>
        <ThemedText type="title" style={styles.choiceDays}>
          {days}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {date}
        </ThemedText>
      </View>
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.borderStrong }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

/** Localized "28 Mayıs 2026" style date. */
function formatDate(iso: string, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 12, 10, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -12 },
    elevation: 24,
  },
  grabber: {
    width: 38,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    marginBottom: Spacing.four,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  lede: {
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 19,
  },
  choices: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: Spacing.three,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceIconGlyph: {
    fontSize: 20,
    lineHeight: 24,
  },
  choiceMeta: {
    flex: 1,
    gap: 2,
  },
  choiceDays: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  warn: {
    textAlign: 'center',
    marginTop: Spacing.three,
    lineHeight: 18,
  },
  confirm: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    lineHeight: 20,
  },
});
