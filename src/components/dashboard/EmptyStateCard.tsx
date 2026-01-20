import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-8 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button asChild size="sm">
            <Link to={action.href}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} size="sm">
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

export default EmptyStateCard;
