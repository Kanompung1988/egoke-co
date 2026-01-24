import { useEffect, useRef, useMemo } from 'react'
import { Chart, ArcElement, PieController, Tooltip, Legend } from 'chart.js'
import type { ChartTypeRegistry } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

// Register Chart.js components
Chart.register(ArcElement, PieController, Tooltip, Legend, ChartDataLabels)

type Prize = { label: string; emoji?: string; color?: string }

export default function GameWheel({
    prizes,
    isSpinning,
    onSpin,
    disabled,
    wheelRef,
}: {
    prizes: Prize[]
    isSpinning: boolean
    onSpin: () => void
    disabled: boolean
    wheelRef: React.RefObject<HTMLDivElement>
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const chartRef = useRef<Chart<keyof ChartTypeRegistry> | null>(null)

    // Prepare data for chart
    const chartData = useMemo(() => ({
        labels: prizes.map((_, index) => `${index + 1}`), // Show numbers instead of labels
        datasets: [{
            data: prizes.map(() => 1), // Equal segments
            backgroundColor: prizes.map(p => p.color || '#dc2626'),
            borderColor: '#ffffff',
            borderWidth: 4,
        }]
    }), [prizes])

    // Initialize Chart
    useEffect(() => {
        if (!canvasRef.current) return

        // Destroy existing chart
        if (chartRef.current) {
            chartRef.current.destroy()
        }

        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return

        chartRef.current = new Chart(ctx, {
            type: 'pie',
            data: chartData,
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: true,
                animation: { duration: 0 },
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false },
                    datalabels: {
                        color: '#ffffff',
                        font: {
                            weight: 'bold',
                            size: 18, // Smaller numbers for smaller wheel
                            family: 'system-ui, -apple-system, sans-serif',
                        },
                        textAlign: 'center',
                        formatter: (_, context) => {
                            const label = context.chart.data.labels?.[context.dataIndex] as string
                            return label || ''
                        },
                        textStrokeColor: 'rgba(0,0,0,0.6)',
                        textStrokeWidth: 3,
                    },
                },
            },
        })

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy()
                chartRef.current = null
            }
        }
    }, [chartData])

    return (
        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] aspect-square mx-auto select-none">
            
            {/* Outer Glow */}
            <div 
                className="absolute inset-0 -m-8 rounded-full pointer-events-none"
                style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 65%)',
                }}
            />

            {/* Outer Gold Ring with Lights */}
            <div 
                className="absolute inset-0 -m-4 sm:-m-5 rounded-full p-1.5"
                style={{
                    background: 'linear-gradient(180deg, #fef08a 0%, #eab308 30%, #ca8a04 70%, #a16207 100%)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.6)',
                }}
            >
                {/* Red Inner Border */}
                <div 
                    className="w-full h-full rounded-full p-1 relative"
                    style={{
                        background: 'linear-gradient(180deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)',
                    }}
                >
                    {/* Decorative Light Bulbs */}
                    {[...Array(16)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                            style={{
                                left: `${50 + 46 * Math.cos((i * 22.5 - 90) * Math.PI / 180)}%`,
                                top: `${50 + 46 * Math.sin((i * 22.5 - 90) * Math.PI / 180)}%`,
                                transform: 'translate(-50%, -50%)',
                                background: i % 2 === 0 
                                    ? 'radial-gradient(circle at 30% 30%, #fff9db, #fde047)' 
                                    : 'radial-gradient(circle at 30% 30%, #ffffff, #fbbf24)',
                                boxShadow: `0 0 ${i % 2 === 0 ? '6px 1px' : '4px 1px'} rgba(253, 224, 71, 0.9)`,
                                animation: `lightBlink 0.8s ease-in-out ${i * 0.05}s infinite alternate`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Wheel Container - This is what rotates */}
            <div 
                ref={wheelRef}
                className="relative w-full h-full rounded-full overflow-hidden border-4 border-white"
                style={{ 
                    willChange: 'transform',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)',
                }}
            >
                {/* Chart.js Canvas */}
                <canvas 
                    ref={canvasRef}
                    className="w-full h-full"
                />
            </div>

            {/* Pointer Arrow - Fixed Position (doesn't rotate) */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-30">
                <div 
                    className="relative"
                    style={{
                        filter: 'drop-shadow(-2px 0 4px rgba(0,0,0,0.3))',
                    }}
                >
                    {/* Arrow pointing left */}
                    <div
                        style={{
                            width: 0,
                            height: 0,
                            borderTop: '14px solid transparent',
                            borderBottom: '14px solid transparent',
                            borderRight: '25px solid #fbbf24',
                        }}
                    />
                    {/* Arrow highlight */}
                    <div
                        className="absolute top-1/2 right-0 -translate-y-1/2"
                        style={{
                            width: 0,
                            height: 0,
                            borderTop: '8px solid transparent',
                            borderBottom: '8px solid transparent',
                            borderRight: '14px solid #fef08a',
                        }}
                    />
                </div>
            </div>

            {/* Center Spin Button */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
                <button
                    onClick={onSpin}
                    disabled={disabled}
                    className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex flex-col items-center justify-center font-extrabold transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                        background: 'radial-gradient(circle at 30% 30%, #fef9c3 0%, #fbbf24 45%, #f59e0b 75%, #d97706 100%)',
                        boxShadow: `
                            0 6px 20px rgba(0,0,0,0.4),
                            inset 0 3px 8px rgba(255,255,255,0.8),
                            inset 0 -4px 8px rgba(0,0,0,0.2)
                        `,
                        border: '4px solid #fff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                >
                    {isSpinning ? (
                        <span className="text-2xl sm:text-3xl animate-spin">🎰</span>
                    ) : (
                        <div className="flex flex-col items-center leading-none">
                            <span 
                                className="text-base sm:text-lg md:text-xl font-black tracking-wider"
                                style={{ 
                                    color: '#92400e',
                                    textShadow: '0 1px 2px rgba(255,255,255,0.6)',
                                    letterSpacing: '0.1em',
                                }}
                            >
                                SPIN
                            </span>
                            <span 
                                className="text-[7px] sm:text-[8px] md:text-[9px] font-bold mt-0.5"
                                style={{ color: '#a16207' }}
                            >
                                หมุนเลย!
                            </span>
                        </div>
                    )}
                </button>
            </div>

            {/* Animation Styles */}
            <style>{`
                @keyframes lightBlink {
                    0% { 
                        opacity: 0.4;
                        transform: translate(-50%, -50%) scale(0.85);
                    }
                    100% { 
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1.1);
                    }
                }
            `}</style>
        </div>
    )
}
