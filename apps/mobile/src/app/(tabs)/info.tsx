import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/screen'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'

// shortcut: 사내정보(조직도 · 소식)는 허브 API 인증이 붙은 뒤 옮긴다 — 지금은 자리만
export default function InfoScreen() {
  const c = usePalette()
  return (
    <Screen title={t.info.title}>
      <Text style={[styles.body, { color: c.muted }]}>{t.info.description}</Text>
      <Text style={[styles.body, { color: c.muted }]}>{t.common.comingSoon}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 22 },
})
