import React, { useRef } from "react"

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
    const segAngle = 360 / prizes.length

    return (
        <div className="relative w-full max-w-[500px] aspect-square">
            <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: "1000px" }}>
                <div className="relative w-[90%] aspect-square">
                    <div className="absolute inset-0 -m-3 rounded-full bg-gradient-to-br from-red-600 to-red-700 border-[8px] border-white shadow-[0_0_0_4px_#dc2626,0_8px_32px_rgba(0,0,0,0.3)]" />

                    <div
                        ref={wheelRef}
                        className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
                    >
                        {prizes.map((prize, index) => {
                            const angle = index * segAngle
                            return (
                                <div
                                    key={index}
                                    className="absolute w-full h-full"
                                    style={{
                                        transform: `rotate(${angle}deg)`,
                                        clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((segAngle * Math.PI) / 180)}% ${50 - 50 * Math.cos((segAngle * Math.PI) / 180)}%)`,
                                        backgroundColor: prize.color,
                                    }}
                                >
                                    <div
                                        className="absolute left-1/2 top-[5%] -translate-x-0 flex flex-col items-center gap-1.5 pointer-events-none"
                                        style={{ transform: `rotate(${segAngle / 2}deg)` }}
                                    >
                                        <div className="text-2xl md:text-3xl">{prize.emoji}</div>
                                        {/* <div className="px-2 py-1 rounded-lg bg-white/95 shadow-lg">
                                            <span className="text-gray-900 font-bold text-[9px] md:text-[10px] whitespace-nowrap">
                                                {prize.label}
                                            </span>
                                        </div> */}
                                    </div>
                                </div>
                            )
                        })}

                        {prizes.map((_, index) => (
                            <div key={`divider-${index}`} className="absolute w-full h-full" style={{ transform: `rotate(${index * (360 / prizes.length)}deg)` }}>
                                <div className="absolute left-1/2 w-[2px] h-1/2 bg-white/50 origin-bottom" />
                            </div>
                        ))}
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 z-20 pointer-events-none" style={{ top: "-25px" }}>
                        <div className="flex flex-col items-center">
                            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-yellow-400 drop-shadow-xl" />
                            <div className="w-6 h-6 bg-yellow-400 rounded-full shadow-xl -mt-1" />
                        </div>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <button
                            onClick={onSpin}
                            disabled={disabled}
                            className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-yellow-400 via-orange-400 to-orange-500 shadow-2xl flex flex-col items-center justify-center font-black text-3xl md:text-4xl text-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all duration-300 pointer-events-auto z-10 relative"
                            style={{
                                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5), inset 0 -8px 16px rgba(0, 0, 0, 0.3), inset 0 8px 16px rgba(255, 255, 255, 0.5)",
                                textShadow: "0 3px 6px rgba(0,0,0,0.6)",
                            }}
                        >
                            <span className="tracking-wider">{isSpinning ? "..." : "SPIN"}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}