import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { LogoutSheet } from '@/components/logout-sheet'
import { Screen } from '@/components/screen'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'

export default function AccountScreen() {
  const c = usePalette()
  const [confirm, setConfirm] = useState(false)
  const logout = t.account.logout
  // shortcut: 앱 로그인(OIDC) 전이라 끊을 세션이 없어 홈으로만 보낸다, 로그인을 붙이면 토큰 지우기 · end_session 호출로 바꾼다
  const signOut = () => {
    setConfirm(false)
    router.navigate('/')
  }
  return (
    <Screen title={t.account.title}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
        <Text style={[styles.title, { color: c.fg }]}>{logout.title}</Text>
        <Text style={[styles.body, { color: c.muted }]}>{logout.body}</Text>
        <Pressable onPress={() => setConfirm(true)} accessibilityRole="button" style={({ pressed }) => [styles.button, { backgroundColor: c.dangerSoft, opacity: pressed ? 0.7 : 1 }]}>
          <Text style={[styles.buttonText, { color: c.danger }]}>{logout.action}</Text>
        </Pressable>
      </View>
      <LogoutSheet open={confirm} onClose={() => setConfirm(false)} onConfirm={signOut} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, gap: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  button: { marginTop: 10, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
})
