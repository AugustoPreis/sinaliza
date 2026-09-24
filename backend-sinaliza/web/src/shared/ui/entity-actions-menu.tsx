import type { LucideIcon } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { Fragment, type ReactElement } from 'react';

import { Button } from '@shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@shared/ui/dropdown-menu';
import { cn } from '@shared/utils/cn';

export interface IEntityAction {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  variant?: 'destructive';
  separatorBefore?: boolean;
  disabled?: boolean;
}

export interface EntityActionsMenuProps {
  actions: Array<IEntityAction | false | null | undefined>;
  triggerLabel: string;
}

export function EntityActionsMenu({ actions, triggerLabel }: EntityActionsMenuProps): ReactElement {
  const visibleActions = actions.filter((action): action is IEntityAction => Boolean(action));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" aria-label={triggerLabel}>
          <MoreVertical size={16} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-fit min-w-40">
        {visibleActions.map((action, index) => {
          const Icon = action.icon;

          return (
            <Fragment key={action.key}>
              {action.separatorBefore && index > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                onSelect={action.onSelect}
                disabled={action.disabled}
                className={cn(
                  action.variant === 'destructive' &&
                    'text-destructive focus:bg-destructive/10 focus:text-destructive',
                )}
              >
                <Icon size={14} aria-hidden="true" />
                {action.label}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
