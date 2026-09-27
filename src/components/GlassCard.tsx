import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Kept for backwards compatibility; no longer changes the look. */
  glow?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  hoverable = false,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card p-5 ${hoverable ? 'card-interactive cursor-pointer' : ''} ${
        onClick && !hoverable ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
