import React, { useState, useRef, useContext } from "react";
import { motion } from "framer-motion";
import { FaMicrophone } from "react-icons/fa";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const styles = ["cartoon", "sketch", "oil_painting"]; // Add more styles if needed

const ImageGenerator = () => {
  const [image, setImage] = useState(null);
  const [styledImage, setStyledImage] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [styleLoading, setStyleLoading] = useState(false);
  const [input, setInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("");
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const { credits, setCredit } = useContext(AppContext);
  const navigate = useNavigate();
  const [imageId, setImageId] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Authentication error. Please login again.");
      navigate("/login");
      throw new Error("No token found");
    }
    return { Authorization: `Bearer ${token}` };
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Speech Recognition not supported.");
    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = "en-US";
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setListening(false);
      };
      recognitionRef.current.onerror = () => setListening(false);
      recognitionRef.current.onend = () => setListening(false);
    }
    if (!listening) {
      recognitionRef.current.start();
      setListening(true);
    } else {
      recognitionRef.current.stop();
      setListening(false);
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (credits <= 0) {
      toast.warning("Out of credits! Redirecting to buy page...");
      setTimeout(() => navigate("/buy"), 2000);
      return;
    }

    setLoading(true);
    setIsImageLoaded(false);
    setImage(null);
    setStyledImage(null);

    try {
      const response = await fetch("http://localhost:8000/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ prompt: input }),
      });

      if (response.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!response.ok) throw new Error("Failed to generate image");

      const data = await response.json();
      setImage(`data:image/png;base64,${data.image_base64}`);
      setImageId(data.image_id);
      setIsImageLoaded(true);
      setCredit((prev) => prev - 1);
    } catch (err) {
      console.error("Error:", err);
      toast.error("Failed to generate image.");
    }
    setLoading(false);
  };

  const applySelectedStyle = async () => {
    if (!imageId) return;
    setStyleLoading(true);
    try {
      const res = await fetch(
        `http://localhost:8000/apply-style?image_id=${imageId}&style=${selectedStyle}`,
        {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      if (res.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Apply style failed:", errorText);
        toast.error("Failed to apply style. Please try again.");
        return;
      }

      const data = await res.json();
      setStyledImage(`data:image/png;base64,${data.styled_base64}`);
    } catch (e) {
      console.error("Style apply error:", e);
      toast.error("Something went wrong while applying style.");
    }
    setStyleLoading(false);
  };

  const downloadImage = async (url, name) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const tempUrl = window.URL.createObjectURL(blob);
      const now = new Date();
      const filename = `${name} ${now.toISOString().split("T")[0]}.jpeg`;

      const a = document.createElement("a");
      a.href = tempUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(tempUrl);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <motion.form
      onSubmit={onSubmitHandler}
      className="flex flex-col min-h-[90vh] justify-center items-center"
      initial={{ opacity: 1, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <div className="flex gap-6 mt-6">
        <div className="w-80 h-80 bg-gray-300 rounded-lg flex justify-center items-center">
          {loading ? (
            <p className="animate-pulse text-gray-500">Generating...</p>
          ) : image ? (
            <img src={image} alt="Generated" className="w-full h-full object-contain rounded-lg" />
          ) : (
            <p className="text-gray-500">Image will appear here</p>
          )}
        </div>

        {styledImage && (
          <div className="w-80 h-80 bg-gray-300 rounded-lg flex justify-center items-center">
            <img src={styledImage} alt="Styled" className="w-full h-full object-contain rounded-lg" />
          </div>
        )}
      </div>

      {!isImageLoaded && (
        <div className="flex w-full max-w-xl bg-gray-200 text-black text-sm p-2 mt-6 rounded-full shadow items-center">
          <input
            type="text"
            placeholder="Describe the image you want..."
            className="flex-1 bg-transparent outline-none ml-4 p-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            className={`text-xl px-2 transition ${listening ? "text-red-600 animate-pulse" : "text-gray-600 hover:text-black"}`}
            title="Click to Speak"
          >
            <FaMicrophone />
          </button>
          <button
            type="submit"
            className="bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            disabled={loading}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      )}

      {isImageLoaded && (
        <>
          <div className="flex gap-4 mt-6 items-center">
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="border border-gray-400 px-4 py-2 rounded-full text-sm"
            ><option value="" disabled>
            Choose Your Style
          </option>
              {styles.map((style) => (
                <option key={style} value={style}>
                  {style.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={applySelectedStyle}
              className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition"
              disabled={styleLoading}
            >
              {styleLoading ? "Applying..." : "Apply Style"}
            </button>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="button"
              onClick={() => {
                setImage(null);
                setStyledImage(null);
                setInput("");
                setIsImageLoaded(false);
              }}
              className="border border-zinc-900 px-4 py-2 rounded-full hover:bg-gray-200 transition"
            >
              Generate Another
            </button>
            <button
              type="button"
              onClick={() => downloadImage(image, "Original Image")}
              className="bg-zinc-900 text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
            >
              Download Original
            </button>
            {styledImage && (
              <button
                type="button"
                onClick={() => downloadImage(styledImage, `${selectedStyle} Style Image`)}
                className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition"
              >
                Download Styled
              </button>
            )}
          </div>
        </>
      )}
    </motion.form>
  );
};

export default ImageGenerator;
