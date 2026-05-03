import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`backdrop-blur-md bg-slate-900/60 border border-slate-800 shadow-2xl p-6 md:p-8 ${className}`}>
      {children}
    </div>
  );
};
