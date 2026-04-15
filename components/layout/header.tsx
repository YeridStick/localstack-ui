"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AVAILABLE_SERVICES } from "@/config/services";
import { useLocalStackHealth } from "@/hooks/use-localstack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, ChevronRight, Cloud, Globe2 } from "lucide-react";

const STATIC_PAGES: Record<string, string> = {
  "/": "Overview",
  "/services/infrastructure": "Infrastructure",
  "/services/study": "Study Lab",
};

function toTitleCase(value: string): string {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Header() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: health, isFetching } = useLocalStackHealth();

  const breadcrumbs = useMemo(() => {
    if (STATIC_PAGES[pathname]) {
      return ["AWS Local Console", STATIC_PAGES[pathname]];
    }

    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 0) {
      return ["AWS Local Console", "Overview"];
    }

    if (parts[0] === "services" && parts[1]) {
      const service = AVAILABLE_SERVICES.find((item) => item.id === parts[1]);
      const serviceLabel = service?.displayName || toTitleCase(parts[1]);
      const extra = parts.slice(2).map(toTitleCase);
      return ["AWS Local Console", serviceLabel, ...extra];
    }

    return ["AWS Local Console", ...parts.map(toTitleCase)];
  }, [pathname]);

  const endpointLabel = health?.endpoint || "N/A";
  const regionLabel =
    process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || "us-east-1";
  const backend = health?.backend || "unknown";
  const status = health?.status || "unknown";

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Data refreshed");
  };

  return (
    <header className="border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-h-16 items-center justify-between gap-4 px-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {breadcrumbs.map((label, index) => (
            <div key={`${label}-${index}`} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span
                className={
                  index === breadcrumbs.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                }
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden md:flex items-center gap-1">
            <Globe2 className="h-3 w-3" />
            {regionLabel}
          </Badge>
          <Badge variant="outline" className="hidden lg:flex items-center gap-1">
            <Cloud className="h-3 w-3" />
            {backend}
          </Badge>
          <Badge
            variant={status === "healthy" ? "default" : "destructive"}
            className="hidden xl:flex"
          >
            {endpointLabel}
          </Badge>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="h-8"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>
    </header>
  );
}
