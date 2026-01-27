import { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    className?: string;
}

export default function AnimatedNumber({ value, duration = 1000, className = '' }: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const prevValueRef = useRef(value);

    useEffect(() => {
        const prevValue = prevValueRef.current;
        
        if (prevValue === value) return;

        const startTime = Date.now();
        const difference = value - prevValue;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (easeOutCubic)
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            const currentValue = Math.round(prevValue + difference * easeProgress);
            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
                prevValueRef.current = value;
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return <span className={className}>{displayValue.toLocaleString()}</span>;
}
