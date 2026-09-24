import type { ReactElement, SVGProps } from 'react';

import { cn } from '@shared/utils/cn';

/**
 * "Rota Clara" symbol: three inputs converging into one resolved destination
 * (sinaliza-brand-guidelines-v1.pdf). Uses `currentColor` instead of the
 * brand handoff's hard-coded hex so it inherits `text-*` and adapts to
 * light/dark mode automatically instead of needing separate light/dark SVGs.
 */
export function LogoSymbol({ className, ...props }: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Sinaliza"
      className={cn('text-primary', className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round">
        <path d="M18 25 C36 25 38 50 57 50" />
        <path d="M18 75 C36 75 38 50 57 50" />
        <path d="M18 50 H82" />
        <circle cx={18} cy={25} r={4} fill="currentColor" stroke="none" />
        <circle cx={18} cy={50} r={4} fill="currentColor" stroke="none" />
        <circle cx={18} cy={75} r={4} fill="currentColor" stroke="none" />
        <circle cx={82} cy={50} r={7} fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export interface LogoHorizontalProps extends SVGProps<SVGSVGElement> {
  wordmarkClassName?: string;
}

/** Symbol + "Sinaliza" wordmark. Symbol stays brand teal; the wordmark text
 * follows `text-foreground` so it stays legible in both themes. */
export function LogoHorizontal({
  className,
  wordmarkClassName,
  ...props
}: LogoHorizontalProps): ReactElement {
  return (
    <svg viewBox="0 0 390 100" role="img" aria-label="Sinaliza" className={className} {...props}>
      <g className="text-primary" fill="none" stroke="currentColor" strokeWidth={7} strokeLinecap="round">
        <path d="M18 25 C36 25 38 50 57 50" />
        <path d="M18 75 C36 75 38 50 57 50" />
        <path d="M18 50 H82" />
        <circle cx={18} cy={25} r={4} fill="currentColor" stroke="none" />
        <circle cx={18} cy={50} r={4} fill="currentColor" stroke="none" />
        <circle cx={18} cy={75} r={4} fill="currentColor" stroke="none" />
        <circle cx={82} cy={50} r={7} fill="currentColor" stroke="none" />
      </g>
      {/* eslint-disable i18next/no-literal-string -- brand wordmark, never translated */}
      <text
        x={124}
        y={66}
        className={cn('fill-foreground font-heading', wordmarkClassName)}
        fontSize={52}
        fontWeight={700}
        letterSpacing="-1.5"
      >
        Sinaliza
      </text>
      {/* eslint-enable i18next/no-literal-string */}
    </svg>
  );
}
