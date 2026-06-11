"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogOut, MessageCircle, Search, Send, Settings, UserRoundCheck, UsersRound, Smile, Paperclip, Check, X, Moon, Sun, Monitor, MessageSquare } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Chat, Message, User } from "@/types/api";
import { useTheme } from "next-themes";
import EmojiPicker, { Theme } from "emoji-picker-react";

type Tab = "chats" | "friends" | "discover" | "settings";

const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

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
    enabled: Boolean(token),
    refetchInterval: 2500
  });
  const friends = useQuery({
    queryKey: ["friends", token],
    queryFn: () => api.friends(token!),
    enabled: Boolean(token)
  });
  const discovery = useQuery({
    queryKey: ["discovery", token],
    queryFn: () => api.discovery(token!),
    enabled: Boolean(token) && tab === "discover",
    refetchInterval: 10000
  });
  const messages = useQuery({
    queryKey: ["messages", token, selectedChatId],
    queryFn: () => api.messages(token!, selectedChatId!),
    enabled: Boolean(token && selectedChatId),
    refetchInterval: 2500
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
    <main className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr] px-3 py-3 md:px-6 md:py-6 bg-paper dark:bg-teleDarkBg text-ink dark:text-gray-100 transition-colors">
      <header className="mb-3 flex items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-teleDarkPaper/80 px-4 py-3 shadow-soft backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-teleBlue text-white shadow-tele3d">
            <MessageCircle size={21} />
          </span>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Nexus Messenger</h1>
            <p className="text-xs text-black/60 dark:text-white/60 font-medium">{me.data ? `Signed in as ${me.data.username}` : "Connecting"}</p>
          </div>
        </div>
        <button className="grid size-10 place-items-center rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform" onClick={logout} title="Log out">
          <LogOut size={19} />
        </button>
      </header>

      <section className="grid min-h-[calc(100vh-104px)] overflow-hidden rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-teleDarkPaper shadow-tele3d md:grid-cols-[320px_1fr]">
        <aside className="grid grid-rows-[auto_1fr] border-b border-black/10 dark:border-white/10 md:border-b-0 md:border-r">
          <nav className="grid grid-cols-4 border-b border-black/10 dark:border-white/10">
            <NavButton active={tab === "chats"} icon={<MessageCircle size={19} />} label="Chats" onClick={() => setTab("chats")} />
            <NavButton active={tab === "friends"} icon={<UsersRound size={19} />} label="Friends" onClick={() => setTab("friends")} />
            <NavButton active={tab === "discover"} icon={<Compass size={19} />} label="Discover" onClick={() => setTab("discover")} />
            <NavButton active={tab === "settings"} icon={<Settings size={19} />} label="Settings" onClick={() => setTab("settings")} />
          </nav>
          <div className="overflow-y-auto">
            <SidebarContent
              tab={tab}
              chats={chats.data ?? []}
              friends={friends.data ?? []}
              discovery={discovery.data ?? []}
              selectedChatId={selectedChat?.id}
              onSelectChat={setSelectedChatId}
              token={token}
              me={me.data}
              onTabChange={setTab}
            />
          </div>
        </aside>

        <ConversationPanel
          chat={selectedChat}
          messages={messages.data ?? []}
          me={me.data}
          friends={friends.data ?? []}
          draft={draft}
          setDraft={setDraft}
          send={send}
          token={token}
          refetchMessages={() => messages.refetch()}
        />
      </section>
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex min-h-14 items-center justify-center gap-2 px-3 text-xs font-bold transition-all duration-200 active:scale-95 ${
        active ? "bg-teleBlue text-white shadow-inner" : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
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
  me?: User;
  onTabChange: (tab: Tab) => void;
}) {
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ["requests", props.token],
    queryFn: () => api.getRequests(props.token!),
    enabled: Boolean(props.token) && props.tab === "friends",
    refetchInterval: 5000
  });

  if (props.tab === "friends") {
    return (
      <div className="p-4 space-y-6">
        {(requests.data?.incoming?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-teleBlue">Friend Requests</h2>
            {requests.data!.incoming.map((req) => (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-teleDarkBg shadow-sm" key={req.id}>
                <UserRow user={req.user} />
                <div className="flex gap-1">
                  <button 
                    className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-white shadow-tele3d active:scale-95 transition-transform" 
                    onClick={async () => {
                      await api.acceptRequest(props.token!, req.user.username);
                      queryClient.invalidateQueries({ queryKey: ["friends"] });
                      queryClient.invalidateQueries({ queryKey: ["requests"] });
                    }}
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    className="grid size-8 place-items-center rounded-lg bg-coral text-white shadow-tele3d active:scale-95 transition-transform" 
                    onClick={async () => {
                      await api.rejectRequest(props.token!, req.user.username);
                      queryClient.invalidateQueries({ queryKey: ["requests"] });
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-teleBlue">My Friends</h2>
          {props.friends.length === 0 ? <p className="text-sm text-black/55 dark:text-white/55">No friends yet</p> : props.friends.map((user) => (
            <div className="flex items-center justify-between gap-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 p-2 transition-colors cursor-pointer group" key={user.id}>
              <UserRow user={user} />
              <button 
                className="opacity-0 group-hover:opacity-100 grid size-8 place-items-center rounded-lg bg-teleBlue text-white shadow-tele3d active:scale-95 transition-all" 
                onClick={async () => {
                  const chat = await api.createChat(props.token!, user.username);
                  queryClient.invalidateQueries({ queryKey: ["chats"] });
                  props.onSelectChat(chat.id);
                  props.onTabChange("chats");
                }}
                title="Send Message"
              >
                <MessageSquare size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (props.tab === "discover") {
    return (
      <div className="space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-teleBlue">Discovery</h2>
        {props.discovery.length === 0 ? <p className="text-sm text-black/55 dark:text-white/55">No discoverable users returned yet.</p> : null}
        {props.discovery.map((user) => (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-teleDarkBg shadow-sm hover:shadow-tele3d transition-shadow" key={user.id}>
            <UserRow user={user} />
            <button 
              className="grid size-9 place-items-center rounded-lg bg-teleBlue text-white shadow-tele3d active:scale-95 transition-transform" 
              onClick={async () => {
                await api.sendFriendRequest(props.token!, user.username);
                alert(`Friend request sent to ${user.username}!`);
              }} 
              title="Send friend request"
            >
              <UserRoundCheck size={18} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (props.tab === "settings") {
    return <SettingsPanel />;
  }

  return (
    <div className="space-y-2 p-3">
      <div className="flex h-10 items-center gap-2 rounded-xl bg-black/5 dark:bg-white/5 px-3 text-sm text-black/55 dark:text-white/55 focus-within:ring-2 focus-within:ring-teleBlue transition-shadow">
        <Search size={17} />
        <input className="bg-transparent border-none outline-none w-full placeholder:text-black/40 dark:placeholder:text-white/40 font-medium" placeholder="Search chats..." />
      </div>
      {props.chats.length === 0 ? (
        <div className="p-6 text-center text-sm text-black/55 dark:text-white/55">
          <div className="inline-grid size-16 place-items-center rounded-full bg-teleBlue/10 text-teleBlue mb-3">
            <MessageCircle size={28} />
          </div>
          <p className="font-medium">No active chats.</p>
          <p className="mt-1 opacity-80">Add friends from the Discovery tab to begin messaging!</p>
        </div>
      ) : (
        props.chats.map((chat, index) => {
          const friend = props.me ? props.friends.find((f) => chat.member_ids.includes(f.id) && f.id !== props.me!.id) : undefined;
          const title = friend ? friend.display_name : `Conversation ${index + 1}`;
          const subtitle = friend ? `@${friend.username}` : `${chat.member_ids.length} members`;
          const avatarLabel = friend ? friend.display_name.slice(0, 2).toUpperCase() : `C${index + 1}`;

          return (
            <button
              className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all duration-200 active:scale-[0.98] ${
                props.selectedChatId === chat.id 
                  ? "bg-teleBlue text-white shadow-tele3d" 
                  : "hover:bg-black/5 dark:hover:bg-white/5"
              }`}
              key={chat.id}
              onClick={() => props.onSelectChat(chat.id)}
            >
              <Avatar label={avatarLabel} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{title}</p>
                <p className={`truncate text-xs font-medium ${props.selectedChatId === chat.id ? "text-white/80" : "text-black/50 dark:text-white/50"}`}>{subtitle}</p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}

function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="space-y-6 p-5">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-teleBlue mb-3">Appearance</h2>
        <div className="grid grid-cols-3 gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
          <button 
            className={`flex flex-col items-center gap-2 p-3 rounded-lg text-xs font-semibold transition-all ${theme === 'light' ? 'bg-white dark:bg-teleDarkPaper shadow-tele3d text-teleBlue' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
            onClick={() => setTheme('light')}
          >
            <Sun size={20} /> Light
          </button>
          <button 
            className={`flex flex-col items-center gap-2 p-3 rounded-lg text-xs font-semibold transition-all ${theme === 'dark' ? 'bg-white dark:bg-teleDarkPaper shadow-tele3d text-teleBlue' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
            onClick={() => setTheme('dark')}
          >
            <Moon size={20} /> Dark
          </button>
          <button 
            className={`flex flex-col items-center gap-2 p-3 rounded-lg text-xs font-semibold transition-all ${theme === 'system' ? 'bg-white dark:bg-teleDarkPaper shadow-tele3d text-teleBlue' : 'text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5'}`}
            onClick={() => setTheme('system')}
          >
            <Monitor size={20} /> Auto
          </button>
        </div>
      </div>
      
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-teleBlue mb-3">Privacy</h2>
        <label className="flex items-center justify-between rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-teleDarkBg p-4 text-sm font-semibold shadow-sm cursor-pointer">
          Discoverable Profile
          <input type="checkbox" defaultChecked className="size-5 accent-teleBlue cursor-pointer" />
        </label>
      </div>
    </div>
  );
}

function UserRow({ user }: { user: User }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar label={user.display_name.slice(0, 2).toUpperCase()} />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{user.display_name}</p>
        <p className="truncate text-xs text-black/50 dark:text-white/50 font-medium">@{user.username}</p>
      </div>
    </div>
  );
}

function renderMessageContent(content: string) {
  if (content.startsWith("[FILE:")) {
    const splitIndex = content.indexOf("]");
    if (splitIndex !== -1) {
      const metadata = content.substring(6, splitIndex);
      const dataUrl = content.substring(splitIndex + 1);
      
      if (dataUrl.startsWith("data:image")) {
        return <img src={dataUrl} alt="attachment" className="max-w-full rounded-md mt-1 mb-1 max-h-64 object-contain shadow-sm" />;
      } else if (dataUrl.startsWith("data:video")) {
        return <video src={dataUrl} controls className="max-w-full rounded-md mt-1 mb-1 max-h-64 shadow-sm" />;
      } else {
        return (
          <a href={dataUrl} download={`attachment.${metadata}`} className="flex items-center gap-2 bg-black/10 dark:bg-white/10 p-3 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors font-semibold mt-1">
            <Paperclip size={16} /> Download {metadata.toUpperCase()} File
          </a>
        );
      }
    }
  }
  return <p className="leading-relaxed whitespace-pre-wrap break-words">{content}</p>;
}

function ConversationPanel(props: {
  chat?: Chat;
  messages: Message[];
  me?: User;
  friends?: User[];
  draft: string;
  setDraft: (value: string) => void;
  send: (event: FormEvent<HTMLFormElement>) => void;
  token: string | null;
  refetchMessages: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useTheme();

  const friend = props.chat && props.me && props.friends ? props.friends.find(f => props.chat!.member_ids.includes(f.id) && f.id !== props.me!.id) : undefined;
  const title = friend ? friend.display_name : (props.chat ? "Conversation" : "No conversation selected");
  const subtitle = friend ? `@${friend.username}` : (props.chat ? `${props.chat.member_ids.length} members` : "Select a chat to begin messaging");

  const onEmojiClick = (emojiData: any) => {
    props.setDraft(prev => prev + emojiData.emoji);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File must be less than 5MB");
      return;
    }
    try {
      const base64 = await toBase64(file);
      const ext = file.name.split('.').pop() || "unknown";
      const content = `[FILE:${ext}]${base64}`;
      
      if (!props.token || !props.chat) return;
      await api.sendMessage(props.token, props.chat.id, content);
      props.refetchMessages();
    } catch (err) {
      alert("Failed to process file.");
    }
  };

  return (
    <section className="grid min-h-[560px] grid-rows-[auto_1fr_auto] bg-paper dark:bg-teleDarkBg relative">
      <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-teleDarkPaper/80 backdrop-blur-md px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          {props.chat && <Avatar label={friend ? friend.display_name.slice(0,2).toUpperCase() : "C"} />}
          <div>
            <h2 className="font-bold">{title}</h2>
            <p className="text-xs text-black/55 dark:text-white/55 font-medium">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-teleBlue/10 dark:bg-teleBlue/20 px-3 py-1 text-xs font-bold text-teleBlue">encrypted</span>
      </div>

      <div className="space-y-4 overflow-y-auto p-4 flex flex-col relative z-0">
        {props.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-black/55 dark:text-white/55">
            {props.chat ? (
              <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl max-w-xs">
                <p className="font-semibold text-black dark:text-white mb-1">Say hello!</p>
                <p>Messages, photos, and files are fully encrypted.</p>
              </div>
            ) : (
              <p>Select a chat from the sidebar</p>
            )}
          </div>
        ) : (
          props.messages.map((message) => {
            const mine = message.sender_id === props.me?.id;
            return (
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                  mine 
                    ? "bg-teleBlue text-white rounded-br-none" 
                    : "bg-white dark:bg-teleBubble text-ink dark:text-white rounded-bl-none border border-black/5 dark:border-transparent"
                }`}>
                  {renderMessageContent(message.content)}
                  <p className={`text-right mt-1 text-[10px] font-bold ${mine ? "text-white/70" : "text-black/40 dark:text-white/40"}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="relative border-t border-black/10 dark:border-white/10 bg-white dark:bg-teleDarkPaper p-3 z-20">
        {showEmoji && (
          <div className="absolute bottom-full mb-2 left-2 shadow-tele3d rounded-xl overflow-hidden z-50">
            <EmojiPicker 
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} 
              onEmojiClick={onEmojiClick}
              lazyLoadEmojis={true}
            />
          </div>
        )}
        <form className="flex items-end gap-2" onSubmit={(e) => {
          setShowEmoji(false);
          props.send(e);
        }}>
          <button 
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 transition-colors"
            onClick={() => setShowEmoji(!showEmoji)}
            disabled={!props.chat}
          >
            <Smile size={22} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange}
            accept="image/*,video/*,.pdf,.doc,.docx,.zip"
          />
          <button 
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/60 dark:text-white/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            disabled={!props.chat}
            title="Attach File (Max 5MB)"
          >
            <Paperclip size={22} />
          </button>

          <textarea
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl bg-black/5 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 ring-teleBlue/50 text-sm font-medium transition-shadow placeholder:text-black/40 dark:placeholder:text-white/40"
            value={props.draft}
            onChange={(event) => props.setDraft(event.target.value)}
            placeholder="Write a message..."
            disabled={!props.chat}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setShowEmoji(false);
                props.send(e as any);
              }
            }}
          />
          <button 
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-teleBlue text-white shadow-tele3d disabled:opacity-50 disabled:shadow-none hover:bg-[#229ED9] active:scale-95 transition-all" 
            disabled={!props.chat || (!props.draft.trim() && !fileInputRef.current?.files?.length)} 
            title="Send"
          >
            <Send size={20} className="ml-1" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Avatar({ label }: { label: string }) {
  const gradients = [
    "from-blue-400 to-teleBlue",
    "from-emerald-400 to-teal-500",
    "from-orange-400 to-coral",
    "from-purple-400 to-indigo-500",
    "from-pink-400 to-rose-500"
  ];
  const gradient = gradients[label.charCodeAt(0) % gradients.length];
  
  return (
    <span className={`grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm ring-2 ring-white/20 dark:ring-black/20`}>
      {label}
    </span>
  );
}
