"use client";
import React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import Login from "./page"; // Ensure this is your login page component
import { useRouter, usePathname } from "next/navigation";
import { Metadata } from "next"; // Import Metadata type

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define your metadata
export const siteMetadata = {
  title: {
    default: "Awash Shop - Your Online Marketplace", // Default title
    template: "Awash Shop | Home", // Title template for individual pages
  },

  icons: {
    icon: "/icons.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const authenticated = !!token; // Check if token exists
      setIsLoggedIn(authenticated);
      setIsLoading(false);

      // Redirect logic based on authentication status
      if (!authenticated && pathname !== "/") {
        router.push("/"); // Redirect to login if not authenticated
      } else if (authenticated && pathname === "/") {
        router.push("/pages"); // Redirect to dashboard if authenticated and on login page
      }
    }
  }, [router, pathname]);

  if (isLoading) {
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {isLoggedIn ? (
          <SidebarProvider>
            <div className="flex">
              <Sidebar />
              <main className="flex-1 overflow-y-auto h-screen w-full">
                {children}
              </main>
            </div>
          </SidebarProvider>
        ) : (
          <main className="flex items-center justify-center min-h-screen bg-gray-100">
            <Login />
          </main>
        )}
      </body>
    </html>
  );
}
