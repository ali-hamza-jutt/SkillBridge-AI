import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import authReducer from "@/lib/features/auth/authSlice";
import { apiHooks } from "@/lib/api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [apiHooks.reducerPath]: apiHooks.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiHooks.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
