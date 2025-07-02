import React from 'react';
import { HiX } from "react-icons/hi";
import Links from "./components/Links";
import SidebarCard from "components/sidebar/components/SidebarCard";
import routes from "routes.js";

const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Backdrop Overlay for Mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] xl:hidden"
          onClick={onClose}
          aria-label="Close Sidebar Overlay"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          sm:none duration-175 linear fixed
          min-h-full w-72 flex flex-col
          bg-white dark:!bg-navy-800
          shadow-2xl shadow-white/5
          transition-all dark:text-white
          z-[9999] md:z-50 lg:z-50 xl:z-0
          ${open ? "translate-x-0" : "-translate-x-96"}
        `}
      >
      {/* Close Button */}
      <button
        className="absolute top-4 right-4 cursor-pointer xl:hidden"
        onClick={onClose}
        aria-label="Close Sidebar"
      >
        <HiX className="h-6 w-6" />
      </button>

      {/* Logo */}
      <div className="mx-[56px] mt-[50px] flex items-center">
        <h1 className="mt-1 ml-1 font-poppins text-[26px] font-bold text-navy-700 dark:text-white">
          Admin <span className="font-medium">Panel</span>
        </h1>
      </div>

      {/* Divider */}
      <div className="mt-[58px] mb-7 h-px bg-gray-300 dark:bg-white/30" />

      {/* Navigation Links */}
      <nav className="mb-auto">
        <ul className="w-72 pt-1">
          <Links routes={routes} />
        </ul>
      </nav>

    </div>
    </>
  );
};

export default Sidebar;
