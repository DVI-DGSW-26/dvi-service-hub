import { placeStack } from '@dvi/core/widget'
import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { usePalette } from '@/constants/theme'
import { f, t } from '@/lib/i18n'
import { nextSize, type HomeWidget } from '@/lib/widgets'
import { WidgetCard } from './widget-card'

const GAP = 12

/**
 * 홈 위젯 판 — 웹 좁은 화면과 같은 4칸 정사각 격자. RN 에는 CSS grid 가 없어 자리는 @dvi/core/widget 의 placeStack 으로 계산한다.
 * 위젯을 길게 누르면 그 위젯이 그릴 수 있는 다음 크기로 바뀐다
 */
export function WidgetGrid({ widgets, onChange }: { widgets: HomeWidget[]; onChange: (next: HomeWidget[]) => void }) {
  const c = usePalette()
  const [width, setWidth] = useState(0)
  const cells = placeStack(widgets.map((w) => w.size))
  const unit = (width - GAP * 3) / 4
  const rows = Math.max(0, ...cells.map((p) => p.y + p.h))
  const span = (n: number) => n * unit + (n - 1) * GAP

  const resize = (id: string) => onChange(widgets.map((w) => (w.id === id ? { ...w, size: nextSize(w) } : w)))

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: width && rows ? span(rows) : 0 }}>
      {width > 0 &&
        widgets.map((w, i) => {
          const p = cells[i]
          return (
            <Pressable
              key={w.id}
              onLongPress={() => resize(w.id)}
              accessibilityHint={f(t.widgets.resizeStack, { name: w.id, size: t.widgets.stackSize[nextSize(w)] })}
              style={({ pressed }) => [
                styles.cell,
                { left: p.x * (unit + GAP), top: p.y * (unit + GAP), width: span(p.w), height: span(p.h), backgroundColor: c.card, borderColor: c.line },
                pressed && styles.pressed,
              ]}
            >
              <WidgetCard widget={w} />
            </Pressable>
          )
        })}
    </View>
  )
}

const styles = StyleSheet.create({
  cell: { position: 'absolute', borderRadius: 24, borderWidth: StyleSheet.hairlineWidth },
  pressed: { transform: [{ scale: 0.97 }] },
})
