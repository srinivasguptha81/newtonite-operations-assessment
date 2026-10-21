import {
  UserProfile,
  UserSummary,
  Team,
  TeamDetail,
  WorkItem,
  WorkItemListResponse,
  Comment,
  ActivityLog,
  DashboardSummary,
  WorkItemCategory,
  WorkItemPriority,
  WorkItemStatus,
  SystemRole,
  TeamMemberRole,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '') + '/api/v1';

export class ApiError extends Error {
  status: number;
  data: any;
  currentVersion?: number;

  constructor(message: string, status: number, data: any, currentVersion?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.currentVersion = currentVersion;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; headers: Headers }> {
  const token = localStorage.getItem('newtonite_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const responseHeaders = response.headers;

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }

    // Capture conflict version if supplied in header
    const currentVerHeader = responseHeaders.get('x-current-version');
    const currentVersion = currentVerHeader ? parseInt(currentVerHeader, 10) : undefined;

    if (response.status === 401) {
      localStorage.removeItem('newtonite_token');
      localStorage.removeItem('newtonite_user');
      window.dispatchEvent(new Event('newtonite_auth_expired'));
    }

    throw new ApiError(
      errorData.detail || 'An unexpected server error occurred',
      response.status,
      errorData,
      currentVersion
    );
  }

  if (response.status === 204) {
    return { data: {} as T, headers: responseHeaders };
  }

  const data = await response.json();
  return { data, headers: responseHeaders };
}

export const api = {
  auth: {
    login: async (email: string, password: string) => {
      const res = await request<{ access_token: string; token_type: string; user: UserSummary }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      localStorage.setItem('newtonite_token', res.data.access_token);
      localStorage.setItem('newtonite_user', JSON.stringify(res.data.user));
      return res.data;
    },
    register: async (email: string, full_name: string, password: string) => {
      const res = await request<UserSummary>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, full_name, password }),
      });
      return res.data;
    },
    me: async () => {
      const res = await request<UserProfile>('/auth/me');
      return res.data;
    },
    logout: () => {
      localStorage.removeItem('newtonite_token');
      localStorage.removeItem('newtonite_user');
      window.dispatchEvent(new Event('newtonite_auth_logout'));
    },
  },

  dashboard: {
    getSummary: async (teamId?: string) => {
      const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : '';
      const res = await request<DashboardSummary>(`/dashboard/summary${query}`);
      return res.data;
    },
  },

  teams: {
    list: async () => {
      const res = await request<Team[]>('/teams');
      return res.data;
    },
    get: async (id: string) => {
      const res = await request<TeamDetail>(`/teams/${id}`);
      return res.data;
    },
    create: async (name: string, description?: string) => {
      const res = await request<Team>('/teams', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      });
      return res.data;
    },
    addMember: async (teamId: string, userId: string, role: TeamMemberRole) => {
      const res = await request(`/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, role }),
      });
      return res.data;
    },
    removeMember: async (teamId: string, userId: string) => {
      await request(`/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
      });
    },
  },

  users: {
    list: async () => {
      const res = await request<UserSummary[]>('/users');
      return res.data;
    },
    updateRole: async (userId: string, systemRole: SystemRole) => {
      const res = await request<UserSummary>(`/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ system_role: systemRole }),
      });
      return res.data;
    },
  },

  workItems: {
    list: async (params: {
      team_id?: string;
      status?: string;
      priority?: string;
      category?: string;
      assignee_id?: string;
      search?: string;
      overdue?: boolean;
      page?: number;
      page_size?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params.team_id) searchParams.set('team_id', params.team_id);
      if (params.status) searchParams.set('status', params.status);
      if (params.priority) searchParams.set('priority', params.priority);
      if (params.category) searchParams.set('category', params.category);
      if (params.assignee_id) searchParams.set('assignee_id', params.assignee_id);
      if (params.search) searchParams.set('search', params.search);
      if (params.overdue) searchParams.set('overdue', 'true');
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.page_size) searchParams.set('page_size', params.page_size.toString());

      const res = await request<WorkItemListResponse>(`/work-items?${searchParams.toString()}`);
      return res.data;
    },

    get: async (idOrKey: string) => {
      const res = await request<WorkItem>(`/work-items/${idOrKey}`);
      return res.data;
    },

    create: async (
      data: {
        title: string;
        description: string;
        reason: string;
        category: WorkItemCategory;
        priority: WorkItemPriority;
        team_id: string;
        assignee_id?: string | null;
        due_date?: string | null;
      },
      idempotencyKey?: string
    ) => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
      }
      const res = await request<WorkItem>('/work-items', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      return {
        item: res.data,
        isIdempotentHit: res.headers.get('x-cache') === 'IDEMPOTENT-HIT',
      };
    },

    update: async (
      id: string,
      data: {
        title?: string;
        description?: string;
        reason?: string;
        category?: WorkItemCategory;
        priority?: WorkItemPriority;
        due_date?: string | null;
        version: number;
      }
    ) => {
      const res = await request<WorkItem>(`/work-items/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return res.data;
    },

    assign: async (id: string, assignee_id: string | null, version: number) => {
      const res = await request<WorkItem>(`/work-items/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ assignee_id, version }),
      });
      return res.data;
    },

    transition: async (id: string, status: WorkItemStatus, version: number, note?: string) => {
      const res = await request<WorkItem>(`/work-items/${id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ status, version, note }),
      });
      return res.data;
    },
  },

  comments: {
    list: async (itemId: string) => {
      const res = await request<Comment[]>(`/work-items/${itemId}/comments`);
      return res.data;
    },
    create: async (itemId: string, content: string) => {
      const res = await request<Comment>(`/work-items/${itemId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      return res.data;
    },
  },

  activity: {
    listForItem: async (itemId: string) => {
      const res = await request<ActivityLog[]>(`/work-items/${itemId}/activity`);
      return res.data;
    },
    listSystem: async (limit: number = 50) => {
      const res = await request<ActivityLog[]>(`/activities/system?limit=${limit}`);
      return res.data;
    },
  },
};
