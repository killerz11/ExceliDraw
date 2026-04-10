
export function getToken(): string | null {
  if (typeof window === 'undefined') return null; // Ensure this runs only in the browser
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return; // Ensure this runs only in the browser
  localStorage.setItem('token', token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return; // Ensure this runs only in the browser
  localStorage.removeItem('token');
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T>{
  // Resolve BASE_URL at call time so window.location is available
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL ||
    `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000`;
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers:{
      'Content-Type':'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error ?? body?.message ?? 'Something went wrong';
    throw new ApiError(res.status, message);
  }
  return body as T;
}

export const api = {
  signup: (data: { email: string; password: string; name: string }) =>
    request<{ message: string; token: string }>('/signup', {
      method: 'POST', body: JSON.stringify(data),
    }),
  signin: (data: { email: string; password: string }) =>
    request<{ message: string; token: string }>('/signin', {
      method: 'POST', body: JSON.stringify(data),
    }),
  getRoomBySlug: (slug: string) =>
    request<{ room: { id: string; slug: string } }>(`/rooms/${slug}`),
  createRoom: (slug: string) =>
    request<{ room: { id: string; slug: string } }>('/rooms', {
      method: 'POST', body: JSON.stringify({ slug }),
    }),
  getChats: (roomId: string) =>
    request<{ chats: { id: number; message: string; userId: string }[] }>(
      `/chats/${roomId}`
    ),
} as const;