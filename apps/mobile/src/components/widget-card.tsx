import { services } from '@dvi/core/services'
import { isMini, lookOf } from '@dvi/core/widget'
import * as WebBrowser from 'expo-web-browser'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { usePalette } from '@/constants/theme'
import { locale, t } from '@/lib/i18n'
import type { HomeWidget } from '@/lib/widgets'

export const openUrl = (url: string | undefined) => void (url && WebBrowser.openBrowserAsync(url))

/** 위젯 하나의 내용 — 크기(lookOf)에 따라 보여주는 양을 줄인다. 길게 누르기는 판(WidgetGrid)이 받는다 */
export function WidgetCard({ widget }: { widget: HomeWidget }) {
  const c = usePalette()
  const look = lookOf(widget.size)
  const mini = isMini(widget.size)

  if (widget.kind === 'service') {
    const s = services.find((x) => x.id === widget.service)
    if (!s) return null
    return (
      <View style={[styles.fill, widget.size === '2x1' ? styles.row : styles.center]}>
        <Text style={styles.emoji}>{s.emoji}</Text>
        {widget.size !== '1x1' && (
          <Text style={[styles.label, { color: c.fg }]} numberOfLines={2}>
            {s.name}
          </Text>
        )}
      </View>
    )
  }

  if (widget.kind === 'hero') {
    const today = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
    return (
      <View style={[styles.fill, styles.pad, { backgroundColor: c.accent }]}>
        <Text style={styles.heroDate}>{today}</Text>
        {!mini && <Text style={styles.heroTitle}>{t.widgets.builtin.hero.title}</Text>}
      </View>
    )
  }

  // 업무시스템 — 크기만큼 바로가기를 늘어놓는다
  const count = mini || look === 's' ? 4 : look === 'w' ? 6 : 12
  return (
    <View style={[styles.fill, styles.pad]}>
      {!mini && <Text style={[styles.cardTitle, { color: c.muted }]}>{t.home.systems.title}</Text>}
      <View style={styles.grid}>
        {services.slice(0, count).map((s) => (
          <Pressable
            key={s.id}
            onPress={() => openUrl(s.links[0]?.url)}
            accessibilityRole="link"
            accessibilityLabel={s.name}
            style={({ pressed }) => [styles.app, mini && styles.appMini, { backgroundColor: c.accentSoft, opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.appEmoji}>{s.emoji}</Text>
            {!mini && (
              <Text style={[styles.appName, { color: c.fg }]} numberOfLines={1}>
                {s.name}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1, borderRadius: 24, overflow: 'hidden' },
  pad: { padding: 14, gap: 8 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  emoji: { fontSize: 26 },
  label: { flexShrink: 1, fontSize: 13, fontWeight: '600' },
  heroDate: { color: '#fff', fontSize: 15, fontWeight: '600', opacity: 0.9 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 'auto' },
  cardTitle: { fontSize: 13, fontWeight: '600' },
  grid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignContent: 'flex-start' },
  app: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 14 },
  appMini: { width: 'auto', flex: 1, justifyContent: 'center' },
  appEmoji: { fontSize: 18 },
  appName: { flexShrink: 1, fontSize: 13, fontWeight: '600' },
})
