import { ApplicantStatus } from "@workspace/api-client-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatusBadgeProps {
  status: ApplicantStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  
  let colorClasses = "bg-muted text-muted-foreground border-muted-border";
  let label = status;

  switch (normalized) {
    case "new":
      colorClasses = "bg-info/10 text-info border-info/20";
      label = "New";
      break;
    case "reviewed":
      colorClasses = "bg-warning/10 text-warning border-warning/20";
      label = "Reviewed";
      break;
    case "interviewing":
      colorClasses = "bg-purple-500/10 text-purple-400 border-purple-500/20";
      label = "Interviewing";
      break;
    case "hired":
      colorClasses = "bg-success/10 text-success border-success/20";
      label = "Hired";
      break;
    case "rejected":
      colorClasses = "bg-destructive/10 text-destructive border-destructive/20";
      label = "Rejected";
      break;
    case "archived":
      colorClasses = "bg-muted text-muted-foreground border-muted-border";
      label = "Archived";
      break;
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      colorClasses,
      className
    )}>
      {label}
    </span>
  );
}
