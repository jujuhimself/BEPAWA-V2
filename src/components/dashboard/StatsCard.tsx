import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variantStyles = {
  default: {
    card: "bg-card border border-border",
    icon: "bg-muted text-muted-foreground",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  primary: {
    card: "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20",
    icon: "bg-primary/20 text-primary",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  success: {
    card: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20",
    icon: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  warning: {
    card: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20",
    icon: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  danger: {
    card: "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20",
    icon: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
  info: {
    card: "bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border border-blue-500/20",
    icon: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
    value: "text-foreground",
    title: "text-muted-foreground",
  },
};

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "default",
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className={cn("text-sm font-medium", styles.title)}>{title}</p>
          <div className="space-y-1">
            <p className={cn("text-2xl lg:text-3xl font-bold tracking-tight", styles.value)}>
              {value}
            </p>
            {(subtitle || trend) && (
              <div className="flex items-center gap-2">
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      trend.value >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {trend.value >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(trend.value)}%
                  </span>
                )}
                {subtitle && (
                  <span className="text-xs text-muted-foreground">{subtitle}</span>
                )}
              </div>
            )}
          </div>
        </div>
        {icon && (
          <div className={cn("rounded-lg p-2.5", styles.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsCard;
