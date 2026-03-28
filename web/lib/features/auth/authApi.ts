import { emptySplitApi as api } from "../../api/emptyApi";
export const addTagTypes = ["Auth", "Users"] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      authControllerLogin: build.mutation<
        AuthControllerLoginApiResponse,
        AuthControllerLoginApiArg
      >({
        query: (queryArg) => ({
          url: `/auth/login`,
          method: "POST",
          body: queryArg.loginDto,
        }),
        invalidatesTags: ["Auth"],
      }),
      usersControllerCreate: build.mutation<
        UsersControllerCreateApiResponse,
        UsersControllerCreateApiArg
      >({
        query: (queryArg) => ({
          url: `/users`,
          method: "POST",
          body: queryArg.createUserDto,
        }),
        invalidatesTags: ["Users"],
      }),
      usersControllerFindAll: build.query<
        UsersControllerFindAllApiResponse,
        UsersControllerFindAllApiArg
      >({
        query: () => ({ url: `/users` }),
        providesTags: ["Users"],
      }),
      usersControllerFindOne: build.query<
        UsersControllerFindOneApiResponse,
        UsersControllerFindOneApiArg
      >({
        query: (queryArg) => ({ url: `/users/${queryArg.id}` }),
        providesTags: ["Users"],
      }),
      usersControllerUpdate: build.mutation<
        UsersControllerUpdateApiResponse,
        UsersControllerUpdateApiArg
      >({
        query: (queryArg) => ({
          url: `/users/${queryArg.id}`,
          method: "PATCH",
          body: queryArg.updateUserDto,
        }),
        invalidatesTags: ["Users"],
      }),
      usersControllerDelete: build.mutation<
        UsersControllerDeleteApiResponse,
        UsersControllerDeleteApiArg
      >({
        query: (queryArg) => ({
          url: `/users/${queryArg.id}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Users"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as authApi };
export type AuthControllerLoginApiResponse = unknown;
export type AuthControllerLoginApiArg = {
  loginDto: LoginDto;
};
export type UsersControllerCreateApiResponse = unknown;
export type UsersControllerCreateApiArg = {
  createUserDto: CreateUserDto;
};
export type UsersControllerFindAllApiResponse = unknown;
export type UsersControllerFindAllApiArg = void;
export type UsersControllerFindOneApiResponse = unknown;
export type UsersControllerFindOneApiArg = {
  id: string;
};
export type UsersControllerUpdateApiResponse = unknown;
export type UsersControllerUpdateApiArg = {
  id: string;
  updateUserDto: UpdateUserDto;
};
export type UsersControllerDeleteApiResponse = unknown;
export type UsersControllerDeleteApiArg = {
  id: string;
};
export type LoginDto = {
  email: string;
  password: string;
};
export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  skills: string[];
};
export type UpdateUserDto = {};
export const {
  useAuthControllerLoginMutation,
  useUsersControllerCreateMutation,
  useUsersControllerFindAllQuery,
  useUsersControllerFindOneQuery,
  useUsersControllerUpdateMutation,
  useUsersControllerDeleteMutation,
} = injectedRtkApi;
