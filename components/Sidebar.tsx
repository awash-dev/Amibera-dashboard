"use client";

import { useState, useEffect } from "react";
import {
  Home,
  Package,
  ShoppingCart,
  Users,
  UploadCloud,
  UserCircle2Icon,
  LogOut,
  ShoppingBag,
  ChevronLeft,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FIREBASE_Auth } from "@/FirebaseConfig"; // Import your Firebase config
import { signOut } from "firebase/auth"; // Import signOut function

const navItems = [
  { name: "Dashboard", href: "/pages", icon: Home },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Post", href: "/post", icon: UploadCloud },
  { name: "User List", href: "/userList", icon: UserCircle2Icon },
];

export default function SidebarNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter(); // Initialize router for redirection

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(FIREBASE_Auth); // Sign out from Firebase
      localStorage.removeItem("token"); // Remove token from local storage
      router.push("/"); // Redirect to login page
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 h-screen border-r bg-background transition-all duration-300",
          "w-[250px]",
          isCollapsed && "lg:w-[80px]",
          !isMobileOpen && "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col p-3">
          {/* Logo and collapse button */}
          <div className="flex items-center justify-between px-3 py-4">
            {!isCollapsed && (
              <Link href="/pages" className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">Awash Shop</span>
              </Link>
            )}

            {isCollapsed && (
              <div className="flex justify-center w-full">
                <Package className="h-6 w-6 text-primary" />
              </div>
            )}

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "hidden lg:flex items-center justify-center h-8 w-8 rounded-full",
                "hover:bg-accent transition-colors",
                "absolute -right-4 top-6 border bg-background"
              )}
            >
              <ChevronLeft
                className={cn(
                  "h-4 w-4 transition-transform",
                  isCollapsed && "rotate-180"
                )}
              />
              <span className="sr-only">Toggle sidebar</span>
            </button>
          </div>

          {/* Navigation items */}
          <nav className="mt-6 flex-1">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2",
                      "text-sm font-medium hover:bg-accent transition-colors",
                      pathname === item.href && "bg-accent",
                      isCollapsed && "justify-center"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {!isCollapsed && item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User profile and logout */}
          <div
            className={cn(
              "mt-auto p-3 border-t",
              isCollapsed ? "flex justify-center" : "space-y-2"
            )}
          >
            {!isCollapsed && (
              <div className="text-sm">
                <div className="font-medium">Mohammed</div>
                <div className="text-muted-foreground">mohammed.coin.et@gmail.com</div>
              </div>
            )}

            <button
              onClick={handleSignOut} // Call sign-out function
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 w-full",
                "text-sm font-medium hover:bg-accent transition-colors",
                isCollapsed && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5" />
              {!isCollapsed && "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed bottom-4 right-4 z-40 lg:hidden h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-lg"
      >
        <Menu className="h-6 w-6 text-primary-foreground" />
        <span className="sr-only">Open menu</span>
      </button>
    </>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:pl-[250px] min-h-screen transition-all duration-300">
      <div className="p-6">{children}</div>
    </div>
  );
}
