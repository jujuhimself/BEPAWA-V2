import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ActivityCardProps {
  title: string;
  subtitle?: string;
  timestamp?: string;
  status?: {
    label: string;
    variant?: "default" | "success" | "warning" | "danger" | "info";
  };
  icon?: ReactNode;
  rightContent?: ReactNode;
  onClick?: () => void;
  className?: string;
}

const statusVariants = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
};

export function ActivityCard({
  title,
  subtitle,
  timestamp,
  status,
  icon,
  rightContent,
  onClick,
  className,
}: ActivityCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all",
        onClick && "cursor-pointer hover:bg-accent/50 hover:shadow-sm",
        className
      )}
    >
      {icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground truncate">{title}</p>
          {status && (
            <Badge
              variant="outline"
              className={cn("text-xs", statusVariants[status.variant || "default"])}
            >
              {status.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {subtitle && <span className="truncate">{subtitle}</span>}
          {subtitle && timestamp && <span>•</span>}
          {timestamp && <span className="shrink-0">{timestamp}</span>}
        </div>
      </div>
      {rightContent && (
        <div className="shrink-0 text-right">
          {rightContent}
        </div>
      )}
    </div>
  );
}

export default ActivityCard;
