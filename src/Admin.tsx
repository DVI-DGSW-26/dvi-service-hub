/**
 * 서비스 관리 — 허브에 보이는 서비스 목록을 고치는 화면.
 *
 * 전에는 src/services.ts 를 고쳐 배포해야 했다. 지금은 여기서 고치면 허브 화면과
 * 모든 서비스의 "서비스 이동" 메뉴에 바로 반영된다.
 *
 * 이 화면이 보이는 것은 안내일 뿐이고, 권한 검사는 서버(/admin/**)가 한다.
 */
import { useEffect, useState, type FormEvent } from 'react'
import {
  ApiError,
  createService,
  deleteService,
  fetchAdminServices,
  reorderServices,
  updateService,
  type AdminService,
  type ServiceInput,
} from './api'
import type { Access, AuthMode } from './services'

const ACCESS_LABEL: Record<Access['type'], string> = {
  employee: '직원 전체',
  client: '서비스 권한',
  any: '항상 표시',
  public: '항상 표시 (공개)',
}

const AUTH_LABEL: Record<AuthMode, string> = {
  sso: '회사 계정',
  separate: '개별 로그인',
  none: '로그인 없음',
}

/** 입력 칸은 전부 문자열로 들고 있다가 저장할 때 서버 모양으로 바꾼다 */
interface Draft {
  id: string
  name: string
  description: string
  category: string
  links: { label: string; url: string }[]
  auth: AuthMode
  accessType: Access['type']
  accessClient: string
  accessRole: string
  logo: string
  emoji: string
  inDevelopment: boolean
  switcherPosition: '' | 'left' | 'right'
  switcherOffset: string
  enabled: boolean
}

const EMPTY: Draft = {
  id: '',
  name: '',
  description: '',
  category: '업무',
  links: [{ label: '열기', url: 'https://' }],
  auth: 'sso',
  accessType: 'employee',
  accessClient: '',
  accessRole: 'user',
  logo: '',
  emoji: '🔗',
  inDevelopment: false,
  switcherPosition: '',
  switcherOffset: '',
  enabled: true,
}

function toDraft(s: AdminService): Draft {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    links: s.links.map((l) => ({ ...l })),
    auth: s.auth,
    accessType: s.access.type,
    accessClient: s.access.type === 'client' ? s.access.client : '',
    accessRole: s.access.type === 'client' ? s.access.role : 'user',
    logo: s.logo ?? '',
    emoji: s.emoji,
    inDevelopment: s.inDevelopment ?? false,
    switcherPosition: s.switcher?.position ?? '',
    switcherOffset: s.switcher?.offset != null ? String(s.switcher.offset) : '',
    enabled: s.enabled,
  }
}

function toInput(d: Draft): ServiceInput {
  const offset = d.switcherOffset.trim() === '' ? null : Number(d.switcherOffset)
  const position = d.switcherPosition === '' ? null : d.switcherPosition
  return {
    id: d.id.trim(),
    name: d.name.trim(),
    description: d.description.trim(),
    category: d.category.trim(),
    links: d.links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    auth: d.auth,
    access:
      d.accessType === 'client'
        ? { type: 'client', client: d.accessClient.trim(), role: d.accessRole.trim() }
        : { type: d.accessType },
    logo: d.logo.trim() === '' ? null : d.logo.trim(),
    emoji: d.emoji.trim(),
    inDevelopment: d.inDevelopment,
    switcher: position === null && offset === null ? null : { position, offset },
    enabled: d.enabled,
  }
}

function message(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return '로그인이 만료되었습니다. 화면을 새로 고쳐 다시 로그인해 주세요.'
    if (e.status === 403) return '서비스를 관리할 권한이 없습니다.'
    return e.message
  }
  return '서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'
}

export default function Admin({ onChanged }: { onChanged: () => void }) {
  const [list, setList] = useState<AdminService[] | null>(null)
  const [error, setError] = useState('')
  /** null 이면 폼을 닫은 상태. editingId 가 null 이면 새로 등록 */
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = () =>
    fetchAdminServices()
      .then((data) => { setList(data); setError('') })
      .catch((e) => setError(message(e)))

  useEffect(() => { load() }, [])

  /** 서버에 반영한 뒤 관리 목록과 허브 화면 목록을 모두 다시 받는다 */
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
      onChanged()
      return true
    } catch (e) {
      setError(message(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const openNew = () => { setEditingId(null); setDraft({ ...EMPTY, links: EMPTY.links.map((l) => ({ ...l })) }) }
  const openEdit = (s: AdminService) => { setEditingId(s.id); setDraft(toDraft(s)) }
  const close = () => { setDraft(null); setEditingId(null) }

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!draft) return
    const input = toInput(draft)
    const ok = await run(() => (editingId ? updateService(editingId, input) : createService(input)))
    if (ok) close()
  }

  const move = (index: number, delta: -1 | 1) => {
    if (!list) return
    const next = [...list]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setList(next)
    run(() => reorderServices(next.map((s) => s.id)))
  }

  const toggleEnabled = (s: AdminService) =>
    run(() => updateService(s.id, toInput({ ...toDraft(s), enabled: !s.enabled })))

  const remove = (s: AdminService) => {
    const sure = window.confirm(
      `'${s.name}'을(를) 삭제할까요?\n\n직원들의 즐겨찾기·최근 사용 기록에서도 함께 지워지고 되돌릴 수 없습니다.\n잠깐 감추려면 삭제 대신 '숨김'을 쓰세요.`,
    )
    if (sure) run(() => deleteService(s.id))
  }

  return (
    <section className="admin" aria-label="서비스 관리">
      <div className="admin-head">
        <div>
          <h1>서비스 관리</h1>
          <p>여기서 고치면 허브 화면과 각 서비스의 이동 메뉴에 바로 반영됩니다.</p>
        </div>
        {!draft && (
          <button type="button" className="btn primary" onClick={openNew}>
            서비스 추가
          </button>
        )}
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {draft && (
        <ServiceForm
          draft={draft}
          isNew={editingId === null}
          busy={busy}
          onChange={setDraft}
          onSubmit={save}
          onCancel={close}
        />
      )}

      {list === null ? (
        !error && <p className="empty">불러오는 중…</p>
      ) : (
        <ul className="admin-list">
          {list.map((s, i) => (
            <li key={s.id} className={s.enabled ? 'admin-row' : 'admin-row hidden'}>
              <div className="admin-order">
                <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`${s.name} 위로`}>
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={busy || i === list.length - 1}
                  aria-label={`${s.name} 아래로`}
                >
                  ↓
                </button>
              </div>
              {s.logo ? (
                <img className="logo" src={s.logo} alt="" width={36} height={36} />
              ) : (
                <span className="emoji" aria-hidden>{s.emoji}</span>
              )}
              <div className="admin-info">
                <div className="admin-name">
                  <b>{s.name}</b>
                  <span className="tag">{s.category}</span>
                  {!s.enabled && <span className="auth auth-dev">숨김</span>}
                  {s.inDevelopment && <span className="auth auth-dev">개발 중</span>}
                </div>
                <div className="admin-meta">
                  {s.id} · {AUTH_LABEL[s.auth]} ·{' '}
                  {s.access.type === 'client'
                    ? `${s.access.client} 의 ${s.access.role} 권한`
                    : ACCESS_LABEL[s.access.type]}
                </div>
                <div className="admin-meta">{s.links.map((l) => l.url).join(' · ')}</div>
              </div>
              <div className="admin-actions">
                <button type="button" className="btn" onClick={() => toggleEnabled(s)} disabled={busy}>
                  {s.enabled ? '숨김' : '보이기'}
                </button>
                <button type="button" className="btn" onClick={() => openEdit(s)} disabled={busy}>
                  수정
                </button>
                <button type="button" className="btn danger" onClick={() => remove(s)} disabled={busy}>
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function ServiceForm({
  draft: d,
  isNew,
  busy,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: Draft
  isNew: boolean
  busy: boolean
  onChange: (next: Draft) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
}) {
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => onChange({ ...d, [key]: value })
  const setLink = (index: number, key: 'label' | 'url', value: string) =>
    set('links', d.links.map((l, i) => (i === index ? { ...l, [key]: value } : l)))

  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <h2>{isNew ? '서비스 추가' : `'${d.name}' 수정`}</h2>

      <div className="fields">
        <label>
          이름
          <input value={d.name} onChange={(e) => set('name', e.target.value)} required maxLength={100} autoFocus />
        </label>
        <label>
          ID
          <input
            value={d.id}
            onChange={(e) => set('id', e.target.value)}
            required
            disabled={!isNew}
            pattern="[a-z0-9][a-z0-9\-]{0,49}"
            placeholder="예: honey-go"
          />
          <small>
            {isNew
              ? '영문 소문자·숫자·하이픈. 등록한 뒤에는 바꿀 수 없습니다.'
              : '즐겨찾기가 이 값으로 연결돼 있어 바꿀 수 없습니다.'}
          </small>
        </label>
        <label className="wide">
          설명
          <input value={d.description} onChange={(e) => set('description', e.target.value)} maxLength={500} />
        </label>
        <label>
          분류
          <input
            value={d.category}
            onChange={(e) => set('category', e.target.value)}
            required
            maxLength={20}
            list="admin-categories"
          />
          <datalist id="admin-categories">
            <option value="업무" />
            <option value="인사" />
            <option value="정보" />
            <option value="사내문화" />
          </datalist>
          <small>새 이름을 적으면 허브에 탭이 하나 더 생깁니다.</small>
        </label>
        <label>
          로그인 방식
          <select value={d.auth} onChange={(e) => set('auth', e.target.value as AuthMode)}>
            <option value="sso">회사 계정 (SSO)</option>
            <option value="separate">개별 로그인</option>
            <option value="none">로그인 없음</option>
          </select>
        </label>
      </div>

      <fieldset>
        <legend>주소</legend>
        {d.links.map((l, i) => (
          <div className="link-row" key={i}>
            <input
              value={l.label}
              onChange={(e) => setLink(i, 'label', e.target.value)}
              required
              maxLength={30}
              placeholder="버튼 글자"
              aria-label={`주소 ${i + 1} 버튼 글자`}
            />
            <input
              type="url"
              value={l.url}
              onChange={(e) => setLink(i, 'url', e.target.value)}
              required
              pattern="https?:\/\/.+"
              placeholder="https://"
              aria-label={`주소 ${i + 1}`}
            />
            {d.links.length > 1 && (
              <button type="button" className="btn" onClick={() => set('links', d.links.filter((_, x) => x !== i))}>
                빼기
              </button>
            )}
          </div>
        ))}
        {d.links.length < 5 && (
          <button type="button" className="btn" onClick={() => set('links', [...d.links, { label: '', url: 'https://' }])}>
            주소 추가
          </button>
        )}
        <small>첫 번째 주소가 카드를 눌렀을 때 가는 곳입니다. 둘 이상이면 카드 아래에 모두 나옵니다.</small>
      </fieldset>

      <fieldset>
        <legend>누구에게 보여줄지</legend>
        <div className="fields">
          <label>
            공개 범위
            <select value={d.accessType} onChange={(e) => set('accessType', e.target.value as Access['type'])}>
              <option value="employee">직원 전체 (부서가 있는 재직자)</option>
              <option value="client">서비스 권한이 있는 사람만</option>
              <option value="any">항상 표시</option>
            </select>
          </label>
          {d.accessType === 'client' && (
            <>
              <label>
                인증 서버의 client ID
                <input
                  value={d.accessClient}
                  onChange={(e) => set('accessClient', e.target.value)}
                  required
                  maxLength={100}
                  placeholder="예: jagigo"
                />
              </label>
              <label>
                필요한 권한(role)
                <input
                  value={d.accessRole}
                  onChange={(e) => set('accessRole', e.target.value)}
                  required
                  maxLength={100}
                  placeholder="user"
                />
              </label>
            </>
          )}
        </div>
        <small>카드를 감추는 것은 안내일 뿐입니다. 실제 접근 차단은 각 서비스가 합니다.</small>
      </fieldset>

      <fieldset>
        <legend>모양</legend>
        <div className="fields">
          <label>
            이모지
            <input value={d.emoji} onChange={(e) => set('emoji', e.target.value)} required maxLength={16} />
            <small>로고가 없을 때 대신 나옵니다.</small>
          </label>
          <label>
            로고
            <input
              value={d.logo}
              onChange={(e) => set('logo', e.target.value)}
              maxLength={300}
              pattern="(\/[^\/\s]\S*|https:\/\/\S+)"
              placeholder="/logos/이름.png 또는 https://"
            />
            <small>허브 저장소의 public/logos 에 넣은 파일 경로나 https 이미지 주소.</small>
          </label>
          <label>
            이동 버튼 자리
            <select
              value={d.switcherPosition}
              onChange={(e) => set('switcherPosition', e.target.value as Draft['switcherPosition'])}
            >
              <option value="">왼쪽 아래 (기본)</option>
              <option value="left">왼쪽 아래</option>
              <option value="right">오른쪽 아래</option>
            </select>
          </label>
          <label>
            이동 버튼 높이 (px)
            <input
              type="number"
              min={0}
              max={400}
              value={d.switcherOffset}
              onChange={(e) => set('switcherOffset', e.target.value)}
              placeholder="20"
            />
            <small>그 서비스 화면 아래에 탭바가 있으면 그 높이 + 20.</small>
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={d.inDevelopment} onChange={(e) => set('inDevelopment', e.target.checked)} />
          개발 중으로 표시
        </label>
        <label className="check">
          <input type="checkbox" checked={!d.enabled} onChange={(e) => set('enabled', !e.target.checked)} />
          허브에서 숨기기
        </label>
      </fieldset>

      <div className="admin-form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? '저장 중…' : isNew ? '등록' : '저장'}
        </button>
      </div>
    </form>
  )
}
