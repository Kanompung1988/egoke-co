/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
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
