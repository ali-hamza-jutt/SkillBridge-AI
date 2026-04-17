export type BidModule = {
  title: string;
  details: string;
  amount: number;
};

export type TaskBid = {
  _id: string;
  taskId: string;
  freelancerId: string;
  freelancerName?: string;
  bidAmount: number;
  coverLetter: string;
  attachments?: Array<
    | string
    | {
        fileName?: string;
        type?: string;
        url?: string;
        sizeMb?: number;
      }
  >;
  payoutType: "whole" | "module_based";
  modules?: BidModule[];
  createdAt?: string;
};

export type Task = {
  _id: string;
  clientId: string;
  title: string;
  description: string;
  budget: number;
  maxBudget?: number;
  budgetType: "hourly" | "fixed";
  projectType: "ongoing" | "one_time";
  experienceLevel: "entry" | "intermediate" | "expert";
  status: string;
  requiredSkills?: string[];
  categoryName?: string;
  subCategoryName?: string;
};
