import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

const store = configureStore({
    reducer: {
        auth: authReducer,
        // Add other reducers here...
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore specific action types that might contain non-serializable values
                ignoredActions: [
                    'user/getMe/pending',
                    'user/getMe/fulfilled',
                    'auth/setMicroPage'
                ],
                // Ignore paths in the state that might contain non-serializable values
                ignoredPaths: ['auth.baseURL'],
            },
        }),
});

export default store;
