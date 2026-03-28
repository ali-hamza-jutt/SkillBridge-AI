import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
};

const initialState: AuthState = {
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
        token: string;
        refreshToken?: string | null;
        email: string | null;
      }>,
    ) => {
      state.token = action.payload.token;
      if (typeof action.payload.refreshToken !== "undefined") {
        state.refreshToken = action.payload.refreshToken;
      }
      state.email = action.payload.email;
    },
    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.email = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
