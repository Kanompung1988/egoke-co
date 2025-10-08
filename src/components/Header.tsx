export default function Header() {
    return (
        <header className="flex justify-end p-6">
            <button className="text-base-content/80 p-2 rounded-full hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined">settings</span>
            </button>
        </header>
    )
}
