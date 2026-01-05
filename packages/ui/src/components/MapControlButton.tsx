import React from 'react';

export interface MapControlButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'aria-label'> {
  label: string;
  unstyled?: boolean;
}

export function MapControlButton({
  label,
  unstyled = false,
  className = '',
  onContextMenu,
  ...props
}: MapControlButtonProps) {
  const baseClassName =
    'flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg transition-all hover:bg-gray-100 active:scale-95 select-none';

  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      draggable={false}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e);
      }}
      style={{ WebkitTouchCallout: 'none', ...props.style }}
      className={`${unstyled ? '' : baseClassName} ${className}`}
    />
  );
}
