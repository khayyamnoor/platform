import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "px-8 py-3 font-space font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider";
  
  const variants = {
    primary: "bg-gradient-to-r from-cyan-600 to-blue-500 text-white hover:from-cyan-500 hover:to-blue-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]",
    secondary: "bg-slate-900 text-cyan-400 border border-slate-700 hover:bg-slate-800 hover:border-cyan-500/50",
    outline: "bg-transparent border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10"
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
