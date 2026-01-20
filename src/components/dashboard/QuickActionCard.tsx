import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface QuickActionCardProps {
  title: string;
  description?: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "success" | "warning" | "info";
  badge?: string;
  className?: string;
}

const variantStyles = {
  default: {
    card: "bg-card hover:bg-accent/50 border-border",
    icon: "bg-muted text-muted-foreground",
  },
  primary: {
    card: "bg-card hover:bg-primary/5 border-primary/20 hover:border-primary/40",
    icon: "bg-primary/10 text-primary",
  },
  success: {
    card: "bg-card hover:bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    card: "bg-card hover:bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40",
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  info: {
    card: "bg-card hover:bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40",
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

export function QuickActionCard({
  title,
  description,
  icon,
  href,
  onClick,
  variant = "default",
  badge,
  className,
}: QuickActionCardProps) {
  const styles = variantStyles[variant];

  const content = (
    <div
      className={cn(
        "group relative flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 cursor-pointer hover:shadow-md",
        styles.card,
        className
      )}
    >
      <div className={cn("rounded-lg p-3 shrink-0", styles.icon)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground truncate">{title}</h3>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
}

export default QuickActionCard;
