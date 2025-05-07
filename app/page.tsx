"use client"; // This line indicates that the component is a client component

import React, { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation"; // Changed from next/router to next/navigation

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false); // State for toggling password visibility
  const [success, setSuccess] = useState<boolean>(false); // State for success message
  const router = useRouter(); // Initialize the router

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setSuccess(false);

    try {
      // Dummy authentication for demonstration
      if (
        formData.email === "mohammed.admin@gmail.com" &&
        formData.password === "123456"
      ) {
        // Check if window is defined (client-side) before using localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("token", "dummy_token"); // Save a dummy token to local storage
        }

        // Simulate a loading duration before redirecting
        setTimeout(() => {
          setSuccess(true); // Set success message
          router.push("/pages/"); // Redirect to the home page after successful login
        }, 2000); // Duration in milliseconds (2 seconds)
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>
        {error && <p className="text-red-600 mb-4 text-center">{error}</p>}
        {success && (
          <p className="text-green-600 mb-4 text-center">Login successful!</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4 w-[350px] ">
          <div>
            <label htmlFor="email" className="block text-gray-700">
              Email:
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300"
              required
            />
          </div>
          <div className="relative">
            <label htmlFor="password" className="block text-gray-700">
              Password:
            </label>
            <input
              type={showPassword ? "text" : "password"} // Toggle input type
              name="password"
              id="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring focus:border-blue-300 pr-10" // Added padding to the right for the icon
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 focus:outline-none" // Center the icon vertically
            >
              {showPassword ? (
                <span>👁️</span> // Eye icon for showing password
              ) : (
                <span>🙈</span> // Eye icon for hiding password
              )}
            </button>
          </div>
          <button
            type="submit"
            className={`w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition duration-200 flex items-center justify-center ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loader mr-2"></span> {/* Loader icon */}
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>

      <style jsx>{`
        .loader {
          border: 2px solid rgba(255, 255, 255, 0.5);
          border-top: 2px solid white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
