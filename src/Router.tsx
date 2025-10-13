import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./page/Login"
import Home from "./page/Home"
import Vote from "./page/Vote"
import Game from "./page/Game"
import Profile from "./page/Profile"
import Contact from "./page/Vap-ig"
import QRScan from "./page/QRScan"

// import หน้าอื่นๆ เพิ่มได้ เช่น import Profile from "./page/Profile"

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/vote" element={<Vote />} />
                <Route path="/game" element={<Game />} />
                <Route path="/vap-ig" element={<Contact />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/qrscan" element={<QRScan />} />
            </Routes>
        </BrowserRouter>
    )
}