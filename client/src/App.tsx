import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Dogs from "./pages/Dogs";
import Events from "./pages/Events";
import Members from "./pages/Members";
import MemberProfile from "./pages/MemberProfile";
import Training from "./pages/Training";
import EventDetails from "./pages/EventDetails";
import ProgramDetails from "./pages/ProgramDetails";
import PeopleTrainingDetails from "./pages/PeopleTrainingDetails";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import { AuthProvider } from "./auth/AuthContext";

export default function App() {
    const location = useLocation();
    const reduce = useReducedMotion();
    const initialState = reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 };

    return (
        <AuthProvider>
            <div className="min-h-screen flex flex-col">
                <Navbar />
                <AnimatePresence mode="wait">
                    <motion.main
                        key={location.pathname}
                        initial={initialState}
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
                            <Route path="/auth" element={<Auth />} />
                            <Route path="/account" element={<Account />} />
                            <Route path="/dogs" element={<Dogs />} />
                            <Route path="/events" element={<Events />} />
                            <Route path="/events/:id" element={<EventDetails />} />
                            <Route path="/programs/:id" element={<ProgramDetails />} />
                            <Route path="/training" element={<Training />} />
                            <Route path="/trainings/:id" element={<PeopleTrainingDetails />} />
                            <Route path="/members" element={<Members />} />
                            <Route path="/members/:id" element={<MemberProfile />} />
                        </Routes>
                    </motion.main>
                </AnimatePresence>
                <Footer />
            </div>
        </AuthProvider>
    );
}