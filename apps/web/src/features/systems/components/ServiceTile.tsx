import type { Service } from '../lib/services'
import { markUsed } from '../api/queries'
import { useI18n } from '@/shared/i18n'
import { ServiceLogo } from './ServiceCard'

/**
 * 업무시스템 아이콘 보기의 한 칸 — 휴대폰 홈 화면처럼 로고와 이름만, 누르면 첫 링크로 간다.
 * 설명 · 로그인 방식 · 즐겨찾기 별은 카드 · 리스트 보기에서(설명은 마우스를 올리면 보인다)
 */
export function ServiceTile({ service: s }: { service: Service }) {
  const { t } = useI18n()
  return (
    <li>
      <a
        href={s.links[0].url}
        onClick={() => markUsed(s.id)}
        target="_blank"
        rel="noreferrer"
        title={s.description}
        className="flex flex-col items-center gap-2 rounded-2xl px-1 py-2 text-center transition-[background-color,scale] duration-150 hover:bg-subtle active:scale-95"
      >
        <ServiceLogo service={s} size="xl" />
        <span className="w-full truncate text-[13px] font-semibold">
          {s.name}
          <span className="sr-only"> {t.common.newTab}</span>
        </span>
      </a>
    </li>
  )
}
