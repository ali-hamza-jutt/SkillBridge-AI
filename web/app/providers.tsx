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
    const categoryId = localStorage.getItem("auth_category_id");
    const skillsRaw = localStorage.getItem("auth_skills");
    const role = localStorage.getItem("auth_role") as
      | "FREELANCER"
      | "HIRER"
      | "ADMIN"
      | null;
    let skills: string[] = [];

    if (skillsRaw) {
      try {
        skills = JSON.parse(skillsRaw) as string[];
      } catch {
        skills = [];
      }
    }

    if (token && refreshToken) {
      store.dispatch(setCredentials({ token, refreshToken, email, userId, role, categoryId, skills }));
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
