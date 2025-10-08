export default function Main() {
    return (
        <main className="flex-grow flex flex-col justify-center items-center px-4">
            <div className="relative w-48 h-48 mb-8">
                <div className="absolute inset-0 border-4 border-primary rounded-full"></div>
                <div className="absolute inset-4 border-2 border-primary/50 rounded-full"></div>
                <div className="absolute inset-8 border border-primary/20 rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary font-bold text-lg font-serif">
                    祭
                </div>
            </div>
        </main>
    )
}
