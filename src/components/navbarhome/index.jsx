import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiMenu, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from "react-redux";
import { FaPowerOff } from 'react-icons/fa';
import { getMe, logoutUser, reset } from "../../store/slices/authSlice";
import "./style.css";

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef(null);
  const navbarRef = useRef(null);

  // Empty nav links array - removing all navigation items
  const navLinks = [];

  // useEffect(() => {
  //   const fetchUser = async () => {
  //     try {
  //       await dispatch(getMe()).unwrap();
  //     } catch (error) {
  //       console.error("Failed to fetch user:", error);
  //     }
  //   };

  //   fetchUser();
  // }, [dispatch]);

  useEffect(() => {
    document.title = user?.name || "Kartika";
  }, [user]);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      dispatch(reset());
      setIsProfileOpen(false);
      navigate('/auth/sign-in');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  useEffect(() => {
    const closeDropdowns = (e) => {
      if (!e.target.closest('.profile-menu')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    document.body.style.overflow = !isMobileMenuOpen ? 'hidden' : '';
  };

  return (
    <>
      {/* Main Navbar */}
      <motion.nav
        ref={navbarRef}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`
          fixed top-0 left-0 right-0 z-50
          transition-all duration-500 ease-in-out
          ${isScrolled
            ? 'py-2 bg-gradient-to-r from-blue-900/95 via-indigo-800/95 to-blue-900/95 backdrop-blur-xl shadow-2xl shadow-blue-950/30'
            : 'py-5 bg-transparent'}
        `}
      >
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Overlay */}
          <div className={`
            absolute inset-0 transition-opacity duration-500
            ${isScrolled ? 'opacity-100' : 'opacity-0'}
            bg-gradient-to-r from-blue-900/95 via-indigo-800/95 to-blue-900/95
          `} />

          {/* Add this new layer for better text contrast */}
          <div className={`
            absolute inset-0 transition-opacity duration-500
            ${isScrolled ? 'opacity-30' : 'opacity-0'}
            bg-black/20
          `} />

          {/* Particles/Bubbles Effect (visible when scrolled) */}
          <div className={`
            absolute inset-0 transition-opacity duration-500
            ${isScrolled ? 'opacity-30' : 'opacity-0'}
          `}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-teal-400/20 blur-xl"
                style={{
                  width: `${Math.random() * 50 + 20}px`,
                  height: `${Math.random() * 50 + 20}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${Math.random() * 10 + 5}s infinite ease-in-out`,
                }}
              />
            ))}
          </div>

          {/* Enhanced top highlight */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />

          {/* Add bottom border for better separation */}
          <div className={`
            absolute bottom-0 left-0 right-0 h-[0.5px] transition-opacity duration-500
            ${isScrolled ? 'opacity-30' : 'opacity-0'}
            bg-gradient-to-r from-transparent via-white/20 to-transparent
          `} />
        </div>

        <div className="relative max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex shrink-0 items-center"
            >
              <Link to="/" className="flex items-center gap-2">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-wider 
                  group transition-all duration-300 hover:scale-105">
                  <span className="bg-gradient-to-br from-cyan-300 via-teal-400 to-emerald-500 
                    inline-block text-transparent bg-clip-text drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                    Admin
                  </span>
                  <span className="bg-gradient-to-br from-white via-gray-100 to-gray-300 
                    inline-block text-transparent bg-clip-text ml-2 drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                    Panel
                  </span>
                  {/* Decorative underwater element */}
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full opacity-70
                    bg-gradient-to-r from-transparent via-teal-400/80 to-transparent"></span>
                </span>
              </Link>
            </motion.div>

            {/* Empty space where navigation links were */}
            <div className="flex-1"></div>

            {/* Right Section: Auth */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Auth Buttons */}
              {!user ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="flex items-center gap-2"
                >
                  <Link
                    to="/auth/sign-in"
                    className="inline-block px-4 py-2 text-sm font-medium text-white
                      hover:text-teal-300 transition-colors duration-300"
                  >
                    Sign In
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                >
                  <Link
                    to={user?.role === "admin" ? "/admin/default" : "/customer/default"}
                    className="flex items-center gap-3 px-4 py-2 rounded-full
                      bg-gradient-to-br from-teal-500/20 to-emerald-600/20
                      hover:from-teal-500/30 hover:to-emerald-600/30
                      border border-teal-400/30 hover:border-teal-400/50
                      text-sm font-medium text-white
                      transition-all duration-300"
                  >
                    <span className="hidden sm:inline">Dashboard</span>
                    <div className="w-8 h-8 rounded-full bg-teal-500/30 flex items-center justify-center">
                      <FiHome className="w-4 h-4" />
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Mobile Menu Button - Only shows logout option now */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                onClick={toggleMobileMenu}
                className="lg:hidden flex items-center justify-center w-10 h-10
                  bg-white/10 rounded-full border border-white/20
                  text-white hover:text-teal-300 hover:bg-white/15
                  transition-all duration-300 menu-button"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <FiX className="w-5 h-5" />
                ) : (
                  <FiMenu className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay - Simplified to only show auth options */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={toggleMobileMenu}
            />

            {/* Menu Panel */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 right-0 z-50 w-[75%] max-w-sm h-screen
                bg-gradient-to-b from-blue-900 to-blue-950
                shadow-2xl shadow-black/50 lg:hidden"
            >
              <div className="flex flex-col h-full overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                  <h2 className="text-xl font-bold text-white">Menu</h2>
                  <button
                    onClick={toggleMobileMenu}
                    className="p-2 rounded-full bg-white/10
                      text-white hover:text-teal-300 hover:bg-white/15
                      transition-all duration-300"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Bottom Actions - Only auth options */}
                <div className="p-4 mt-auto border-t border-white/10">
                  {user ? (
                    <div className="space-y-3">
                      <div className="px-4 py-3 rounded-lg bg-blue-800/30">
                        <p className="text-xs text-white/70">Signed in as</p>
                        <p className="font-medium text-white">{user.name || user.email}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Link
                          to={user?.role === "admin" ? "/admin/default" : "/customer/default"}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                            bg-white/10 text-white hover:bg-white/15
                            transition-all duration-200"
                          onClick={toggleMobileMenu}
                        >
                          <FiHome className="w-4 h-4" />
                          <span>Dashboard</span>
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            toggleMobileMenu();
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                            bg-red-500/20 text-red-300 hover:bg-red-500/30
                            transition-all duration-200"
                        >
                          <FaPowerOff className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        to="/auth/sign-in"
                        className="flex items-center justify-center px-4 py-2.5 rounded-lg
                          bg-white/10 text-white hover:bg-white/15
                          transition-all duration-200"
                        onClick={toggleMobileMenu}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/auth/sign-up"
                        className="flex items-center justify-center px-4 py-2.5 rounded-lg
                          bg-gradient-to-br from-teal-500 to-emerald-600 
                          hover:from-teal-400 hover:to-emerald-500
                          text-white shadow-lg shadow-teal-900/30
                          transition-all duration-200"
                        onClick={toggleMobileMenu}
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Fixed height placeholder to prevent content from hiding under the navbar */}
      <div className={`transition-all duration-500 ${isScrolled ? 'h-20' : 'h-28'}`} />
    </>
  );
};

export default Navbar;