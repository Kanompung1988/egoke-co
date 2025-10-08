import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Home from "./page/Home"
import Game from "./page/Game"
import Points from "./page/Points"
import Vote from "./page/Vote"
import Contact from "./page/Vap-ig"
import BottomNav from "./components/BottomNav"

function App() {
  return (
    <Router>
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<Game />} />
          <Route path="/points" element={<Points />} />
          <Route path="/vote" element={<Vote />} />
          <Route path="/vap-ig" element={<Contact />} />
        </Routes>
      </main>
      <BottomNav />
    </Router>
  )
}

export default App
