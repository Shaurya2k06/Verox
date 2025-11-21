import React, { useState, useRef, useEffect } from 'react';
import { ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

interface SlideToPayProps {
    onConfirm: () => Promise<void>;
    amount: string;
    token: string;
    disabled?: boolean;
}

export const SlideToPay: React.FC<SlideToPayProps> = ({ onConfirm, amount, token, disabled }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const sliderWidth = 280; // Approximate width of container minus padding
    const maxSlide = sliderWidth - 56; // Width minus button width

    const handleStart = () => {
        if (disabled || completed || loading) return;
        setIsDragging(true);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(clientX - rect.left - 8, maxSlide)); // 8px padding

        setPosition(x);
    };

    const handleEnd = async () => {
        if (!isDragging) return;
        setIsDragging(false);

        if (position >= maxSlide * 0.9) {
            setPosition(maxSlide);
            setLoading(true);
            try {
                await onConfirm();
                setCompleted(true);
            } catch (error) {
                setPosition(0);
                setLoading(false);
            }
        } else {
            setPosition(0);
        }
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleEnd);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleEnd);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, position]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-16 bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden select-none ${completed ? 'bg-emerald-500/10 border-emerald-500/20' : ''}`}
        >
            {/* Background Text */}
            <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isDragging || completed ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-zinc-500 font-medium text-sm animate-pulse">
                    Slide to pay {amount} {token}
                </span>
            </div>

            {/* Progress Bar */}
            <div
                className="absolute top-0 left-0 h-full bg-indigo-500/20 transition-all duration-75"
                style={{ width: `${(position / maxSlide) * 100}%` }}
            />

            {/* Slider Button */}
            <div
                className={`absolute top-1 left-1 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-all duration-75 cursor-grab active:cursor-grabbing z-10 ${completed
                    ? 'bg-emerald-500 text-white left-[calc(100%-3.75rem)]'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                    }`}
                style={{
                    transform: completed ? 'none' : `translateX(${position}px)`,
                    transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseDown={handleStart}
                onTouchStart={handleStart}
            >
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : completed ? (
                    <CheckIcon className="w-8 h-8 animate-[scale-in_0.3s_ease-out]" />
                ) : (
                    <ChevronRightIcon className="w-6 h-6" />
                )}
            </div>
        </div>
    );
};
