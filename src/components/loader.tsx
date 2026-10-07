export function Loader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
      <span className="h-11 w-11 animate-spin rounded-full border-4 border-surface-container-high border-t-primary" />
    </div>
  );
}
