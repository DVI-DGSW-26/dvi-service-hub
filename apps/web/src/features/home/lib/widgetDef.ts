// 위젯 정의의 모양과 갤러리 공용 값 — 위젯 목록(components/registry)과 판 · 갤러리가 같이 쓴다
import type { ReactNode } from 'react'
import type { DecorKind, DecorPos } from '@/features/decor'
import type { Access, Service } from '@/features/systems'
import type { Messages } from '@/shared/i18n'
import type { Me } from '@/shared/types'
import type { StackSize } from '@/shared/widget'
import type { WidgetSize } from './widgetLayout'

/** 위젯이 그릴 때 받는 것 — 홈 화면이 가진 것을 그대로 넘긴다 */
export interface WidgetContext {
  me: Me | null
  meLoading: boolean
  /** 권한으로 거르고 즐겨찾기 순으로 정렬한 목록 */
  services: Service[]
  allServices: Service[]
  favorites: string[]
  onToggleFavorite: (id: string) => void
  /** 인사 카드 배경 그림과 자리 — 위젯 편집의 꾸미기에서 고른 것, 없으면 기본 건물 그림 */
  hero?: { src: string; pos: DecorPos } | null
  size: WidgetSize
  /** 좁은 화면에서 고른 크기 — 넓은 화면 칸 판에서는 없다(칸이 그려진 px 로 정하는 size 를 쓴다) */
  stack?: StackSize
}

export interface WidgetDef {
  /** 저장되는 이름 — 바꾸면 저장해 둔 배치에서 빠진다 */
  type: string
  /** 갤러리 묶음 — 'portal'(허브 자체) 또는 services.ts 의 id. 그 서비스가 안 보이는 사람에게는 위젯도 안 보인다 */
  app: string
  title: string | ((t: Messages) => string)
  description: string | ((t: Messages) => string)
  /** 그릴 수 있는 크기 — 칸이 클수록 큰 것으로 그린다. 가장 작은 것이 이 위젯의 최소 크기(lib/widgetLayout.ts 의 PX) */
  sizes: WidgetSize[]
  /** 최소 크기(px)를 따로 정할 때 — 내용이 sizes 의 기본 최소(PX)보다 더 있어야 안 잘리는 위젯 */
  min?: { w: number; h: number }
  /** 좁은 화면에서 고를 수 있는 크기 — 없으면 보통만(크기 버튼이 안 나온다). 작게(반 폭)는 그 위젯에 작은 모양이 있을 때만 */
  stack?: StackSize[]
  /** 서비스 안에서 역할이 더 필요한 위젯 (연구노트 책임자용 등). 숨기는 것은 안내이고, 막는 건 그 서비스다 */
  access?: Access
  /** 편집 중 위젯 위에 그림 바꾸기 메뉴를 띄울 꾸미기 그림 — 인사 카드 */
  decor?: DecorKind
  render: (ctx: WidgetContext) => ReactNode
}

/**
 * 위젯 갤러리(넣기 · 빼기)를 쓰는지 — 고를 서비스 위젯이 목업에만 있어 pnpm dev:mock · Vercel 미리보기에서만.
 * 운영 · pnpm dev 의 편집은 옮기기 · 크기 조절만이고 사이드바는 그대로 둔다(빼면 다시 넣을 곳이 없어 빼기도 없다)
 */
export const GALLERY = import.meta.env.VITE_MOCK

/** 갤러리에서 브라우저 끌어 놓기로 끄는 위젯 — 위젯 판이 dragover 중에 읽는다(dataTransfer 는 놓을 때만 읽힌다) */
export const galleryDrag = { type: '' }

export const text = (v: WidgetDef['title'], t: Messages) => (typeof v === 'string' ? v : v(t))
