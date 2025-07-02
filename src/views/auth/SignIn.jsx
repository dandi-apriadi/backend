import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { loginUser, reset } from "../../store/slices/authSlice";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock } from "react-icons/fi";
import Checkbox from "components/checkbox";
import Swal from 'sweetalert2';

// Form validation utility functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const showAlert = (icon, title, text, timer = 2000) => {
  return Swal.fire({
    icon,
    title,
    text,
    timer,
    timerProgressBar: true,
    toast: true,
    position: 'top-end',
    showConfirmButton: false
  });
};

const SignIn = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [errors, setErrors] = useState({});

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  // Handle input changes
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: "" }));
    }
  };

  // Handle form submission and validation
  const handleAuth = async (e) => {
    e.preventDefault();
    const { email, password } = formData;
    const newErrors = {};

    // Form validation
    if (!email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!validateEmail(email)) {
      newErrors.email = "Masukkan alamat email yang valid";
    }

    if (!password.trim()) {
      newErrors.password = "Kata sandi wajib diisi";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await dispatch(loginUser({
        email: email.trim(),
        password: password.trim()
      })).unwrap();
    } catch (error) {
      console.error('Login error:', error);
      showAlert(
        'error',
        'Gagal Masuk',
        error?.message || 'Kredensial tidak valid',
        3000
      );
    }
  };

  // Combined useEffect for component lifecycle and auth state management
  useEffect(() => {
    document.title = "Sign In";

    if (isSuccess && user?.user) {
      const route = user.user.role === "admin" ? "/admin/default" : "/customer/default";
      navigate(route);
      dispatch(reset());
    }

    if (isError) {
      dispatch(reset());
    }

    // Cleanup function
    return () => dispatch(reset());
  }, [isSuccess, isError, user, message, navigate, dispatch]);

  // Common input field styling
  const getInputClasses = (fieldName) => `
    mt-2 flex h-12 w-full items-center justify-start rounded-xl border pl-10
    ${errors[fieldName] ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700'} 
    bg-white dark:bg-slate-800 p-3 text-sm outline-none transition-all
    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
    text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
  `;

  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";

  // Loading indicator
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-900/50 z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="mt-16 mb-16 flex h-full w-full items-center justify-center px-2 md:mx-0 md:px-0 lg:mb-10 lg:items-center lg:justify-start">
      <div className="mt-[10vh] w-full max-w-full flex-col items-center md:pl-4 lg:pl-0 xl:max-w-[420px]">
        <h4 className="mb-2.5 text-4xl font-bold text-gray-800 dark:text-white">
          Selamat Datang Kembali
        </h4>
        <p className="mb-9 ml-1 text-base text-gray-600 dark:text-gray-400">
          Masuk untuk melanjutkan ke akun Anda
        </p>

        {/* Login Form */}
        <form onSubmit={handleAuth} className="space-y-6">
          {/* Email */}
          <div className="relative">
            <label htmlFor="email" className={labelClasses}>Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={getInputClasses("email")}
                id="email"
                type="email"
                placeholder="contoh@gmail.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <label htmlFor="password" className={labelClasses}>Kata Sandi</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className={getInputClasses("password")}
                id="password"
                type="password"
                placeholder="Min. 8 karakter"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Checkbox
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <p className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ingat saya
              </p>
            </div>
            <a
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 
                      dark:hover:text-indigo-300 transition-colors"
              href="#forgot-password"
            >
              Lupa Kata Sandi?
            </a>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 py-3 text-base font-medium text-white 
                     transition duration-200 hover:bg-indigo-700 active:bg-indigo-800 
                     shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
          >
            Masuk
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
            <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap"> atau lanjutkan dengan </p>
            <div className="h-px w-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google Sign-in Button */}
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl 
                     border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                     text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            <FcGoogle className="text-xl" />
            Masuk dengan Google
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Belum terdaftar?
          </span>
          <a
            href="/sign-up"
            className="ml-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 
                      dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
          >
            Buat akun baru
          </a>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
