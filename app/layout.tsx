"use client";
import React, { useEffect, useState } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "@/components/ui/sidebar";
import Sidebar from "@/components/Sidebar";
import Login from "./page";
import { useRouter, usePathname } from "next/navigation";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
            const authenticated = !!token;
            setIsLoggedIn(authenticated);
            setIsLoading(false);

            if (!authenticated && pathname !== "/") {
                router.push("/");
            } else if (authenticated && pathname === "/") {
                router.push("/pages");
            }
        }
    }, [router, pathname]);

    if (isLoading) {
        return (
            <html lang="en">
                <head>
                    <title>Amibera Dashboard</title>
                    <meta name="description" content="Amibera Dashboard Loading..." />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <link rel="icon" href="/icons.jpg" />
                </head>
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
            <head>
                <title>Amibera Dashboard</title>
                <meta name="description" content="Amibera Dashboard Application" />
                <meta name="keywords" content="dashboard, amibera, furniture" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta charSet="utf-8" />
                <link rel="icon" href="/icons.jpg" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                {isLoggedIn ? (
                    <SidebarProvider>
                        <div className="flex w-full">
                            <div className="overflow-hidden z-50">
                                <Sidebar />
                            </div>
                            <main className="flex-1 overflow-y-auto h-screen">
                                {children}
                            </main>
                        </div>
                    </SidebarProvider>
                ) : (
                    <main className="flex items-center justify-center bg-gray-100">
                        <Login />
                    </main>
                )}
            </body>
        </html>
    );
}

