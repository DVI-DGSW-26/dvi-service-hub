import { useI18n } from '@/shared/i18n'

/** 위젯을 다 뺐을 때 — 편집을 열어 다시 넣게 한다 */
export function BoardEmpty({ onEdit }: { onEdit: () => void }) {
  const { t } = useI18n()
  return (
    <div className="glass grid w-full place-items-center rounded-3xl px-6 py-20 text-center lg:h-full">
      <div>
        <p className="font-semibold">{t.widgets.empty}</p>
        <p className="mt-1 text-sm text-muted">{t.widgets.emptyHint}</p>
        <button type="button" onClick={onEdit} className="mt-4 h-11 cursor-pointer rounded-xl bg-accent-fill px-5 text-[15px] font-semibold text-white active:scale-95">
          {t.widgets.edit}
        </button>
      </div>
    </div>
  )
}
