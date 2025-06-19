import { createContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom"; 
// Create the context
export const AppContext = createContext();

const AppContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [credits, setCredit] = useState(0); // Default to 0

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";

  const loadCreditsData = async () => {
    if (!token) return; // ✅ Prevent API call if no token is present

    try {
      const { data } = await axios.get(`${backendUrl}/api/user/credits`, {  // ✅ Fixed string interpolation
        headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, },  // ✅ Fixed Authorization header
      });
      console.log("API Response:", data); // Debug response
      if (data.success) {
        setCredit(data.credits);
        setUser(data.user);
      }else {
              console.error("Credit fetch failed:", data.message);
              toast.error("Failed to fetch credits");
            }
    } catch (error) {
          console.error("Error fetching credits:", error.response?.data || error.message);
          toast.error("Failed to fetch credits");
        }
  };

  const updateToken = (newToken) => {
    setToken(newToken);
    localStorage.setItem("token", newToken);
    loadCreditsData();
  };
  const generateImage = async (prompt) => {
      try {
        const { data } = await axios.post(`${backendUrl}/generate-image`, { prompt }, { headers: { "Authorization": `Bearer ${localStorage.getItem('token')}`, } });
  
        if (data.success) {
          loadCreditsData();
          return data.resultImage;
        } else {
          toast.error(data.message);
          loadCreditsData();
          if (data.creditBalance === 0) {
            navigate('/buy'); // ✅ Fix: useNavigate is now working properly
          }
        }
      } catch (error) {
        toast.error(error.message);
      }
    };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setCredit(0);
  };

  useEffect(() => {
    if (token) loadCreditsData();
  }, [token]);

  return (
    <AppContext.Provider
      value={{ user, setUser, showLogin, setShowLogin, backendUrl, token, updateToken, credits, setCredit, logout }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
