import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';

type ConversationListItem = {
  id: string;
  title?: string | null;
  type: string;
  carId?: string | null;
  auctionId?: string | null;
  transportServiceId?: string | null;
  lastMessageAt: string;
  conversation_participants: Array<{
    userId: string;
    lastReadAt?: string | null;
    role: string;
    users: {
      id: string;
      name: string;
      phone: string;
      profileImage?: string | null;
    };
  }>;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderId: string;
    type: string;
    status: string;
    users: {
      id: string;
      name: string;
      phone: string;
      profileImage?: string | null;
    };
  }>;
};

type MessageItem = {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  status: string;
  type: string;
  users: {
    id: string;
    name: string;
    phone: string;
    profileImage?: string | null;
  };
};

const SITE_TEAM_USER_ID = 'site_team';

export default function SiteTeamInboxPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([]);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) || null,
    [conversations, activeConversationId],
  );

  const otherParticipant = useMemo(() => {
    if (!activeConversation) return null;
    const other = activeConversation.conversation_participants.find(
      (p) => p.userId !== SITE_TEAM_USER_ID,
    );
    return other?.users || null;
  }, [activeConversation]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/site-team/inbox');
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.message || 'فشل جلب المحادثات');
        setConversations([]);
        return;
      }
      setConversations(data.conversations || []);
      if (!activeConversationId && data.conversations?.length) {
        setActiveConversationId(data.conversations[0].id);
      }
    } catch (e) {
      setError('فشل الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/site-team/inbox?conversationId=${encodeURIComponent(conversationId)}`,
      );
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.message || 'فشل جلب الرسائل');
        setMessages([]);
        return;
      }
      setMessages(data.messages || []);
    } catch {
      setError('فشل الاتصال بالخادم');
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    void fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    void fetchMessages(activeConversationId);
  }, [activeConversationId]);

  const handleSend = async () => {
    if (!activeConversationId) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    try {
      const res = await fetch('/api/admin/site-team/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConversationId, content }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        alert(data?.message || 'فشل إرسال الرسالة');
        return;
      }
      setDraft('');
      await fetchMessages(activeConversationId);
      await fetchConversations();
    } catch {
      alert('فشل الاتصال بالخادم');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="صندوق وارد فريق الموقع">
      <div className="flex h-[calc(100vh-140px)] gap-4">
        <div className="w-80 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <div className="flex items-center justify-between border-b border-slate-700 p-4">
            <p className="text-sm font-semibold text-white">المحادثات</p>
            <button
              type="button"
              onClick={() => void fetchConversations()}
              className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
            >
              تحديث
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-sm text-slate-400">جاري التحميل...</div>
          ) : error ? (
            <div className="p-4 text-sm text-red-400">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-sm text-slate-400">لا توجد محادثات حالياً</div>
          ) : (
            <div className="max-h-full overflow-y-auto">
              {conversations.map((c) => {
                const last = c.messages?.[0];
                const other = c.conversation_participants.find(
                  (p) => p.userId !== SITE_TEAM_USER_ID,
                )?.users;
                const active = c.id === activeConversationId;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConversationId(c.id)}
                    className={`w-full border-b border-slate-700 px-4 py-3 text-right transition-colors ${
                      active ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-white">
                        {other?.name || c.title || 'محادثة'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(c.lastMessageAt).toLocaleDateString('ar-LY')}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                      {last ? last.content : 'لا توجد رسائل'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500" dir="ltr">
                      {other?.phone || ''}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <div className="border-b border-slate-700 p-4">
            <p className="text-sm font-semibold text-white">
              {otherParticipant?.name || 'اختر محادثة'}
            </p>
            {otherParticipant?.phone && (
              <p className="mt-1 text-xs text-slate-400" dir="ltr">
                {otherParticipant.phone}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messagesLoading ? (
              <div className="text-sm text-slate-400">جاري تحميل الرسائل...</div>
            ) : !activeConversationId ? (
              <div className="text-sm text-slate-400">اختر محادثة من القائمة</div>
            ) : messages.length === 0 ? (
              <div className="text-sm text-slate-400">لا توجد رسائل</div>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => {
                  const mine = m.senderId === SITE_TEAM_USER_ID;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 text-sm ${
                          mine ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p
                          className={`mt-1 text-[11px] ${mine ? 'text-blue-100' : 'text-slate-400'}`}
                        >
                          {new Date(m.createdAt).toLocaleString('ar-LY')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-700 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeConversationId ? 'اكتب رد...' : 'اختر محادثة أولاً'}
                disabled={!activeConversationId || sending}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!activeConversationId || sending || !draft.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {sending ? 'جارٍ الإرسال...' : 'إرسال'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
