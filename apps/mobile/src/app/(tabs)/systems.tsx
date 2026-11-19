import { services } from '@dvi/core/services'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Screen } from '@/components/screen'
import { openUrl } from '@/components/widget-card'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'

// shortcut: 로그인 전이라 권한(canSee)으로 거르지 않고 모두 보인다, 앱 로그인을 붙이면 웹처럼 canSee(s, me) 로 거른다
export default function SystemsScreen() {
  const c = usePalette()
  return (
    <Screen title={t.home.systems.title}>
      {services.map((s) => (
        <Pressable
          key={s.id}
          onPress={() => openUrl(s.links[0]?.url)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.row, { backgroundColor: c.card, borderColor: c.line, opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.emoji}>{s.emoji}</Text>
          <View style={styles.text}>
            <Text style={[styles.name, { color: c.fg }]}>{s.name}</Text>
            <Text style={[styles.desc, { color: c.muted }]} numberOfLines={2}>
              {s.description}
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  emoji: { fontSize: 28 },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 13, lineHeight: 18 },
})
