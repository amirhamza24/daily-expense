import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function GlassCard({
  children,
  className = '',
  glow = false,
  onClick,
  hoverable = false,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl p-6 transition-all duration-300
        ${glow ? 'glass-panel-glow' : 'glass-panel'}
        ${hoverable ? 'hover:scale-[1.01] hover:border-violet-500/30 hover:shadow-violet-900/10 cursor-pointer' : ''}
        ${onClick && !hoverable ? 'cursor-pointer hover:bg-white/5' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
