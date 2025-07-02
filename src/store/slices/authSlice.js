import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL,  // NO HARDCODE FALLBACK
    withCredentials: true, // Setel secara global
});

// Get user's preferred language from localStorage or use default
const getInitialLanguage = () => {
    const savedLanguage = localStorage.getItem("language");
    return savedLanguage || "EN"; // Default to English
};

const initialState = {
    user: null,
    baseURL: api,
    microPage: "unset", // default value of microPage
    homepage: "unset",
    page: "unset",
    language: getInitialLanguage(), // Add language to initial state
    isError: false,
    isSuccess: false,
    isLoading: false,
    message: "",
};

// Thunk untuk mendapatkan data pengguna
export const getMe = createAsyncThunk("user/getMe", async (_, thunkAPI) => {
    try {
        const response = await api.get("/auth/me");
        return response.data;
    } catch (error) {
        const message = error?.response?.data?.msg || "Something went wrong!";
        return thunkAPI.rejectWithValue(message);
    }
});

// Thunk untuk logout pengguna
export const logoutUser = createAsyncThunk("user/logoutUser", async (_, thunkAPI) => {
    try {
        await api.delete("/auth/logout");
        // Reset user state after logout
        return null;
    } catch (error) {
        const message = error?.response?.data?.msg || "Something went wrong!";
        return thunkAPI.rejectWithValue(message);
    }
});

// Thunk untuk login pengguna
export const loginUser = createAsyncThunk("user/loginUser", async (user, thunkAPI) => {
    try {
        const response = await api.post("/auth/login", user);
        return response.data;
    } catch (error) {
        const message = error?.response?.data?.msg || "Something went wrong!";
        return thunkAPI.rejectWithValue(message);
    }
});

// Thunk untuk mendapatkan detail produk
export const getProductManagement = createAsyncThunk("user/getProductManagement", async (productId, thunkAPI) => {
    try {
        const response = await api.post("/get-product-detail-management", { productId });
        return response.data;
    } catch (error) {
        const message = error?.response?.data?.msg || "Something went wrong!";
        return thunkAPI.rejectWithValue(message);
    }
});

// Slice Redux untuk otentikasi
export const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        reset: (state) => {
            // Preserve baseURL and language when resetting
            const { baseURL, language } = state;
            return { ...initialState, baseURL, language };
        },
        setMicroPage: (state, action) => {
            state.microPage = action.payload; // Update microPage value
        },
        setPage: (state, action) => {
            state.page = action.payload; // Update microPage value
        },
        // Add new reducer for language change
        setLanguage: (state, action) => {
            state.language = action.payload;
            // Save to localStorage for persistence
            localStorage.setItem("language", action.payload);
        },
    },
    extraReducers: (builder) => {
        builder
            // Login User
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Me
            .addCase(getMe.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMe.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = action.payload;
            })
            .addCase(getMe.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Get Product Management
            .addCase(getProductManagement.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getProductManagement.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.product = action.payload;
            })
            .addCase(getProductManagement.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Logout User
            .addCase(logoutUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(logoutUser.fulfilled, (state) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.user = null; // Clear user data on logout
            })
            .addCase(logoutUser.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { reset, setMicroPage, setPage, setLanguage } = authSlice.actions;

export default authSlice.reducer;
