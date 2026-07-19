import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/**
 * "Delete your account" — the Sükût confirmation bottom-sheet (same chrome as backdated-sheet /
 * streak-conflict: grabber + scrim + 28px radius). Calm but plain: irreversible, and the streak,
 * badges, and leaderboard place are gone for good. Two buttons — Cancel (neutral) + Delete (filled
 * danger). Delete shows a loading state while the request is in flight.
 *
 * Controlled: parent shows it with `visible`, does the deletion in `onConfirm`, and closes on
 * `onCancel`. `onConfirm` may reject (server failure) — the sheet stays open and surfaces the error.
 */
export function DeleteAccountSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {visible ? <Sheet onConfirm={onConfirm} onCancel={onCancel} /> : null}
    </Modal>
  );
}

function Sheet({ onConfirm, onCancel }: { onConfirm: () => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    if (loading) return;
    setLoading(true);
    setError(false);
    try {
      await onConfirm();
      // On success the parent unmounts this sheet (session drops → screen re-renders).
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <View style={styles.backdrop}>
      <Pressable
        style={styles.scrim}
        onPress={loading ? undefined : onCancel}
        accessibilityLabel={t('settings.deleteSheet.cancel')}
      />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />

        <ThemedText type="subtitle" style={styles.title}>
          {t('settings.deleteSheet.title')}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.body}>
          {t('settings.deleteSheet.body')}
        </ThemedText>

        {error ? (
          <ThemedText type="small" themeColor="danger" style={styles.error}>
            {t('settings.deleteSheet.error')}
          </ThemedText>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={loading ? undefined : onCancel}
            style={[styles.btnGhost, { borderColor: theme.border, opacity: loading ? 0.5 : 1 }]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('settings.deleteSheet.cancel')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading, busy: loading }}
            style={({ pressed }) => [
              styles.btnDanger,
              { backgroundColor: theme.danger, opacity: pressed || loading ? 0.9 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <ThemedText type="smallBold" style={styles.dangerLabel}>
                {t('settings.deleteSheet.confirm')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
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
  body: {
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 20,
  },
  error: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  btnGhost: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  btnDanger: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: {
    color: '#FFFFFF',
  },
});
