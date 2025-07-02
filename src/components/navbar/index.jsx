import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { FiAlignJustify, FiLogOut, FiMoon, FiSun } from "react-icons/fi";

const Navbar = ({ onOpenSidenav, brandText: initialBrandText }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [brandText, setBrandText] = useState(initialBrandText);

  // Get data from Redux store
  const { microPage, user } = useSelector((state) => state.auth);

  // Update brandText when microPage changes
  useEffect(() => {
    setBrandText(microPage !== "unset" ? microPage : initialBrandText);
  }, [microPage, initialBrandText]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    if (darkMode) {
      document.body.classList.remove("dark");
    } else {
      document.body.classList.add("dark");
    }
    setDarkMode(!darkMode);
  };

  // Handle logout
  const handleLogout = () => {
    // Add logout logic here
    console.log("Logout clicked");
  };

  return (
    <nav className="sticky top-4 z-40 flex flex-row flex-wrap items-center justify-between rounded-xl bg-white/10 p-2 backdrop-blur-xl dark:bg-[#0b14374d]">
      {/* Left Section - Breadcrumb and Title */}
      <div className="ml-2">
        {/* Breadcrumb */}
        <div className="flex items-center text-sm">
          <span className="font-normal text-navy-700 dark:text-white">
            Pages
          </span>
          {user && (
            <span className="mx-2 font-normal text-navy-700 dark:text-white">
              / {user.name}
            </span>
          )}
          <span className="mx-2 text-navy-700 dark:text-white">/</span>
          <Link
            className="font-normal capitalize text-navy-700 hover:underline dark:text-white dark:hover:text-white"
            to="#"
          >
            {brandText}
          </Link>
        </div>
        
        {/* Main Title */}
        <h1 className="mt-1 text-[28px] font-bold capitalize text-navy-700 dark:text-white">
          <Link
            to="#"
            className="hover:text-navy-600 dark:hover:text-gray-200 transition-colors"
          >
            {brandText}
          </Link>
        </h1>
      </div>

      {/* Right Section - Controls */}
      <div className="flex h-[61px] items-center justify-end gap-3 rounded-full bg-white px-4 py-2 shadow-xl shadow-shadow-500 dark:bg-navy-800 dark:shadow-none">
        {/* Mobile Menu Toggle */}
        <button
          className="flex cursor-pointer text-xl text-gray-600 hover:text-gray-800 dark:text-white dark:hover:text-gray-200 xl:hidden transition-colors"
          onClick={onOpenSidenav}
          aria-label="Toggle Sidebar"
        >
          <FiAlignJustify className="h-5 w-5" />
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-800 dark:text-white dark:hover:text-gray-200 transition-colors"
          aria-label="Toggle Dark Mode"
        >
          {darkMode ? (
            <FiSun className="h-5 w-5" />
          ) : (
            <FiMoon className="h-5 w-5" />
          )}
        </button>

        {/* User Info */}
        {user && (
          <div className="hidden md:flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-brand-500 to-brand-600 rounded-full">
              <span className="text-white text-sm font-semibold">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            </div>
            <span className="text-sm font-medium text-navy-700 dark:text-white">
              {user.name}
            </span>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
          aria-label="Logout"
        >
          <FiLogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
