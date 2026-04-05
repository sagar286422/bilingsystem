import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ConsoleSectionPlaceholder({
  title,
  description,
  footnote,
}: {
  title: string;
  description: string;
  footnote?: string;
}) {
  return (
    <div className="px-4 py-8 sm:px-8">
      <Card className="border-dashed border-border/80 bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
          {footnote ? (
            <p className="pt-2 text-xs text-muted-foreground">{footnote}</p>
          ) : null}
        </CardHeader>
      </Card>
    </div>
  );
}
