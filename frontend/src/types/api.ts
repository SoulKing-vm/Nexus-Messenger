export type User = {
  id: string;
  username: string;
  display_name: string;
  profile_picture?: string | null;
  bio?: string | null;
  discoverable: boolean;
  created_at: string;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Chat = {
  id: string;
  member_ids: string[];
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  status: "sent" | "delivered" | "read";
  created_at: string;
};
