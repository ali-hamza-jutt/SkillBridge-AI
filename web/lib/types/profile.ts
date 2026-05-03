export type ExperienceEntry = {
  _id?: string;
  company: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
};

export type EducationEntry = {
  _id?: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
};

export type ProjectMedia = {
  url: string;
  publicId: string;
  name: string;
  mimeType: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT";
  size?: number;
};

export type PortfolioProject = {
  _id: string;
  userId: string;
  title: string;
  description: string;
  role: string;
  techStack: string[];
  projectUrl?: string;
  media: ProjectMedia[];
  createdAt?: string;
  updatedAt?: string;
};

export type UserProfile = {
  _id: string;
  name: string;
  email: string;
  role: "FREELANCER" | "HIRER" | "ADMIN";
  categoryId?: string;
  skills?: string[];
  title?: string;
  bio?: string;
  avatarUrl?: string;
  hourlyRate?: number;
  experience?: ExperienceEntry[];
  education?: EducationEntry[];
  rating?: number;
};
