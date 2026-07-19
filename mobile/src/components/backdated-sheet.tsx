import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppTheme } from '@/theme/theme-provider';

import { ThemedText } from './themed-text';

/**
 * "I quit earlier" — a minimal Sükût bottom-sheet for backdating a streak start: just a date
 * picker. On iOS the spinner is always inline; on Android (no inline picker) a single row shows the
 * chosen date and taps open the native dialog. Future dates are impossible (maximumDate = today).
 *
 * Controlled: parent shows it with `visible` and gets the chosen `Date` via `onConfirm` (midnight of
 * the picked day, local time) or `onCancel`.
 */
export function BackdatedSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {visible ? <Sheet onConfirm={onConfirm} onCancel={onCancel} /> : null}
    </Modal>
  );
}

/** Local-time midnight `days` days before today. */
function midnightDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function Sheet({ onConfirm, onCancel }: { onConfirm: (date: Date) => void; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { scheme } = useAppTheme();

  // Default: yesterday — the mildest "earlier" a user would mean.
  const [selected, setSelected] = useState<Date>(() => midnightDaysAgo(1));
  // Android has no inline picker; it opens as a dialog on demand. iOS shows the spinner inline.
  const [androidPickerOpen, setAndroidPickerOpen] = useState(false);

  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow picking today; block the future

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') setAndroidPickerOpen(false);
    if (event.type === 'dismissed' || !date) return;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    setSelected(d);
  }

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={t('home.backdatedSheet.cancel')} />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />

        <ThemedText type="subtitle" style={styles.title}>
          {t('home.backdatedSheet.title')}
        </ThemedText>

        {/* iOS: inline spinner. Android: a tappable row showing the chosen date (opens the dialog). */}
        {Platform.OS === 'ios' ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={selected}
              mode="date"
              display="spinner"
              maximumDate={today}
              // Spinner text otherwise inherits a system color that vanishes on our sheet background;
              // pin it to the theme's text color and hint the wheel's light/dark variant.
              textColor={theme.text}
              themeVariant={scheme}
              onChange={onPickerChange}
            />
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => setAndroidPickerOpen(true)}
              style={[styles.dateRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            >
              <CalendarDays color={theme.primaryText} size={20} strokeWidth={1.8} />
              <ThemedText type="smallBold" style={styles.dateRowText}>
                {formatFullDate(selected, i18n.language)}
              </ThemedText>
            </Pressable>
            {androidPickerOpen ? (
              <DateTimePicker
                value={selected}
                mode="date"
                display="default"
                maximumDate={today}
                onChange={onPickerChange}
              />
            ) : null}
          </>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onCancel} style={[styles.btnGhost, { borderColor: theme.border }]}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {t('home.backdatedSheet.cancel')}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => onConfirm(selected)}
            style={({ pressed }) => [
              styles.btnPrimary,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <ThemedText type="smallBold" themeColor="onPrimary">
              {t('home.backdatedSheet.confirm')}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Localized "14 Nisan 2026" style date. */
function formatFullDate(date: Date, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
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
  pickerWrap: {
    marginTop: Spacing.two,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three + 2,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.four,
  },
  dateRowText: {
    fontSize: 16,
    lineHeight: 21,
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
  btnPrimary: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
