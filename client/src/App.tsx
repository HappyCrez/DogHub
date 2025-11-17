import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Dogs from "./pages/Dogs";
import Events from "./pages/Events";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";

export default function App() {
    const location = useLocation();
    const reduce = useReducedMotion();

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                            duration: reduce ? 0 : 0.25,
                            ease: "easeOut",
                        },
                    }}
                    exit={{
                        opacity: 0,
                        y: -8,
                        transition: {
                            duration: reduce ? 0 : 0.15,
                            ease: "easeIn",
                        },
                    }}
                    className="mx-auto max-w-5xl p-4 flex-1"
                >
                    <Routes location={location}>
                        <Route path="/" element={<Home />} />
                        <Route path="/dogs" element={<Dogs />} />
                        <Route path="/events" element={<Events />} />
                        <Route path="/members" element={<Members />} />
                        <Route path="/members/:id" element={<MemberProfile />} />
                    </Routes>
                </motion.main>
            </AnimatePresence>
            <Footer />
        </div>
    );
}
