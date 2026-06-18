export type UserRole = "admin" | "member";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  dashboardSharedWith: string[]; // user IDs who can view this user's dashboard
}

/** Directional rating share: fromUserId shares ratings TO toUserId */
export interface RatingShare {
  fromUserId: string;
  toUserId: string;
  enabled: boolean;
}
