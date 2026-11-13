export function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 px-1">
      <h1 className="text-[clamp(24px,2.6vw,32px)]/tight font-bold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-muted">{description}</p>
    </div>
  )
}
