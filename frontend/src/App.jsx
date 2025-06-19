import React, { useContext } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import ImageGenerator from "./pages/ImageGenerator";
import BuyCredit from "./pages/BuyCredits";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import { AppContext } from "./context/AppContext";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "./components/ProtectedRoute";
import "react-toastify/dist/ReactToastify.css";
import Gallery from "./components/Gallery";
const App = () => {
  const { showLogin } = useContext(AppContext);

  return (
    <div className="px-4 sm:px-10 md:px-14 lg:px-28 min-h-screen bg-gradient-to-b from-teal-100 to-orange-50">
      <Navbar />
      <ToastContainer position="bottom-right" />
      {showLogin && <Login />} {/* Login modal */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/result"
          element={
            <ProtectedRoute>
              <ImageGenerator />
            </ProtectedRoute>
          }
        />
         <Route path="/gallery" element={<Gallery />} />
        <Route path="/buy" element={<BuyCredit />} />
      </Routes>
    </div>
  );
};

export default App;
