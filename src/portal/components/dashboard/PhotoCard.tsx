import workspace from '../../assets/home-workspace.svg'

/** 홈 아래 줄 오른쪽 칸을 채우는 그림 한 장. 실제 사진으로 바꾸려면 import 만 바꾸면 된다. */
export function PhotoCard({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative min-h-56 overflow-hidden rounded-3xl ring-1 ring-line ${className}`}>
      <img src={workspace} alt="" className="absolute inset-0 size-full object-cover dark:brightness-75 dark:saturate-75" />
    </div>
  )
}
