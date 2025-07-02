import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';

// Store baseURL as a string constant - NO HARDCODE FALLBACK
const API_BASE_URL = process.env.REACT_APP_API_URL;

const initialState = {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
    baseURL: API_BASE_URL, // Store as string, not as a function
    currentMicroPage: null
};

// Create a separate axios instance for authentication
// Don't store this in the Redux state
export const authApi = axios.create({
    baseURL: API_BASE_URL
});

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setMicroPage(state, action) {
            // Only store serializable data in the state
            const { microPageName } = action.payload;
            state.currentMicroPage = microPageName;
        },
        loginStart(state) {
            state.loading = true;
            state.error = null;
        },
        loginSuccess(state, action) {
            state.loading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            localStorage.setItem('token', action.payload.token);
        },
        loginFailure(state, action) {
            state.loading = false;
            state.error = action.payload;
            state.isAuthenticated = false;
        },
        logout(state) {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            localStorage.removeItem('token');
        }
    },
    extraReducers: (builder) => {
        builder
            .addMatcher(
                (action) => action.type.endsWith('/pending') && action.type.startsWith('user/'),
                (state) => {
                    state.loading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                (action) => action.type.endsWith('/fulfilled') && action.type.startsWith('user/'),
                (state, action) => {
                    state.loading = false;
                    // Make sure we're not storing non-serializable values
                    if (action.payload) {
                        // Deep clone and sanitize the payload to ensure no functions
                        try {
                            const safePayload = JSON.parse(JSON.stringify(action.payload.user || action.payload));
                            state.user = safePayload;
                        } catch (e) {
                            console.warn('Failed to sanitize payload', e);
                        }
                    }
                }
            );
    }
});

// Export actions and reducer
export const { setMicroPage, loginStart, loginSuccess, loginFailure, logout } = authSlice.actions;
export default authSlice.reducer;
