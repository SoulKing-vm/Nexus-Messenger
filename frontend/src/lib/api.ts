import { Chat, Message, TokenPair, User } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  register: (username: string, password: string, displayName?: string) =>
    request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, password, display_name: displayName })
    }),
  login: (username: string, password: string) =>
    request<TokenPair>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  me: (token: string) => request<User>("/api/users/me", {}, token),
  chats: (token: string) => request<Chat[]>("/api/chats", {}, token),
  messages: (token: string, chatId: string) => request<Message[]>(`/api/messages/${chatId}`, {}, token),
  sendMessage: (token: string, chatId: string, content: string) =>
    request<Message>("/api/messages/send", {
      method: "POST",
      body: JSON.stringify({ chat_id: chatId, content })
    }, token),
  friends: (token: string) => request<User[]>("/api/friends/list", {}, token),
  discovery: (token: string) => request<User[]>("/api/discovery/random", {}, token),
  sendFriendRequest: (token: string, username: string) =>
    request<{ status: string }>("/api/friends/request", {
      method: "POST",
      body: JSON.stringify({ username })
    }, token),
  getRequests: (token: string) =>
    request<{ incoming: { id: string; user: User }[]; outgoing: { id: string; user: User }[] }>("/api/friends/requests", {}, token),
  acceptRequest: (token: string, username: string) =>
    request<{ status: string }>("/api/friends/accept", {
      method: "POST",
      body: JSON.stringify({ username })
    }, token),
  rejectRequest: (token: string, username: string) =>
    request<{ status: string }>("/api/friends/reject", {
      method: "POST",
      body: JSON.stringify({ username })
    }, token),
  createChat: (token: string, username: string) =>
    request<Chat>("/api/chats/create", {
      method: "POST",
      body: JSON.stringify({ username })
    }, token),
  deleteMessage: (token: string, messageId: string) =>
    request<{ status: string }>(`/api/messages/${messageId}`, {
      method: "DELETE"
    }, token),
  clearHistory: (token: string, chatId: string) =>
    request<{ status: string }>(`/api/messages/history/${chatId}`, {
      method: "DELETE"
    }, token)
};
