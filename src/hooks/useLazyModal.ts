import { useState } from 'react'

/**
 * 모달은 처음 열 때 붙이고, 닫는 애니메이션을 위해 그 뒤로는 붙여 둔다.
 * 열 때마다 key 를 바꿔 새로 그린다 — 적다 만 폼 · 지난번 달이 남지 않게(열 때 초기화하는 effect 대신).
 */
export function useLazyModal() {
  const [state, setState] = useState({ open: false, key: 0 })
  return {
    open: state.open,
    mounted: state.key > 0,
    key: state.key,
    show: () => setState((s) => ({ open: true, key: s.key + 1 })),
    close: () => setState((s) => ({ ...s, open: false })),
  }
}
