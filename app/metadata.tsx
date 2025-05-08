import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Awash Shop - Your Online Marketplace", // Default title
    template: "%s | Awash Shop", // Template for individual pages (%s will be replaced by the page title)
  },
  icons: {
    icon: "/icons.jpg", // Path to your favicon file in the public directory
  },
};