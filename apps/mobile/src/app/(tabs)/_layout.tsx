import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import { withLayoutContext } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'

// 화면을 옆으로 밀어 탭을 넘기려고 material top tabs(react-native-tab-view · pager-view)를 아래에 둔다 — docs/adr/0006.
// 네이티브 탭(expo-router/unstable-native-tabs)은 플랫폼 탭 바 모양이 좋지만 화면 밀기가 없다
const { Navigator } = createMaterialTopTabNavigator()
const Tabs = withLayoutContext(Navigator)

export default function TabLayout() {
  const c = usePalette()
  const insets = useSafeAreaInsets()
  const pages = t.layout.pages
  return (
    <Tabs
      tabBarPosition="bottom"
      style={{ paddingTop: insets.top, backgroundColor: c.bg }}
      screenOptions={{
        swipeEnabled: true,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.card, paddingBottom: insets.bottom, borderTopColor: c.line, borderTopWidth: 1 },
        tabBarIndicatorStyle: { backgroundColor: c.accent, top: 0 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600', textTransform: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: pages.home }} />
      <Tabs.Screen name="systems" options={{ title: pages.systems }} />
      <Tabs.Screen name="info" options={{ title: pages.info }} />
      <Tabs.Screen name="account" options={{ title: pages.account }} />
    </Tabs>
  )
}
