export function DashboardPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border/60 bg-background/80 px-4 py-6 sm:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}
