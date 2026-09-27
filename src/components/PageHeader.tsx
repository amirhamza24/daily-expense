import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}

export default function PageHeader({ title, description, actions, icon: Icon }: PageHeaderProps) {
  return (
    <div className="page-hero">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          {Icon && (
            <span className="icon-tile icon-tile-solid h-11 w-11 rounded-xl animate-pop-in">
              <Icon className="h-5! w-5!" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="page-title">{title}</h1>
            {description && <p className="page-subtitle">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
