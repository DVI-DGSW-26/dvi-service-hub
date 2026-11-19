import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { usePalette } from '@/constants/theme'

/** 탭 화면 틀 — 큰 제목과 세로 스크롤. 탭 바 · 안전 영역은 (tabs)/_layout 이 맡는다 */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  const c = usePalette()
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.body} contentInsetAdjustmentBehavior="automatic">
      <Text style={[styles.title, { color: c.fg }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { padding: 16, paddingTop: 12, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.4 },
})
