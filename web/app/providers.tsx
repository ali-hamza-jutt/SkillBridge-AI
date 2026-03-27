"use client";

import { PropsWithChildren, useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { setCredentials } from "@/lib/features/auth/authSlice";

function AuthBootstrap() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const email = localStorage.getItem("auth_email");

    if (token) {
      store.dispatch(setCredentials({ token, email }));
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
