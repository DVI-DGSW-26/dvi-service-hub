import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from '@/constants/theme'
import { t } from '@/lib/i18n'

/**
 * 로그아웃 확인 — 아래에서 올라오는 바텀시트(RN 기본 Modal). 웹 LogoutConfirm 과 같은 문구(@dvi/core/i18n).
 * 어두운 막 · 취소 · 안드로이드 뒤로 가기로 닫힌다
 */
export function LogoutSheet({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  const c = usePalette()
  const insets = useSafeAreaInsets()
  const copy = t.account.logout.confirm
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel={t.common.close} />
      <View style={[styles.sheet, { backgroundColor: c.card, paddingBottom: 20 + insets.bottom }]} accessibilityViewIsModal>
        <View style={[styles.handle, { backgroundColor: c.line }]} />
        <Text style={[styles.title, { color: c.fg }]} accessibilityRole="header">
          {copy.title}
        </Text>
        <Text style={[styles.body, { color: c.muted }]}>{copy.body}</Text>
        <View style={styles.actions}>
          <Pressable onPress={onClose} accessibilityRole="button" style={[styles.button, { backgroundColor: c.bg }]}>
            <Text style={[styles.buttonText, { color: c.fg }]}>{copy.cancel}</Text>
          </Pressable>
          <Pressable onPress={onConfirm} accessibilityRole="button" style={[styles.button, { backgroundColor: c.danger }]}>
            <Text style={[styles.buttonText, styles.onDanger]}>{copy.action}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginBottom: 18 },
  title: { fontSize: 20, fontWeight: '700' },
  body: { marginTop: 6, fontSize: 15, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 24 },
  button: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '600' },
  onDanger: { color: '#fff' },
})
