import React, { useState, useEffect } from "react";
import Card from "components/card";
import { MdLock, MdVisibility, MdVisibilityOff, MdDone, MdArrowForward, MdShield } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { API_CONFIG } from "../../../config/apiConfig";
import axios from "axios";

// Create axios instance with credentials
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL,
    withCredentials: true,
});

const ChangePassword = () => {
    // State for form inputs
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // State for password visibility
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // State for form submission
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);    // Get user info from Redux store
    const { user } = useSelector((state) => state.auth);

    // Password strength calculation
    const calculatePasswordStrength = (password) => {
        let strength = 0;

        // Length check
        if (password.length >= 8) strength += 25;

        // Character variety checks
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        if (/[^A-Za-z0-9]/.test(password)) strength += 25;

        return strength;
    };

    const passwordStrength = calculatePasswordStrength(newPassword);

    // Get strength label and color
    const getStrengthLabel = (strength) => {
        if (strength === 0) return { text: "", color: "bg-gray-200" };
        if (strength <= 25) return { text: "Lemah", color: "bg-red-500" };
        if (strength <= 50) return { text: "Cukup", color: "bg-orange-500" };
        if (strength <= 75) return { text: "Baik", color: "bg-yellow-500" };
        return { text: "Kuat", color: "bg-green-500" };
    };

    const strengthInfo = getStrengthLabel(passwordStrength);

    // Update the isFormValid function to always return true (no restrictions)
    const isFormValid = () => {
        // Allow any input (no validation)
        return true;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Clear any previous errors
        setErrorMessage(null);

        // Basic check just to ensure passwords match, but doesn't restrict submission
        if (newPassword !== confirmPassword) {
            setErrorMessage("Kata sandi tidak cocok");
            toast.warning("Kata sandi tidak cocok");
            return;
        }

        setIsSubmitting(true);        try {
            const response = await api.post("/api/profile/change-password", {
                currentPassword,
                newPassword,
                user_id: user.user_id // Fixed parameter name to match backend
            });

            if (response.data.success) {
                setIsSuccess(true);
                toast.success("Kata sandi berhasil diubah");

                // Reset form after 3 seconds
                setTimeout(() => {
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setIsSuccess(false);
                }, 3000);
            } else {
                setErrorMessage(response.data.message || "Gagal mengubah kata sandi");
                toast.error(response.data.message || "Gagal mengubah kata sandi");
            }
        } catch (error) {
            console.error("Error changing password:", error);
            const message = error.response?.data?.message || "Kata sandi saat ini salah";
            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mt-3 grid h-full grid-cols-1 gap-5 md:mt-5">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl mx-auto"
            >
                {/* User Information Card */}
                <Card extra={"p-5 mb-5"}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-1">
                                {user?.fullname || "Memuat..."}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {user?.email || ""}
                            </p>
                            <div className="flex items-center mt-1">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.status === "active"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}>
                                    {user?.status || "tidak diketahui"}
                                </span>

                                <span className={`inline-flex ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${user?.role === "admin"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                                    }`}>
                                    {user?.role || "pengguna"}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Akun dibuat: {user?.created_at || "N/A"}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Password Change Card */}
                <Card extra={"p-6 sm:p-8"}>
                    <AnimatePresence mode="wait">
                        {isSuccess ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col items-center justify-center py-12"
                            >
                                <motion.div
                                    className="rounded-full bg-gradient-to-br from-green-400 to-green-500 p-6 mb-6 shadow-lg shadow-green-200 dark:shadow-green-900/20"
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                >
                                    <MdDone className="h-16 w-16 text-white" />
                                </motion.div>
                                <motion.h2
                                    className="text-2xl font-bold text-gray-800 dark:text-white mb-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    Kata Sandi Berhasil Diubah
                                </motion.h2>
                                <motion.p
                                    className="text-center text-gray-600 dark:text-gray-400 max-w-md"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    Kata sandi Anda telah diperbarui dengan aman. Anda dapat melanjutkan menggunakan akun Anda dengan kredensial baru.
                                </motion.p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <div className="flex items-center justify-between gap-3 mb-8">
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                                            Perbarui Kata Sandi Anda
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Silakan masukkan kata sandi saat ini untuk melakukan perubahan ini
                                        </p>
                                    </div>
                                    <motion.div
                                        className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <MdShield className="h-6 w-6 text-blue-500 dark:text-blue-400" />
                                    </motion.div>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Error Message */}
                                    {errorMessage && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 mb-3 bg-red-50 border-l-4 border-red-500 dark:bg-red-900/20 dark:border-red-500/50 rounded-md"
                                        >
                                            <div className="flex">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Current Password */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Kata Sandi Saat Ini
                                        </label>
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-3 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-navy-700 dark:border-navy-600 dark:text-white dark:placeholder-gray-400"
                                                placeholder="Masukkan kata sandi saat ini"
                                                id="currentPassword"
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => {
                                                    setCurrentPassword(e.target.value);
                                                    setErrorMessage(null); // Clear error when user makes changes
                                                }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white focus:outline-none"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? (
                                                    <MdVisibilityOff className="h-5 w-5" />
                                                ) : (
                                                    <MdVisibility className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="w-full h-px bg-gray-200 dark:bg-navy-700 my-6"></div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Buat Kata Sandi Baru
                                        </label>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                            Kata sandi baru Anda harus berbeda dari kata sandi sebelumnya
                                        </p>
                                    </div>

                                    {/* New Password */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Kata Sandi Baru
                                        </label>
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-3 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-navy-700 dark:border-navy-600 dark:text-white dark:placeholder-gray-400"
                                                placeholder="Masukkan kata sandi baru"
                                                id="newPassword"
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => {
                                                    setNewPassword(e.target.value);
                                                    setErrorMessage(null); // Clear error when user makes changes
                                                }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white focus:outline-none"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? (
                                                    <MdVisibilityOff className="h-5 w-5" />
                                                ) : (
                                                    <MdVisibility className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Password strength indicator */}
                                        {newPassword && (
                                            <motion.div
                                                className="mt-3 space-y-2 p-3 bg-gray-50 dark:bg-navy-800 rounded-lg"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                                        Kekuatan Kata Sandi:
                                                    </div>
                                                    <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${strengthInfo.color === 'bg-red-500' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                                        strengthInfo.color === 'bg-orange-500' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                            strengthInfo.color === 'bg-yellow-500' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                                strengthInfo.color === 'bg-green-500' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                        }`}>
                                                        {strengthInfo.text || 'Tidak Ada'}
                                                    </div>
                                                </div>

                                                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-navy-700">
                                                    <motion.div
                                                        className={`h-full rounded-full ${strengthInfo.color}`}
                                                        initial={{ width: "0%" }}
                                                        animate={{ width: `${passwordStrength}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>

                                                {/* Password requirements */}
                                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div className={`flex items-center gap-1.5 text-xs ${newPassword.length >= 8 ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                                                        <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${newPassword.length >= 8 ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                                                            {newPassword.length >= 8 ? <MdDone className="h-3 w-3" /> : ""}
                                                        </div>
                                                        Minimal 8 karakter
                                                    </div>

                                                    <div className={`flex items-center gap-1.5 text-xs ${/[A-Z]/.test(newPassword) ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                                                        <div className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${/[A-Z]/.test(newPassword) ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                                                            {/[A-Z]/.test(newPassword) ? <MdDone className="h-3 w-3" /> : ""}
                                                        </div>
                                                        Satu huruf kapital
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Konfirmasi Kata Sandi
                                        </label>
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-3 pr-12 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-navy-700 dark:border-navy-600 dark:text-white dark:placeholder-gray-400"
                                                placeholder="Konfirmasi kata sandi baru Anda"
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    setErrorMessage(null); // Clear error when user makes changes
                                                }}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 dark:hover:text-white focus:outline-none"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <MdVisibilityOff className="h-5 w-5" />
                                                ) : (
                                                    <MdVisibility className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Password match indicator */}
                                        {confirmPassword && (
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="mt-1.5 flex items-center gap-1"
                                            >
                                                {newPassword === confirmPassword ? (
                                                    <>
                                                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                            <MdDone className="h-3 w-3 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <p className="text-xs text-green-600 dark:text-green-400">Kata sandi cocok</p>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-red-500">Kata sandi tidak cocok</p>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            type="submit"
                                            className="linear flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-medium transition-all bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <div className="flex items-center justify-center">
                                                    <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                    <span className="ml-2">Memproses...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    Perbarui Kata Sandi
                                                    <MdArrowForward className="h-5 w-5" />
                                                </>
                                            )}
                                        </motion.button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
        </div>
    );
};

export default ChangePassword;