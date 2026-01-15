
import React from "react";
import { FooterVersion } from "@/components/FooterVersion";
import ChatBot from "@/components/ChatBot";
import Navbar from "@/components/Navbar";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

const shouldShowNavbar = (pathname: string) => {
  // Hide Navbar on dedicated shell/side-bar pages and delivery routes:
  return !(
    pathname.startsWith("/business-tools-retail") ||
    pathname.startsWith("/wholesale/business-tools") ||
    pathname.startsWith("/delivery") ||
    pathname.startsWith("/rider")
  );
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col w-full">
      {shouldShowNavbar(location.pathname) && <Navbar />}
      <div className="flex-1">{children}</div>
      <FooterVersion />
      <ChatBot />
    </div>
  );
};

export default AppLayout;

