import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  userId: string | null;
  role: "FREELANCER" | "HIRER" | "ADMIN" | null;
  categoryId: string | null;
  skills: string[];
  token: string | null;
  refreshToken: string | null;
  email: string | null;
};

const initialState: AuthState = {
  userId: null,
  role: null,
  categoryId: null,
  skills: [],
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
        categoryId?: string | null;
        skills?: string[] | null;
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
      if (typeof action.payload.categoryId !== "undefined") {
        state.categoryId = action.payload.categoryId;
      }
      if (typeof action.payload.skills !== "undefined") {
        state.skills = action.payload.skills ?? [];
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
      state.categoryId = null;
      state.skills = [];
      state.token = null;
      state.refreshToken = null;
      state.email = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
