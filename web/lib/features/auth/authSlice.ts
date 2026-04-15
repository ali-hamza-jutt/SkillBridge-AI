import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  userId: string | null;
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  token: string | null;
  refreshToken: string | null;
  email: string | null;
};

const initialState: AuthState = {
  userId: null,
  role: null,
  token: null,
  refreshToken: null,
  email: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        userId?: string | null;
        role?: "FREELANCER" | "HIRER" | "ADMIN" | null;
        token: string;
        refreshToken?: string | null;
        email: string | null;
      }>,
    ) => {
      if (typeof action.payload.userId !== "undefined") {
        state.userId = action.payload.userId;
      }
      if (typeof action.payload.role !== "undefined") {
        state.role = action.payload.role;
      }
      state.token = action.payload.token;
      if (typeof action.payload.refreshToken !== "undefined") {
        state.refreshToken = action.payload.refreshToken;
      }
      state.email = action.payload.email;
    },
    logout: (state) => {
      state.userId = null;
      state.role = null;
      state.token = null;
      state.refreshToken = null;
      state.email = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
