import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { logout, setCredentials } from "@/lib/features/auth/authSlice";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type AuthState = {
  auth: {
    token: string | null;
    refreshToken: string | null;
    email: string | null;
  };
};

const isBrowser = typeof window !== "undefined";

const clearStoredAuth = () => {
  if (!isBrowser) {
    return;
  }

  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_refresh_token");
  localStorage.removeItem("auth_email");
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as AuthState).auth.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const state = api.getState() as AuthState;
    const refreshToken =
      state.auth.refreshToken ??
      (isBrowser ? localStorage.getItem("auth_refresh_token") : null);

    if (!refreshToken) {
      api.dispatch(logout());
      clearStoredAuth();
      return result;
    }

    const refreshResult = await baseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
        body: { refreshToken },
      },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const refreshData = refreshResult.data as {
        access_token: string;
        refresh_token: string;
        user?: { email?: string };
      };
      const email = refreshData.user?.email ?? state.auth.email;

      api.dispatch(
        setCredentials({
          token: refreshData.access_token,
          refreshToken: refreshData.refresh_token,
          email,
        }),
      );

      if (isBrowser) {
        localStorage.setItem("auth_token", refreshData.access_token);
        localStorage.setItem("auth_refresh_token", refreshData.refresh_token);
        if (email) {
          localStorage.setItem("auth_email", email);
        }
      }

      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
      clearStoredAuth();
    }
  }

  return result;
};

export const emptySplitApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});
