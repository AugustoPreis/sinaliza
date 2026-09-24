import { cn } from '@shared/utils/cn';

export function getSidebarItemClasses(collapsed = false, className?: string): string {
  return cn(
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
    collapsed && 'justify-center px-2',
    className,
  );
}
