import { emptySplitApi } from "./emptyApi";
import type { Meeting } from "@/lib/types/chat";

const meetingsApi = emptySplitApi.injectEndpoints({
  endpoints: (build) => ({
    meetingsControllerCancel: build.mutation<Meeting, { id: string }>({
      query: ({ id }) => ({
        url: `/meetings/${id}/cancel`,
        method: "PATCH",
      }),
    }),
  }),
});

export const { useMeetingsControllerCancelMutation } = meetingsApi;
