/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, LogOut, MessageCircle, Search, Send, Settings, UserRoundCheck, UsersRound, Smile, Paperclip, Check, X, Moon, Sun, Monitor, MessageSquare, ArrowLeft, MoreVertical, Trash2, Forward as ForwardIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

const doodlePattern = "data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83-54.627 54.627-.83-.83L54.627 0zM29.627 0l.83.83-29.627 29.627-.83-.83L29.627 0zM54.627 25l.83.83-29.627 29.627-.83-.83L54.627 25z' fill='%23000000' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E";

export function MessengerShell() {
  const router = useRouter();
  const token = useAuthStore((state) => state.accessToken);
  const clear = useAuthStore((state) => state.clear);
  const [tab, setTab] = useState<Tab>("chats");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mobileView, setMobileView] = useState<"sidebar" | "chat">("sidebar");

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
    <main className="mx-auto grid min-h-screen max-w-7xl grid-rows-[auto_1fr] px-0 md:px-6 py-0 md:py-6 bg-paper dark:bg-teleDarkBg text-ink dark:text-gray-100 transition-colors">
      <header className="hidden md:flex mb-3 items-center justify-between rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-teleDarkPaper/80 px-4 py-3 shadow-soft backdrop-blur-md">
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

      <section className="grid min-h-[100dvh] md:min-h-[calc(100vh-104px)] overflow-hidden rounded-none md:rounded-lg border-0 md:border border-black/10 dark:border-white/10 bg-white dark:bg-teleDarkPaper shadow-none md:shadow-tele3d md:grid-cols-[320px_1fr]">
        <aside className={`grid grid-rows-[auto_1fr] border-b border-black/10 dark:border-white/10 md:border-b-0 md:border-r ${mobileView === 'chat' ? 'hidden md:grid' : 'grid'}`}>
          <nav className="grid grid-cols-4 border-b border-black/10 dark:border-white/10 bg-white dark:bg-teleDarkBg z-20">
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
              onSelectChat={(id) => { setSelectedChatId(id); setMobileView("chat"); }}
              token={token}
              me={me.data}
              onTabChange={setTab}
            />
          </div>
        </aside>

        <div className={`h-full relative ${mobileView === 'sidebar' ? 'hidden md:block' : 'block'}`}>
          <ConversationPanel
            chat={selectedChat}
            chats={chats.data ?? []}
            messages={messages.data ?? []}
            me={me.data}
            friends={friends.data ?? []}
            draft={draft}
            setDraft={setDraft}
            send={send}
            token={token}
            refetchMessages={() => messages.refetch()}
            refetchChats={() => chats.refetch()}
            onBack={() => setMobileView("sidebar")}
          />
        </div>
      </section>
    </main>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      className={`flex min-h-[60px] items-center justify-center gap-2 px-3 text-[10px] sm:text-xs font-bold transition-all duration-200 active:scale-95 flex-col sm:flex-row ${
        active ? "bg-teleBlue text-white shadow-inner" : "text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5 bg-white/50 dark:bg-teleDarkPaper/50"
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span>{label}</span>
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
      <div className="p-4 space-y-6 animate-in fade-in duration-300">
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
      <div className="space-y-3 p-4 animate-in fade-in duration-300">
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
    return (
      <div className="animate-in fade-in duration-300">
        <SettingsPanel />
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 animate-in fade-in duration-300">
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
  chats: Chat[];
  messages: Message[];
  me?: User;
  friends?: User[];
  draft: string;
  setDraft: (value: string) => void;
  send: (event: FormEvent<HTMLFormElement>) => void;
  token: string | null;
  refetchMessages: () => void;
  refetchChats: () => void;
  onBack: () => void;
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [showForwardModal, setShowForwardModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.messages.length]);

  const friend = props.chat && props.me && props.friends ? props.friends.find(f => props.chat!.member_ids.includes(f.id) && f.id !== props.me!.id) : undefined;
  const title = friend ? friend.display_name : (props.chat ? "Conversation" : "No conversation selected");
  const subtitle = friend ? `@${friend.username}` : (props.chat ? `${props.chat.member_ids.length} members` : "Select a chat to begin messaging");

  const onEmojiClick = (emojiData: { emoji: string }) => {
    props.setDraft(props.draft + emojiData.emoji);
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

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedMessages);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMessages(newSet);
  };

  const handleDeleteSelected = async () => {
    if (!props.token) return;
    if (!confirm("Are you sure you want to delete these messages for everyone?")) return;
    
    for (const msgId of Array.from(selectedMessages)) {
      await api.deleteMessage(props.token, msgId);
    }
    setSelectMode(false);
    setSelectedMessages(new Set());
    props.refetchMessages();
  };

  const handleForwardSelected = async (targetChatId: string) => {
    if (!props.token) return;
    
    const messagesToForward = props.messages.filter(m => selectedMessages.has(m.id)).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    for (const msg of messagesToForward) {
      await api.sendMessage(props.token, targetChatId, msg.content);
    }
    
    setSelectMode(false);
    setSelectedMessages(new Set());
    setShowForwardModal(false);
    alert("Messages forwarded!");
  };

  const handleClearHistory = async () => {
    if (!props.token || !props.chat) return;
    if (!confirm("Are you sure you want to completely clear the history of this chat for everyone?")) return;
    
    await api.clearHistory(props.token, props.chat.id);
    setShowMenu(false);
    props.refetchMessages();
  };

  return (
    <section className="grid h-full grid-rows-[auto_1fr_auto] bg-paper dark:bg-teleDarkBg relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: `url("${doodlePattern}")`, backgroundSize: '120px' }}></div>
      
      {selectMode ? (
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 bg-teleBlue px-4 py-3 z-20 shadow-md text-white">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectMode(false); setSelectedMessages(new Set()); }} className="active:scale-95 transition-transform">
              <X size={24} />
            </button>
            <span className="font-bold text-lg">{selectedMessages.size} Selected</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowForwardModal(true)} disabled={selectedMessages.size === 0} className="disabled:opacity-50 active:scale-95 transition-transform" title="Forward">
              <ForwardIcon size={22} />
            </button>
            <button onClick={handleDeleteSelected} disabled={selectedMessages.size === 0} className="disabled:opacity-50 active:scale-95 transition-transform" title="Delete">
              <Trash2 size={22} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-teleDarkPaper/80 backdrop-blur-md px-4 py-3 z-20">
          <div className="flex items-center gap-3">
            <button onClick={props.onBack} className="md:hidden grid place-items-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform">
              <ArrowLeft size={22} />
            </button>
            {props.chat && <Avatar label={friend ? friend.display_name.slice(0,2).toUpperCase() : "C"} />}
            <div>
              <h2 className="font-bold">{title}</h2>
              <p className="text-xs text-black/55 dark:text-white/55 font-medium">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <span className="hidden sm:inline-block rounded-full bg-teleBlue/10 dark:bg-teleBlue/20 px-3 py-1 text-xs font-bold text-teleBlue">encrypted</span>
            <button onClick={() => setShowMenu(!showMenu)} disabled={!props.chat} className="grid place-items-center size-10 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-transform disabled:opacity-50">
              <MoreVertical size={22} />
            </button>
            {showMenu && (
              <div className="absolute top-12 right-0 w-48 bg-white dark:bg-teleDarkPaper rounded-xl shadow-tele3d border border-black/10 dark:border-white/10 overflow-hidden py-1 z-50">
                <button onClick={() => { setSelectMode(true); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-3">
                  <Check size={16} /> Select Messages
                </button>
                <button onClick={handleClearHistory} className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-coral/10 text-coral transition-colors flex items-center gap-3">
                  <Trash2 size={16} /> Clear History
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4 overflow-y-auto p-4 flex flex-col relative z-10">
        {props.messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-sm text-black/55 dark:text-white/55 animate-in fade-in zoom-in-95 duration-300">
            {props.chat ? (
              <div className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl max-w-xs backdrop-blur-sm">
                <p className="font-semibold text-black dark:text-white mb-1">Say hello!</p>
                <p>Messages, photos, and files are fully encrypted.</p>
              </div>
            ) : (
              <div className="bg-white/50 dark:bg-teleDarkPaper/50 p-6 rounded-3xl shadow-sm backdrop-blur-sm border border-black/5 dark:border-white/5">
                <MessageCircle size={40} className="mx-auto mb-3 text-teleBlue opacity-50" />
                <p className="font-semibold text-lg text-black dark:text-white">Nexus Messenger</p>
                <p className="mt-1">Select a chat from the sidebar</p>
              </div>
            )}
          </div>
        ) : (
          props.messages.map((message) => {
            const mine = message.sender_id === props.me?.id;
            const isSelected = selectedMessages.has(message.id);
            return (
              <div className={`flex items-end gap-2 group animate-in slide-in-from-bottom-2 fade-in duration-300 ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
                {selectMode && !mine && (
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(message.id)} className="size-5 mb-3 accent-teleBlue rounded cursor-pointer" />
                )}
                <div 
                  onClick={() => selectMode && toggleSelect(message.id)}
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all cursor-auto ${selectMode ? 'cursor-pointer hover:opacity-80' : ''} ${
                    mine 
                      ? "bg-teleBlue text-white rounded-br-none" 
                      : "bg-white dark:bg-teleBubble text-ink dark:text-white rounded-bl-none border border-black/5 dark:border-transparent"
                  } ${isSelected ? "ring-2 ring-teleBlue ring-offset-2 dark:ring-offset-teleDarkBg" : ""}`}
                >
                  {renderMessageContent(message.content)}
                  <p className={`text-right mt-1 text-[10px] font-bold ${mine ? "text-white/70" : "text-black/40 dark:text-white/40"}`}>
                    {new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                {selectMode && mine && (
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(message.id)} className="size-5 mb-3 accent-teleBlue rounded cursor-pointer" />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
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
            disabled={!props.chat || selectMode}
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
            disabled={!props.chat || selectMode}
            title="Attach File (Max 5MB)"
          >
            <Paperclip size={22} />
          </button>

          <textarea
            className="min-h-[44px] max-h-32 flex-1 resize-none rounded-xl bg-black/5 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 ring-teleBlue/50 text-sm font-medium transition-shadow placeholder:text-black/40 dark:placeholder:text-white/40 disabled:opacity-50"
            value={props.draft}
            onChange={(event) => props.setDraft(event.target.value)}
            placeholder={selectMode ? "Exit select mode to type..." : "Write a message..."}
            disabled={!props.chat || selectMode}
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
            disabled={!props.chat || selectMode || (!props.draft.trim() && !fileInputRef.current?.files?.length)} 
            title="Send"
          >
            <Send size={20} className="ml-1" />
          </button>
        </form>
      </div>

      {showForwardModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-teleDarkPaper rounded-2xl shadow-tele3d w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-teleDarkBg text-white">
              <h3 className="font-bold text-lg">Forward to...</h3>
              <button onClick={() => setShowForwardModal(false)} className="active:scale-95"><X size={20}/></button>
            </div>
            <div className="overflow-y-auto p-2 space-y-1">
              {props.chats.map(chat => {
                const friend = props.me ? props.friends?.find(f => chat.member_ids.includes(f.id) && f.id !== props.me!.id) : null;
                const title = friend ? friend.display_name : "Conversation";
                const label = friend ? friend.display_name.slice(0,2).toUpperCase() : "C";
                return (
                  <button 
                    key={chat.id} 
                    onClick={() => handleForwardSelected(chat.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <Avatar label={label} />
                    <span className="font-bold text-sm text-ink dark:text-white">{title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
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
