import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

/**
 * "I quit earlier" — the Sükût bottom-sheet for backdating a streak start (design/sukut/backdated.html
 * direction C: quick chips + a real calendar). Replaces the old 1/3/7-day Alert. The user picks a
 * relative range or the exact day; a live preview always resolves it to a full date + "N days ago",
 * so the choice is unambiguous. Future dates are impossible (the backend rejects them with 422).
 *
 * Controlled: parent shows it with `visible` and gets the chosen `Date` via `onConfirm` (midnight of
 * the picked day, in local time) or `onCancel`.
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

/** Quick-range chips, in days before today. */
const CHIPS: { key: string; days: number }[] = [
  { key: 'chipYesterday', days: 1 },
  { key: 'chip3d', days: 3 },
  { key: 'chip1w', days: 7 },
  { key: 'chip2w', days: 14 },
  { key: 'chip1m', days: 30 },
  { key: 'chip3m', days: 90 },
];

/** Local-time midnight `daysAgo` days before today. */
function midnightDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

/** Whole days between a past midnight date and today (local). */
function daysBetween(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}

function Sheet({ onConfirm, onCancel }: { onConfirm: (date: Date) => void; onCancel: () => void }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  // Default selection: yesterday (the first chip).
  const [selected, setSelected] = useState<Date>(() => midnightDaysAgo(1));
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow picking today; block the future

  const daysAgo = daysBetween(selected);
  // Which chip (if any) matches the current selection, so it stays highlighted.
  const activeChip = CHIPS.find((c) => c.days === daysAgo)?.key ?? null;

  const dateLabel = formatFullDate(selected, i18n.language);
  const weekday = formatWeekday(selected, i18n.language);
  const relLabel =
    daysAgo <= 0
      ? t('home.backdatedSheet.relToday')
      : t('home.backdatedSheet.relDays', { count: daysAgo });

  function onPickerChange(event: DateTimePickerEvent, date?: Date) {
    // Android fires with type 'dismissed' on cancel; iOS keeps the inline picker open.
    if (Platform.OS === 'android') setPickerOpen(false);
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
        <ThemedText type="small" themeColor="textSecondary" style={styles.lede}>
          {t('home.backdatedSheet.lede')}
        </ThemedText>

        {/* Live preview of the resolved date. */}
        <View style={[styles.preview, { backgroundColor: theme.primaryMuted }]}>
          <ThemedText type="smallBold" themeColor="primaryText" style={styles.previewDate}>
            {dateLabel}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.previewRel}>
            {relLabel} · {weekday}
          </ThemedText>
        </View>

        {/* Quick relative chips. */}
        <View style={styles.chips}>
          {CHIPS.map((chip) => {
            const active = activeChip === chip.key;
            return (
              <Pressable
                key={chip.key}
                onPress={() => setSelected(midnightDaysAgo(chip.days))}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.backgroundElement,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText type="smallBold" themeColor={active ? 'primaryText' : 'text'}>
                  {t(`home.backdatedSheet.${chip.key}` as 'home.backdatedSheet.chip3d')}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Exact-day calendar. */}
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[styles.dateBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <View style={styles.dateBtnLeft}>
            <CalendarDays color={theme.primaryText} size={20} strokeWidth={1.8} />
            <ThemedText type="smallBold">{t('home.backdatedSheet.pickDate')}</ThemedText>
          </View>
          <ChevronRight color={theme.textTertiary} size={20} strokeWidth={1.8} />
        </Pressable>

        {/* iOS shows an inline spinner; Android shows a dialog only while open. */}
        {pickerOpen || Platform.OS === 'ios' ? (
          pickerOpen ? (
            <DateTimePicker
              value={selected}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={today}
              onChange={onPickerChange}
            />
          ) : null
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={[styles.btnGhost, { borderColor: theme.border }]}
          >
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

/** Localized weekday ("Salı" / "Tuesday"). */
function formatWeekday(date: Date, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-US', { weekday: 'long' }).format(date);
  } catch {
    return '';
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
  preview: {
    marginTop: Spacing.four,
    borderRadius: 16,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  previewDate: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  previewRel: {
    marginTop: 3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Spacing.three - 3,
    alignItems: 'center',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.three,
  },
  dateBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
