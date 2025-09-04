import React from 'react';
import { cn } from '../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'disabled';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className,
  disabled,
  ...props
}) => {
  const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-all duration-150 focus:outline-none focus:ring-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white focus:ring-purple-500',
    secondary: 'glass-effect text-white hover:bg-white/20 border border-white/20 focus:ring-white/50',
    disabled: 'bg-gray-600 text-gray-400 cursor-not-allowed',
  };
  
  const variantClass = disabled ? variants.disabled : variants[variant];
  
  return (
    <button
      className={cn(baseClasses, variantClass, className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};