export default function Loading() {
  return (
    <div className="container-app section-y">
      <div className="mx-auto max-w-2xl animate-pulse text-center">
        <div className="mx-auto h-8 w-2/3 rounded-md bg-muted" />
        <div className="mx-auto mt-4 h-4 w-1/2 rounded-md bg-muted" />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="animate-pulse space-y-3 rounded-2xl border border-border/60 p-4">
            <div className="h-40 w-full rounded-xl bg-muted" />
            <div className="h-4 w-3/4 rounded-md bg-muted" />
            <div className="h-3 w-1/2 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
