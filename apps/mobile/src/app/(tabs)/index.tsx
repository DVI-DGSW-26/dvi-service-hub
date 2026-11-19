import { services } from '@dvi/core/services'
import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { Screen } from '@/components/screen'
import { WidgetGrid } from '@/components/widget-grid'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'
import { defaultWidgets } from '@/lib/widgets'

// shortcut: 배치는 앱을 닫으면 처음으로 돌아간다, 이어 쓰려면 expo-sqlite/kv-store 등에 저장한다
export default function HomeScreen() {
  const c = usePalette()
  const [widgets, setWidgets] = useState(() => defaultWidgets(services.map((s) => s.id)))
  return (
    <Screen title={t.layout.pages.home}>
      <Text style={[styles.hint, { color: c.muted }]}>{t.widgets.editHintStack}</Text>
      <WidgetGrid widgets={widgets} onChange={setWidgets} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  hint: { fontSize: 13 },
})
