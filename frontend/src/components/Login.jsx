import React, { useContext, useEffect, useState } from "react";
import { assets } from "../assets/assets";
import { AppContext } from "../context/AppContext";
import { loginUser, registerUser } from "../utils/api";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [state, setState] = useState("Login");
  const { setShowLogin, updateToken, setUser } = useContext(AppContext);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // Email Validation Function
  const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Password Validation Function
  const isValidPassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };


  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Validate Email and Password Before Sending API Request
        if (!isValidEmail(email)) {
          toast.error("Invalid Email Format");
          return;
        }
    
        if (!isValidPassword(password)) {
          toast.error(
            "Weak Password! Must be at least 8 characters long, contain an uppercase letter, lowercase letter, a number, and a special character."
          );
          return;
        }

    try {
      let data;
      if (state === "Login") {
        data = await loginUser(email, password);
      } else {
        data = await registerUser(username, email, password); // ✅ Correct usage
      }
      console.log("API response data:", data);

     if (data.access_token) {
      localStorage.setItem("token", data.access_token); // ✅ THIS is the right spot
      updateToken(data.access_token);
      setUser(data.user);
      setShowLogin(false);
      toast.success(state === "Login" ? "Login Successful!" : "Account Created Successfully!");
      navigate("/result");
    } else {
      throw new Error("Token not found in response");
    }
  } catch (error) {
    console.error("API Error:", error);
    toast.error(error.toString() || "Something went wrong");
  }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div className="absolute inset-0 z-10 backdrop-blur-sm bg-black/30 flex justify-center items-center">
      <motion.form
        onSubmit={onSubmitHandler}
        initial={{ opacity: 0.2, y: 50 }}
        transition={{ duration: 0.3 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative bg-white p-10 rounded-xl text-slate-500"
      >
        <h1 className="text-center text-2xl text-neutral-700 font-medium">{state}</h1>
        <p className="text-sm">Welcome back! Please sign in to continue</p>

        {state !== "Login" && (
          <div className="border px-5 py-2 flex items-center gap-2 rounded-full mt-4">
            <img src={assets.profile_icon} alt="User Icon" className="w-6 h-6" />
            <input
              onChange={(e) => setUsername(e.target.value)}
              value={username}
              type="text"
              className="outline-none text-sm"
              placeholder="Full name"
              required
            />
          </div>
        )}

        <div className="border px-5 py-2 flex items-center gap-2 rounded-full mt-4">
          <img src={assets.email_icon} alt="Email Icon" />
          <input
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            type="email"
            className="outline-none text-sm"
            placeholder="Email id"
            required
          />
        </div>

        <div className="border px-5 py-2 flex items-center gap-2 rounded-full mt-4">
          <img src={assets.lock_icon} alt="Lock Icon" />
          <input
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            type="password"
            className="outline-none text-sm"
            placeholder="Password"
            required
          />
        </div>

        {/*<p className="text-sm text-blue-600 my-4 cursor-pointer">Forgot Password?</p>*/}
        <br/>

        <button type="submit" className="bg-blue-600 w-full text-white py-2 rounded-full">
          {state === "Login" ? "Login" : "Create Account"}
        </button>

        {state === "Login" ? (
          <p className="mt-5 text-center">
            Don't have an account?{" "}
            <span className="text-blue-600 cursor-pointer" onClick={() => setState("Sign up")}>
              Sign Up
            </span>
          </p>
        ) : (
          <p className="mt-5 text-center">
            Already have an account?{" "}
            <span className="text-blue-600 cursor-pointer" onClick={() => setState("Login")}>
              Login
            </span>
          </p>
        )}

        <img
          onClick={() => setShowLogin(false)}
          src={assets.cross_icon}
          alt="Close"
          className="absolute top-5 right-5 cursor-pointer"
        />
      </motion.form>
    </div>
  );
};

export default Login;
