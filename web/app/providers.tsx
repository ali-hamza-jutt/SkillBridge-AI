"use client";

import { PropsWithChildren, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { setCredentials } from "@/lib/features/auth/authSlice";

function AuthBootstrap() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("auth_refresh_token");
    const email = localStorage.getItem("auth_email");
    const userId = localStorage.getItem("auth_user_id");
    const role = localStorage.getItem("auth_role") as
      | "FREELANCER"
      | "HIRER"
      | "ADMIN"
      | null;

    if (token && refreshToken) {
      store.dispatch(setCredentials({ token, refreshToken, email, userId, role }));
    }
  }, []);

  return null;
}

export default function Providers({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      {children}
    </Provider>
  );
}
