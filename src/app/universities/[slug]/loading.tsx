export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-2/3 animate-pulse rounded-xl bg-surface-2" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />)}
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
