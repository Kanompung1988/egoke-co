import { useEffect } from "react"
import { loginWithGoogle, watchAuthState } from "../firebaseApp"
import { useNavigate } from "react-router-dom"

export default function Login() {
    const navigate = useNavigate()

    useEffect(() => {
        watchAuthState((user) => {
            if (user) {
                console.log("✅ Logged in user:", user.email)
                navigate("/Home")
            }
        })
    }, [navigate])

    return (
        <main className="min-h-screen flex items-center justify-center bg-[url('/Artwork.png')] bg-cover bg-center p-6">
            <section className="card bg-white/80 dark:bg-gray-900/80 p-8 rounded-2xl shadow-lg border border-gray-200 max-w-sm w-full text-center backdrop-blur-md">
                <h1 className="text-3xl font-bold text-[#1e3a5c] mb-6 tracking-wide">EGOKE</h1>

                <button onClick={() => loginWithGoogle()}
                    className="btn bg-white text-black border border-[#e5e5e5] w-full rounded-xl py-3 flex items-center justify-center gap-2">
                    <svg aria-label="Google logo" width="16" height="16" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g><path d="m0 0H512V512H0" fill="#fff"></path><path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341"></path><path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57"></path><path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73"></path><path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55"></path></g></svg>
                    Login with Google
                </button>

            </section>
        </main>
    )
}