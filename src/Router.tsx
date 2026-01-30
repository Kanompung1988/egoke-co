import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./page/Login"
import Home from "./page/Home"
import Vote from "./page/Vote"
import Game from "./page/Game"
import Profile from "./page/Profile"
import Contact from "./page/Vap-ig"
import QRScan from "./page/QRScan"
import RegisterScan from "./page/RegisterScan"
import Admin from "./page/Admin"
import SuperAdmin from "./page/SuperAdmin"
import Register from "./page/Register"
import VoteResults from "./page/VoteResults"
import RedeemPrize from "./page/RedeemPrize"
import WarpStatus from "./page/WarpStatus"
import BonusNotification from "./components/BonusNotification"

export default function AppRouter() {
    return (
        <BrowserRouter>
            <BonusNotification />
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/Home" element={<Home />} />
                <Route path="/vote" element={<Vote />} />
                <Route path="/vote-results" element={<VoteResults />} />
                <Route path="/game" element={<Game />} />
                <Route path="/vap-ig" element={<Contact />} />
                <Route path="/warp-status" element={<WarpStatus />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/qrscan" element={<QRScan />} />
                <Route path="/register-scan" element={<RegisterScan />} />
                <Route path="/register" element={<Register />} />
                <Route path="/redeem/:ticketId" element={<RedeemPrize />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/superadmin" element={<SuperAdmin />} />
            </Routes>
        </BrowserRouter>
    )
}