/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "var(--color-primary)",
                "primary-content": "var(--color-primary-content)",
                secondary: "var(--color-secondary)",
                "secondary-content": "var(--color-secondary-content)",
                accent: "var(--color-accent)",
                "accent-content": "var(--color-accent-content)",
                neutral: "var(--color-neutral)",
                "neutral-content": "var(--color-neutral-content)",
                info: "var(--color-info)",
                "info-content": "var(--color-info-content)",
                success: "var(--color-success)",
                "success-content": "var(--color-success-content)",
                warning: "var(--color-warning)",
                "warning-content": "var(--color-warning-content)",
                error: "var(--color-error)",
                "error-content": "var(--color-error-content)",
                // เพิ่มตามที่ต้องการ
            },
            container: {
                center: true,
                padding: "1rem",
                screen: {
                    'sm': "640px",
                    'md': "768px",
                    'lg': "1024px",
                    'xl': "1024px",
                    '2xl': "1024px",
                }
            }
        },
    },
    fontFamily: {
        sans: ["Plus Jakarta Sans", "sans-serif"],
    },
    plugins: [
        require("daisyui"),
    ],
    daisyui: {
        themes: false,
    },
}
