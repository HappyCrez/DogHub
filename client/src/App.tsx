import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";

export default function App() {
    const location = useLocation();
    const reduceMotion = useReducedMotion();

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />

            <AnimatePresence mode="wait">
                <motion.main
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{
                        opacity: 1,
                        y: 0,
                        transition: {
                            duration: reduceMotion ? 0 : 0.25,
                            ease: "easeOut",
                        },
                    }}
                    exit={{
                        opacity: 0,
                        y: -8,
                        transition: {
                            duration: reduceMotion ? 0 : 0.15,
                            ease: "easeIn",
                        },
                    }}
                    className="mx-auto flex-1 max-w-5xl p-4"
                >
                    <Routes location={location}>
                        <Route path="/" element={<Home />} />

                        {/* Остальные страницы добавим позже:
              <Route path="/dogs" element={<Dogs />} />
              <Route path="/events" element={<Events />} />
              <Route path="/members" element={<Members />} />
            */}
                    </Routes>
                </motion.main>
            </AnimatePresence>

            <Footer />
        </div>
    );
}
