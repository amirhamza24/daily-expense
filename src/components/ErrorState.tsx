import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="h-10 w-10 rounded-full bg-danger-soft text-danger flex items-center justify-center mb-3">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-medium text-fg">{title}</h3>
      <p className="text-[13px] text-muted mt-1 max-w-sm">{message}</p>
    </div>
  );
}
