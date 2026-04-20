import React from 'react';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  name: string;
  category: string | null;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}

const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
  year: {
    bg: 'bg-amber-900/80 dark:bg-amber-950/80',
    text: 'text-amber-50 dark:text-amber-200',
    border: 'border-amber-950 dark:border-black',
  },
  person: {
    bg: 'bg-emerald-900/80 dark:bg-emerald-950/80',
    text: 'text-emerald-50 dark:text-emerald-200',
    border: 'border-emerald-950 dark:border-black',
  },
  event: {
    bg: 'bg-rose-900/80 dark:bg-rose-950/80',
    text: 'text-rose-50 dark:text-rose-200',
    border: 'border-rose-950 dark:border-black',
  },
  place: {
    bg: 'bg-slate-800/80 dark:bg-slate-900/80',
    text: 'text-slate-50 dark:text-slate-200',
    border: 'border-slate-950 dark:border-black',
  },
};

const categoryLabels: Record<string, string> = {
  year: '📅',
  person: '👤',
  event: '🎉',
  place: '📍',
};

const TagBadge: React.FC<TagBadgeProps> = ({
  name,
  category,
  onClick,
  removable,
  onRemove,
  size = 'md',
}) => {
  const styles = category && categoryStyles[category] ? categoryStyles[category] : {
    bg: 'bg-secondary',
    text: 'text-secondary-foreground',
    border: 'border-border',
  };

  const emoji = category && categoryLabels[category] ? categoryLabels[category] : '🏷️';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border-t border-b-2 border-x-2 transition-all backdrop-blur-sm',
        'font-serif tracking-wide uppercase', 
        'shadow-[2px_2px_4px_rgba(0,0,0,0.15)]',
        styles.bg,
        styles.text,
        styles.border,
        size === 'sm' ? 'px-2 py-0.5 text-[10px] rounded-[2px]' : 'px-3 py-1 text-xs rounded-md',
        onClick && 'cursor-pointer hover:opacity-90 hover:-translate-y-0.5 hover:-rotate-1 hover:shadow-lg',
        removable && 'pr-1'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <span>{emoji}</span>
      <span className="font-medium">{name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={cn(
            'ml-1 rounded-full hover:bg-foreground/10 transition-colors',
            size === 'sm' ? 'p-0.5' : 'p-1'
          )}
          aria-label={`Quitar etiqueta ${name}`}
        >
          <svg
            className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default TagBadge;
