import { emptySplitApi as api } from "./emptyApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    appControllerGetHello: build.query<
      AppControllerGetHelloApiResponse,
      AppControllerGetHelloApiArg
    >({
      query: () => ({ url: `/` }),
    }),
    authControllerSignup: build.mutation<
      AuthControllerSignupApiResponse,
      AuthControllerSignupApiArg
    >({
      query: (queryArg) => ({
        url: `/auth/signup`,
        method: "POST",
        body: queryArg.signupDto,
      }),
    }),
    authControllerLogin: build.mutation<
      AuthControllerLoginApiResponse,
      AuthControllerLoginApiArg
    >({
      query: (queryArg) => ({
        url: `/auth/login`,
        method: "POST",
        body: queryArg.loginDto,
      }),
    }),
    authControllerRefresh: build.mutation<
      AuthControllerRefreshApiResponse,
      AuthControllerRefreshApiArg
    >({
      query: (queryArg) => ({
        url: `/auth/refresh`,
        method: "POST",
        body: queryArg.refreshTokenDto,
      }),
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
    }),
    usersControllerFindAll: build.query<
      UsersControllerFindAllApiResponse,
      UsersControllerFindAllApiArg
    >({
      query: () => ({ url: `/users` }),
    }),
    usersControllerFindOne: build.query<
      UsersControllerFindOneApiResponse,
      UsersControllerFindOneApiArg
    >({
      query: (queryArg) => ({ url: `/users/${queryArg.id}` }),
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
    }),
    usersControllerDelete: build.mutation<
      UsersControllerDeleteApiResponse,
      UsersControllerDeleteApiArg
    >({
      query: (queryArg) => ({ url: `/users/${queryArg.id}`, method: "DELETE" }),
    }),
    tasksControllerCreate: build.mutation<
      TasksControllerCreateApiResponse,
      TasksControllerCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks`,
        method: "POST",
        body: queryArg.createTaskDto,
      }),
    }),
    tasksControllerFindAll: build.query<
      TasksControllerFindAllApiResponse,
      TasksControllerFindAllApiArg
    >({
      query: () => ({ url: `/tasks` }),
    }),
    tasksControllerFindByCategory: build.query<
      TasksControllerFindByCategoryApiResponse,
      TasksControllerFindByCategoryApiArg
    >({
      query: (queryArg) => ({ url: `/tasks/category/${queryArg.categoryId}` }),
    }),
    tasksControllerFindBySubCategory: build.query<
      TasksControllerFindBySubCategoryApiResponse,
      TasksControllerFindBySubCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/sub-category/${queryArg.subCategoryId}`,
      }),
    }),
    tasksControllerFindByCategoryAndSubCategory: build.query<
      TasksControllerFindByCategoryAndSubCategoryApiResponse,
      TasksControllerFindByCategoryAndSubCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/category/${queryArg.categoryId}/sub-category/${queryArg.subCategoryId}`,
      }),
    }),
    tasksControllerGetTaskAssignedToDeveloper: build.query<
      TasksControllerGetTaskAssignedToDeveloperApiResponse,
      TasksControllerGetTaskAssignedToDeveloperApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/developer/${queryArg.developerId}/assigned`,
      }),
    }),
    tasksControllerGetTaskCompletedByDeveloper: build.query<
      TasksControllerGetTaskCompletedByDeveloperApiResponse,
      TasksControllerGetTaskCompletedByDeveloperApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/developer/${queryArg.developerId}/completed`,
      }),
    }),
    tasksControllerGetMyOpenTasks: build.query<
      TasksControllerGetMyOpenTasksApiResponse,
      TasksControllerGetMyOpenTasksApiArg
    >({
      query: () => ({ url: `/tasks/my-open` }),
    }),
    tasksControllerGetMatches: build.query<
      TasksControllerGetMatchesApiResponse,
      TasksControllerGetMatchesApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/matches`,
        params: {
          categoryId: queryArg.categoryId,
          subCategories: queryArg.subCategories,
          skills: queryArg.skills,
        },
      }),
    }),
    tasksControllerFindOne: build.query<
      TasksControllerFindOneApiResponse,
      TasksControllerFindOneApiArg
    >({
      query: (queryArg) => ({ url: `/tasks/${queryArg.id}` }),
    }),
    tasksControllerUpdate: build.mutation<
      TasksControllerUpdateApiResponse,
      TasksControllerUpdateApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.updateTaskDto,
      }),
    }),
    tasksControllerDelete: build.mutation<
      TasksControllerDeleteApiResponse,
      TasksControllerDeleteApiArg
    >({
      query: (queryArg) => ({ url: `/tasks/${queryArg.id}`, method: "DELETE" }),
    }),
    tasksControllerUpdateTaskStatus: build.mutation<
      TasksControllerUpdateTaskStatusApiResponse,
      TasksControllerUpdateTaskStatusApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/${queryArg.id}/status`,
        method: "PATCH",
        body: queryArg.updateTaskStatusDto,
      }),
    }),
    tasksControllerAssignTask: build.mutation<
      TasksControllerAssignTaskApiResponse,
      TasksControllerAssignTaskApiArg
    >({
      query: (queryArg) => ({
        url: `/tasks/${queryArg.taskId}/assign`,
        method: "POST",
        body: queryArg.assignTaskDto,
      }),
    }),
    categoryControllerCreateCategory: build.mutation<
      CategoryControllerCreateCategoryApiResponse,
      CategoryControllerCreateCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/categories`,
        method: "POST",
        body: queryArg.createCategoryDto,
      }),
    }),
    categoryControllerGetAllCategories: build.query<
      CategoryControllerGetAllCategoriesApiResponse,
      CategoryControllerGetAllCategoriesApiArg
    >({
      query: () => ({ url: `/categories` }),
    }),
    categoryControllerGetCategoryById: build.query<
      CategoryControllerGetCategoryByIdApiResponse,
      CategoryControllerGetCategoryByIdApiArg
    >({
      query: (queryArg) => ({ url: `/categories/${queryArg.id}` }),
    }),
    categoryControllerCreateSubCategory: build.mutation<
      CategoryControllerCreateSubCategoryApiResponse,
      CategoryControllerCreateSubCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/categories/sub-categories`,
        method: "POST",
        body: queryArg.createSubCategoryDto,
      }),
    }),
    categoryControllerUpdateSubCategoryName: build.mutation<
      CategoryControllerUpdateSubCategoryNameApiResponse,
      CategoryControllerUpdateSubCategoryNameApiArg
    >({
      query: (queryArg) => ({
        url: `/categories/sub-categories/${queryArg.id}`,
        method: "PATCH",
        body: queryArg.updateSubCategoryNameDto,
      }),
    }),
    categoryControllerGetSubCategoryById: build.query<
      CategoryControllerGetSubCategoryByIdApiResponse,
      CategoryControllerGetSubCategoryByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/categories/sub-categories/${queryArg.id}`,
      }),
    }),
    categoryControllerGetSubCategories: build.query<
      CategoryControllerGetSubCategoriesApiResponse,
      CategoryControllerGetSubCategoriesApiArg
    >({
      query: (queryArg) => ({
        url: `/categories/${queryArg.categoryId}/sub-categories`,
      }),
    }),
    bidsControllerUploadAttachments: build.mutation<
      BidsControllerUploadAttachmentsApiResponse,
      BidsControllerUploadAttachmentsApiArg
    >({
      query: (queryArg) => ({
        url: `/bids/attachments/upload`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    bidsControllerCreate: build.mutation<
      BidsControllerCreateApiResponse,
      BidsControllerCreateApiArg
    >({
      query: (queryArg) => ({
        url: `/bids`,
        method: "POST",
        body: queryArg.createBidDto,
      }),
    }),
    bidsControllerFindByTask: build.query<
      BidsControllerFindByTaskApiResponse,
      BidsControllerFindByTaskApiArg
    >({
      query: (queryArg) => ({ url: `/bids/task/${queryArg.taskId}` }),
    }),
    bidsControllerDelete: build.mutation<
      BidsControllerDeleteApiResponse,
      BidsControllerDeleteApiArg
    >({
      query: (queryArg) => ({ url: `/bids/${queryArg.id}`, method: "DELETE" }),
    }),
    notificationsControllerGetUserNotifications: build.query<
      NotificationsControllerGetUserNotificationsApiResponse,
      NotificationsControllerGetUserNotificationsApiArg
    >({
      query: () => ({ url: `/notifications` }),
    }),
    notificationsControllerMarkAsRead: build.mutation<
      NotificationsControllerMarkAsReadApiResponse,
      NotificationsControllerMarkAsReadApiArg
    >({
      query: (queryArg) => ({
        url: `/notifications/${queryArg.id}/read`,
        method: "PATCH",
      }),
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as apiHooks };
export type AppControllerGetHelloApiResponse = unknown;
export type AppControllerGetHelloApiArg = void;
export type AuthControllerSignupApiResponse = unknown;
export type AuthControllerSignupApiArg = {
  signupDto: SignupDto;
};
export type AuthControllerLoginApiResponse = unknown;
export type AuthControllerLoginApiArg = {
  loginDto: LoginDto;
};
export type AuthControllerRefreshApiResponse = unknown;
export type AuthControllerRefreshApiArg = {
  refreshTokenDto: RefreshTokenDto;
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
export type TasksControllerCreateApiResponse = unknown;
export type TasksControllerCreateApiArg = {
  createTaskDto: CreateTaskDto;
};
export type TasksControllerFindAllApiResponse = unknown;
export type TasksControllerFindAllApiArg = void;
export type TasksControllerFindByCategoryApiResponse = unknown;
export type TasksControllerFindByCategoryApiArg = {
  categoryId: string;
};
export type TasksControllerFindBySubCategoryApiResponse = unknown;
export type TasksControllerFindBySubCategoryApiArg = {
  subCategoryId: string;
};
export type TasksControllerFindByCategoryAndSubCategoryApiResponse = unknown;
export type TasksControllerFindByCategoryAndSubCategoryApiArg = {
  categoryId: string;
  subCategoryId: string;
};
export type TasksControllerGetTaskAssignedToDeveloperApiResponse = unknown;
export type TasksControllerGetTaskAssignedToDeveloperApiArg = {
  developerId: string;
};
export type TasksControllerGetTaskCompletedByDeveloperApiResponse = unknown;
export type TasksControllerGetTaskCompletedByDeveloperApiArg = {
  developerId: string;
};
export type TasksControllerGetMyOpenTasksApiResponse = unknown;
export type TasksControllerGetMyOpenTasksApiArg = void;
export type TasksControllerGetMatchesApiResponse = unknown;
export type TasksControllerGetMatchesApiArg = {
  categoryId: string;
  subCategories: string;
  skills: string;
};
export type TasksControllerFindOneApiResponse = unknown;
export type TasksControllerFindOneApiArg = {
  id: string;
};
export type TasksControllerUpdateApiResponse = unknown;
export type TasksControllerUpdateApiArg = {
  id: string;
  updateTaskDto: UpdateTaskDto;
};
export type TasksControllerDeleteApiResponse = unknown;
export type TasksControllerDeleteApiArg = {
  id: string;
};
export type TasksControllerUpdateTaskStatusApiResponse = unknown;
export type TasksControllerUpdateTaskStatusApiArg = {
  id: string;
  updateTaskStatusDto: UpdateTaskStatusDto;
};
export type TasksControllerAssignTaskApiResponse = unknown;
export type TasksControllerAssignTaskApiArg = {
  taskId: string;
  assignTaskDto: AssignTaskDto;
};
export type CategoryControllerCreateCategoryApiResponse = unknown;
export type CategoryControllerCreateCategoryApiArg = {
  createCategoryDto: CreateCategoryDto;
};
export type CategoryControllerGetAllCategoriesApiResponse = unknown;
export type CategoryControllerGetAllCategoriesApiArg = void;
export type CategoryControllerGetCategoryByIdApiResponse = unknown;
export type CategoryControllerGetCategoryByIdApiArg = {
  id: string;
};
export type CategoryControllerCreateSubCategoryApiResponse = unknown;
export type CategoryControllerCreateSubCategoryApiArg = {
  createSubCategoryDto: CreateSubCategoryDto;
};
export type CategoryControllerUpdateSubCategoryNameApiResponse = unknown;
export type CategoryControllerUpdateSubCategoryNameApiArg = {
  id: string;
  updateSubCategoryNameDto: UpdateSubCategoryNameDto;
};
export type CategoryControllerGetSubCategoryByIdApiResponse = unknown;
export type CategoryControllerGetSubCategoryByIdApiArg = {
  id: string;
};
export type CategoryControllerGetSubCategoriesApiResponse = unknown;
export type CategoryControllerGetSubCategoriesApiArg = {
  categoryId: string;
};
export type BidsControllerUploadAttachmentsApiResponse = unknown;
export type BidsControllerUploadAttachmentsApiArg = {
  body: {
    files?: Blob[];
  };
};
export type BidsControllerCreateApiResponse = unknown;
export type BidsControllerCreateApiArg = {
  createBidDto: CreateBidDto;
};
export type BidsControllerFindByTaskApiResponse = unknown;
export type BidsControllerFindByTaskApiArg = {
  taskId: string;
};
export type BidsControllerDeleteApiResponse = unknown;
export type BidsControllerDeleteApiArg = {
  id: string;
};
export type NotificationsControllerGetUserNotificationsApiResponse = unknown;
export type NotificationsControllerGetUserNotificationsApiArg = void;
export type NotificationsControllerMarkAsReadApiResponse = unknown;
export type NotificationsControllerMarkAsReadApiArg = {
  id: string;
};
export type SignupDto = {
  name: string;
  email: string;
  password: string;
  skills?: string[];
  /** Required for freelancer signups. */
  categoryId?: string;
  role: "FREELANCER" | "HIRER" | "ADMIN";
};
export type LoginDto = {
  email: string;
  password: string;
};
export type RefreshTokenDto = {
  refreshToken: string;
};
export type CreateUserDto = {
  name: string;
  email: string;
  password: string;
  skills: string[];
  categoryId?: string;
  role?: "FREELANCER" | "HIRER" | "ADMIN";
};
export type UpdateUserDto = {};
export type BudgetType = "hourly" | "fixed";
export type ProjectType = "ongoing" | "one_time";
export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type CreateTaskDto = {
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: BudgetType;
  projectType: ProjectType;
  categoryId: string;
  subCategoryId: string;
  requiredSkills?: string[];
  experienceLevel: ExperienceLevel;
};
export type UpdateTaskDto = {};
export type TaskStatus = "OPEN" | "ASSIGNED" | "COMPLETED" | "CLOSED";
export type UpdateTaskStatusDto = {
  status: TaskStatus;
  developerId?: string;
};
export type AssignTaskDto = {
  bidId: string;
};
export type CreateCategoryDto = {
  name: string;
};
export type CreateSubCategoryDto = {
  categoryId: string;
  name: string;
};
export type UpdateSubCategoryNameDto = {
  name: string;
};
export type BidAttachmentType = "photo" | "video" | "pdf" | "word";
export type BidAttachmentDto = {
  fileName: string;
  type: BidAttachmentType;
  url: string;
  /** Attachment size in MB. Maximum allowed is 100 MB per file. */
  sizeMb: number;
};
export type BidPayoutType = "whole" | "module_based";
export type BidMilestoneDto = {
  title: string;
  details: string;
  amount: number;
};
export type CreateBidDto = {
  taskId: string;
  bidAmount: number;
  /** Freelancer cover letter for this bid. */
  coverLetter: string;
  /** Optional supporting files. Max 10 attachments, each up to 100 MB. */
  attachments?: BidAttachmentDto[];
  payoutType: BidPayoutType;
  /** Required when payoutType is module_based. Include each module detail and payment amount. */
  modules?: BidMilestoneDto[];
};
export const {
  useAppControllerGetHelloQuery,
  useAuthControllerSignupMutation,
  useAuthControllerLoginMutation,
  useAuthControllerRefreshMutation,
  useUsersControllerCreateMutation,
  useUsersControllerFindAllQuery,
  useUsersControllerFindOneQuery,
  useUsersControllerUpdateMutation,
  useUsersControllerDeleteMutation,
  useTasksControllerCreateMutation,
  useTasksControllerFindAllQuery,
  useTasksControllerFindByCategoryQuery,
  useTasksControllerFindBySubCategoryQuery,
  useTasksControllerFindByCategoryAndSubCategoryQuery,
  useTasksControllerGetTaskAssignedToDeveloperQuery,
  useTasksControllerGetTaskCompletedByDeveloperQuery,
  useTasksControllerGetMyOpenTasksQuery,
  useTasksControllerGetMatchesQuery,
  useTasksControllerFindOneQuery,
  useTasksControllerUpdateMutation,
  useTasksControllerDeleteMutation,
  useTasksControllerUpdateTaskStatusMutation,
  useTasksControllerAssignTaskMutation,
  useCategoryControllerCreateCategoryMutation,
  useCategoryControllerGetAllCategoriesQuery,
  useCategoryControllerGetCategoryByIdQuery,
  useCategoryControllerCreateSubCategoryMutation,
  useCategoryControllerUpdateSubCategoryNameMutation,
  useCategoryControllerGetSubCategoryByIdQuery,
  useCategoryControllerGetSubCategoriesQuery,
  useBidsControllerUploadAttachmentsMutation,
  useBidsControllerCreateMutation,
  useBidsControllerFindByTaskQuery,
  useBidsControllerDeleteMutation,
  useNotificationsControllerGetUserNotificationsQuery,
  useNotificationsControllerMarkAsReadMutation,
} = injectedRtkApi;
