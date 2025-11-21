import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    icon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "relative overflow-hidden rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const variants = {
        primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 border border-white/10",
        secondary: "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 hover:border-white/20 shadow-lg shadow-black/20",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20",
        ghost: "hover:bg-white/5 text-zinc-400 hover:text-white"
    };

    const sizes = "py-3.5 px-6 text-sm";

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    {icon}
                    {children}
                </>
            )}

            {/* Shine effect for primary buttons */}
            {variant === 'primary' && !disabled && !isLoading && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />
            )}
        </button>
    );
};
