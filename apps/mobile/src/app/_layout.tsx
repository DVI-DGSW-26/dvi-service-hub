import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme } from 'react-native'

/** 앱 뿌리 — 테마(밝게 · 어둡게는 기기 설정)와 스택. 탭은 (tabs)/_layout 이 그린다 */
export default function RootLayout() {
  const dark = useColorScheme() === 'dark'
  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </ThemeProvider>
  )
}
