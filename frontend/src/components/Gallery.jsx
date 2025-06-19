import React, { useEffect, useState } from "react";
import axios from "axios";

const Gallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState(null);

  const token = localStorage.getItem("token");

  const fetchImages = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/images/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setImages(res.data.images);
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteImage = (id) => {
    setImageToDelete(id);
    setShowModal(true);
  };

  const deleteImage = async () => {
    if (!imageToDelete) return;

    try {
      await axios.delete(`http://localhost:8000/api/images/${imageToDelete.split("_")[0]}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setImages(images.filter((img) => !img.id.startsWith(imageToDelete.split("_")[0])));
      setShowModal(false);
      setImageToDelete(null);
    } catch (error) {
      console.error("Error deleting image:", error);
    }
  };

  const downloadImage = (img) => {
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${img.image_base64}`;
    link.download = `${img.prompt.replace(/\s+/g, "_")}_${img.type || "image"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchImages();
  }, []);

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Image Gallery</h1>

      {images.length === 0 ? (
        <p>No images found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((img) => (
            <div key={img.id} className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col">
              <div className="w-full h-64 overflow-hidden">
                <img
                  src={`data:image/png;base64,${img.image_base64}`}
                  alt={img.prompt}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <p className="text-sm text-gray-700 mb-2 truncate">{img.prompt}</p>

                <div className="flex justify-between">
                  <button
                    onClick={() => confirmDeleteImage(img.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>

                  <button
                    onClick={() => downloadImage(img)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
            <p className="mb-6 text-gray-600">Are you sure you want to delete this image?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded"
              >
                Cancel
              </button>
              <button
                onClick={deleteImage}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
