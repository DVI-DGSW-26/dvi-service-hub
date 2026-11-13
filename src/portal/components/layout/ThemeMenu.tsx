import { Palette } from 'lucide-react'
import type { PortalTheme } from '../../hooks/usePortalTheme'
import { usePopover } from '../../hooks/usePopover'
import { ICON_BUTTON, PopoverPanel } from '../ui/Popover'
import { ThemeSettings } from './ThemeSettings'

export function ThemeMenu({ theme }: { theme: PortalTheme }) {
  const { open, toggle, ref } = usePopover()

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label="테마 설정" title="테마 설정" className={ICON_BUTTON}>
        <Palette className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <PopoverPanel label="테마 설정" className="w-[min(312px,calc(100vw-24px))] p-4">
          <ThemeSettings theme={theme} />
        </PopoverPanel>
      )}
    </div>
  )
}
