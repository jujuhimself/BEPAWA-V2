import { ReactNode } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: string;
  actions?: ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  icon,
  badge,
  actions,
  isLoading,
  isError,
  error,
  onRetry,
  className,
}: DashboardLayoutProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading your dashboard...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">Something went wrong</h3>
            <p className="text-muted-foreground">{error?.message || "An unexpected error occurred"}</p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      <div className="container mx-auto px-4 py-6 lg:py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start gap-4">
              {icon && (
                <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                    {title}
                  </h1>
                  {badge && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {badge}
                    </span>
                  )}
                </div>
                {subtitle && (
                  <p className="text-muted-foreground text-sm lg:text-base">{subtitle}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex flex-wrap items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6 lg:space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
