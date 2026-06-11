"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogOut, MessageCircle, Search, Send, Settings, UserRoundCheck, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Chat, Message, User } from "@/types/api";

type Tab = "chats" | "friends" | "discover" | "settings";

export function MessengerShell() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const [tab, setTab] = useState<Tab>("chats");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!token) router.push("/login");
  }, [router, token]);

  const me = useQuery({
    queryKey: ["me", token],
    queryFn: () => api.me(token!),
    enabled: Boolean(token)
  });
  const chats = useQuery({
    queryKey: ["chats", token],
    queryFn: () => api.chats(token!),
    enabled: Boolean(token)
  });
  const friends = useQuery({
    queryKey: ["friends", token],
    queryFn: () => api.friends(token!),
    enabled: Boolean(token)
  });
  const discovery = useQuery({
    queryKey: ["discovery", token],
    queryFn: () => api.discovery(token!),
    enabled: Boolean(token) && tab === "discover"
  });
  const messages = useQuery({
    queryKey: ["messages", token, selectedChatId],
    queryFn: () => api.messages(token!, selectedChatId!),
    enabled: Boolean(token && selectedChatId)
  });

  const selectedChat = useMemo(
    () => chats.data?.find((chat) => chat.id === selectedChatId) ?? chats.data?.[0],
    [chats.data, selectedChatId]
  );

  useEffect(() => {
    if (!selectedChatId && selectedChat) setSelectedChatId(selectedChat.id);
  }, [selectedChat, selectedChatId]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedChat || !draft.trim()) return;
    await api.sendMessage(token, selectedChat.id, draft.trim());
    setDraft("");
    messages.refetch();
  }

  function logout() {
    clear();
    router.push("/login");
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr] px-3 py-3 md:px-6 md:py-6">
      <header className="mb-3 flex items-center justify-between rounded-lg border border-black/10 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-ink text-white">
            <MessageCircle size={21} />
          </span>
          <div>
            <h1 className="text-lg font-semibold">Nexus Messenger</h1>
            <p className="text-xs text-black/55">{me.data ? `Signed in as ${me.data.username}` : "Connecting"}</p>
          </div>
        </div>
        <button className="grid size-10 place-items-center rounded-md border border-black/10 hover:bg-black/5" onClick={logout} title="Log out">
          <LogOut size={19} />
        </button>
      </header>

      <section className="grid min-h-[calc(100vh-104px)] overflow-hidden rounded-lg border border-black/10 bg-white shadow-soft md:grid-cols-[310px_1fr]">
        <aside className="grid border-b border-black/10 md:border-b-0 md:border-r">
          <nav className="grid grid-cols-4 border-b border-black/10 md:grid-cols-1">
            <NavButton active={tab === "chats"} icon={<MessageCircle size={19} />} label="Chats" onClick={() => setTab("chats")} />
            <NavButton active={tab === "friends"} icon={<UsersRound size={19} />} label="Friends" onClick={() => setTab("friends")} />
            <NavButton active={tab === "discover"} icon={<Compass size={19} />} label="Discover" onClick={() => setTab("discover")} />
            <NavButton active={tab === "settings"} icon={<Settings size={19} />} label="Settings" onClick={() => setTab("settings")} />
          </nav>
          <SidebarContent
            tab={tab}
            chats={chats.data ?? []}
            friends={friends.data ?? []}
            discovery={discovery.data ?? []}
            selectedChatId={selectedChat?.id}
            onSelectChat={setSelectedChatId}
            token={token}
          />
        </aside>

        <ConversationPanel
          chat={selectedChat}
          messages={messages.data ?? []}
          me={me.data}
          draft={draft}
          setDraft={setDraft}
          send={send}
        />
      </section>
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex min-h-14 items-center justify-center gap-2 px-3 text-sm font-semibold transition md:justify-start ${
        active ? "bg-lagoon text-white" : "text-black/65 hover:bg-black/5"
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function SidebarContent(props: {
  tab: Tab;
  chats: Chat[];
  friends: User[];
  discovery: User[];
  selectedChatId?: string;
  onSelectChat: (id: string) => void;
  token: string | null;
}) {
  if (props.tab === "friends") {
    return <UserList title="Friends" users={props.friends} empty="No friends yet" />;
  }

  if (props.tab === "discover") {
    return <DiscoverList users={props.discovery} token={props.token} />;
  }

  if (props.tab === "settings") {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-base font-semibold">Settings</h2>
        <label className="flex items-center justify-between rounded-md border border-black/10 p-3 text-sm">
          Discoverable
          <input type="checkbox" defaultChecked className="size-5 accent-lagoon" />
        </label>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex h-10 items-center gap-2 rounded-md border border-black/10 px-3 text-sm text-black/55">
        <Search size={17} />
        <span>Chats</span>
      </div>
      {props.chats.length === 0 ? (
        <p className="p-3 text-sm text-black/55">Create a chat with a friend from the API or discovery flow.</p>
      ) : (
        props.chats.map((chat, index) => (
          <button
            className={`flex w-full items-center gap-3 rounded-md p-3 text-left transition ${
              props.selectedChatId === chat.id ? "bg-ink text-white" : "hover:bg-black/5"
            }`}
            key={chat.id}
            onClick={() => props.onSelectChat(chat.id)}
          >
            <Avatar label={`C${index + 1}`} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Conversation {index + 1}</p>
              <p className="truncate text-xs opacity-70">{chat.member_ids.length} members</p>
            </div>
          </button>
        ))
      )}
    </div>
  );
}

function UserList({ title, users, empty }: { title: string; users: User[]; empty: string }) {
  return (
    <div className="space-y-3 p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {users.length === 0 ? <p className="text-sm text-black/55">{empty}</p> : users.map((user) => <UserRow key={user.id} user={user} />)}
    </div>
  );
}

function DiscoverList({ users, token }: { users: User[]; token: string | null }) {
  async function request(username: string) {
    if (!token) return;
    await api.sendFriendRequest(token, username);
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-base font-semibold">Discovery</h2>
      {users.length === 0 ? <p className="text-sm text-black/55">No discoverable users returned yet.</p> : null}
      {users.map((user) => (
        <div className="flex items-center justify-between gap-3 rounded-md border border-black/10 p-3" key={user.id}>
          <UserRow user={user} />
          <button className="grid size-9 place-items-center rounded-md bg-moss text-white" onClick={() => request(user.username)} title="Send friend request">
            <UserRoundCheck size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar label={user.display_name.slice(0, 2).toUpperCase()} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.display_name}</p>
        <p className="truncate text-xs text-black/55">@{user.username}</p>
      </div>
    </div>
  );
}

function ConversationPanel(props: {
  chat?: Chat;
  messages: Message[];
  me?: User;
  draft: string;
  setDraft: (value: string) => void;
  send: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid min-h-[560px] grid-rows-[auto_1fr_auto] bg-paper">
      <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3">
        <div>
          <h2 className="font-semibold">{props.chat ? "Conversation" : "No conversation selected"}</h2>
          <p className="text-xs text-black/55">{props.chat ? `${props.chat.member_ids.length} members` : "Add friends to begin messaging"}</p>
        </div>
        <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-semibold text-moss">encrypted storage</span>
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        {props.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-black/55">
            <p>Messages, typing, delivery, and read events are ready for this room.</p>
          </div>
        ) : (
          props.messages.map((message) => {
            const mine = message.sender_id === props.me?.id;
            return (
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                <div className={`max-w-[78%] rounded-lg px-4 py-2 text-sm ${mine ? "bg-lagoon text-white" : "bg-white shadow-sm"}`}>
                  <p>{message.content}</p>
                  <p className="mt-1 text-[11px] opacity-65">{message.status}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form className="flex gap-2 border-t border-black/10 bg-white p-3" onSubmit={props.send}>
        <input
          className="min-w-0 flex-1 rounded-md border border-black/10 px-3 outline-none ring-lagoon/30 focus:ring-4"
          value={props.draft}
          onChange={(event) => props.setDraft(event.target.value)}
          placeholder="Message"
          disabled={!props.chat}
        />
        <button className="grid size-11 place-items-center rounded-md bg-ink text-white disabled:opacity-50" disabled={!props.chat || !props.draft.trim()} title="Send">
          <Send size={19} />
        </button>
      </form>
    </section>
  );
}

function Avatar({ label }: { label: string }) {
  return <span className="grid size-10 shrink-0 place-items-center rounded-md bg-coral/15 text-sm font-bold text-coral">{label}</span>;
}
