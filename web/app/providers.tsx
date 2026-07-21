"use client";

import { PropsWithChildren, useEffect } from "react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import { store } from "@/lib/store";
import { setCredentials, setHydrated } from "@/lib/features/auth/authSlice";
import ChatSocketProvider from "@/components/chat-socket-provider";
import { NotificationsProvider } from "@/lib/notifications-context";
import { useConversationListRealtimeUpdates } from "@/lib/useConversationListRealtimeUpdates";

function ConversationRealtimeSync() {
  useConversationListRealtimeUpdates();
  return null;
}

function AuthBootstrap() {
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const refreshToken = localStorage.getItem("auth_refresh_token");
    const email = localStorage.getItem("auth_email");
    const userId = localStorage.getItem("auth_user_id");
    const categoryId = localStorage.getItem("auth_category_id");
    const skillsRaw = localStorage.getItem("auth_skills");
    const avatarUrl = localStorage.getItem("auth_avatar_url");
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
      store.dispatch(setCredentials({ token, refreshToken, email, userId, role, categoryId, skills, avatarUrl }));
    }

    store.dispatch(setHydrated(true));
  }, []);

  return null;
}

export default function Providers({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <AuthBootstrap />
      <Toaster position="top-right" richColors closeButton duration={5000} />
      <ChatSocketProvider>
        <ConversationRealtimeSync />
        <NotificationsProvider>{children}</NotificationsProvider>
      </ChatSocketProvider>
    </Provider>
  );
}
