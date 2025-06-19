import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useContext(AppContext);
  const token = localStorage.getItem("token");

  // Check both context user and localStorage token
  if (!user && !token) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
