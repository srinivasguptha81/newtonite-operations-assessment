export type SystemRole = 'admin' | 'manager' | 'member';
export type TeamMemberRole = 'manager' | 'member';

export type WorkItemCategory =
  | 'customer_issue'
  | 'engineering_problem'
  | 'payment_investigation'
  | 'production_incident'
  | 'compliance_request'
  | 'operational_task';

export type WorkItemPriority = 'low' | 'medium' | 'high' | 'critical';

export type WorkItemStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'awaiting_approval'
  | 'resolved'
  | 'closed';

export interface UserSummary {
  id: string;
  email: string;
  full_name: string;
  system_role: SystemRole;
}

export interface TeamMembershipBrief {
  team_id: string;
  team_name: string;
  role: TeamMemberRole;
}

export interface UserProfile extends UserSummary {
  is_active: boolean;
  created_at: string;
  team_memberships: TeamMembershipBrief[];
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  member_count: number;
}

export interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  created_at: string;
  user: UserSummary;
}

export interface TeamDetail extends Team {
  memberships: TeamMembership[];
}

export interface WorkItem {
  id: string;
  key: string;
  title: string;
  description: string;
  reason: string;
  category: WorkItemCategory;
  priority: WorkItemPriority;
  status: WorkItemStatus;
  team_id: string;
  creator_id: string;
  assignee_id?: string | null;
  due_date?: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
  creator?: UserSummary;
  assignee?: UserSummary | null;
}

export interface WorkItemListResponse {
  items: WorkItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Comment {
  id: string;
  work_item_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  author?: UserSummary;
}

export interface ActivityLog {
  id: string;
  work_item_id: string;
  actor_id: string;
  action: string;
  details: Record<string, any>;
  created_at: string;
  actor?: UserSummary;
}

export interface DashboardStats {
  total_open: number;
  critical_count: number;
  high_count: number;
  overdue_count: number;
  blocked_count: number;
  awaiting_approval_count: number;
  my_assigned_count: number;
}

export interface DashboardSummary {
  stats: DashboardStats;
  urgent_items: WorkItem[];
  awaiting_approval_items: WorkItem[];
  recent_activity: ActivityLog[];
}
