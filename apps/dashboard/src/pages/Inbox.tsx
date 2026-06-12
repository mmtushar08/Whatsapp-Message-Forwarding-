import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ConversationMessage,
  ConversationSummary,
  MessageTemplate,
  SessionInfo,
  fetchConversations,
  fetchTemplates,
  fetchThread,
  sendConversationReply,
  sendConversationTemplate,
} from '../api/client';
import { useProduct } from '../context/ProductContext';

function initials(name: string, fallback: string): string {
  if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return fallback.slice(-2);
}

function timeLeftLabel(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return sameDay ? hm : `${d.toLocaleDateString([], { weekday: 'short' })} ${hm}`;
}

export default function Inbox() {
  const { workspace } = useProduct();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [session, setSession] = useState<SessionInfo>({ open: false, expiresAt: null });
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const msgsRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  const loadConversations = useCallback(async () => {
    try {
      const { conversations: list } = await fetchConversations();
      setConversations(list);
      setSelected((prev) => prev ?? list[0]?.contactNumber ?? null);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (contact: string) => {
    try {
      const data = await fetchThread(contact);
      // The user may have switched conversations while this request was in
      // flight — never let a stale response clobber the current thread.
      if (selectedRef.current !== contact) return;
      setMessages(data.messages);
      setSession(data.session);
      setShowTemplates(false);
      setError(null);
    } catch (e) {
      if (selectedRef.current === contact) setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (!workspace) { setLoading(false); return; }
    void loadConversations();
    fetchTemplates().then((t) => setTemplates(t.templates)).catch(() => setTemplates([]));
  }, [workspace, loadConversations]);

  useEffect(() => {
    if (selected) void loadThread(selected);
  }, [selected, loadThread]);

  useEffect(() => {
    const box = msgsRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  async function handleSend() {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendConversationReply(selected, reply.trim());
      setReply('');
      await loadThread(selected);
      await loadConversations();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleTemplate(name: string) {
    if (!selected || sending) return;
    setSending(true);
    setError(null);
    try {
      await sendConversationTemplate(selected, name);
      await loadThread(selected);
      await loadConversations();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  if (!workspace) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Inbox</h1>
        <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>Connect WhatsApp first to see your conversations.</p>
        <Link to="/onboarding" className="inline-block rounded-[11px] px-6 py-3 text-sm font-semibold text-white no-underline" style={{ background: '#1FAB5E' }}>
          Connect WhatsApp →
        </Link>
      </div>
    );
  }

  const openSessions = conversations.filter((c) => c.sessionOpen).length;
  const current = conversations.find((c) => c.contactNumber === selected);

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-[23px] font-bold tracking-tight" style={{ color: '#14201B' }}>Inbox</h1>
          <p className="text-sm" style={{ color: '#5C6B63' }}>
            Read and reply from here — replies go out through your connected number via the Cloud API.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-bold self-center" style={{ background: '#E4F6EC', color: '#11713E' }}>
          ● {openSessions} session{openSessions === 1 ? '' : 's'} open
        </span>
      </div>

      {error && (
        <div className="rounded-[10px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', border: '1px solid #F0CBC9', color: '#A03330' }}>
          {error}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="bg-white rounded-[14px] p-10 text-center" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}>
          <p className="text-sm" style={{ color: '#5C6B63' }}>
            {loading ? 'Loading conversations…' : 'No conversations yet. Incoming WhatsApp messages will appear here. (Tip: use "Seed demo data" on the Dashboard in dev.)'}
          </p>
        </div>
      ) : (
        <div className="flex rounded-[14px] overflow-hidden bg-white" style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)', height: 'calc(100vh - 230px)', minHeight: 500 }}>
          {/* Conversations list */}
          <div className="w-[288px] shrink-0 overflow-y-auto" style={{ borderRight: '1px solid #DCE4DF', background: '#FAFCFA' }}>
            {conversations.map((c) => {
              const active = c.contactNumber === selected;
              return (
                <button
                  key={c.contactNumber}
                  type="button"
                  onClick={() => setSelected(c.contactNumber)}
                  className="flex gap-3 w-full text-left p-3.5 items-start border-none"
                  style={{ background: active ? '#E4F6EC' : 'transparent', borderBottom: '1px solid #EDF1EE', cursor: 'pointer' }}
                >
                  <div className="w-9 h-9 rounded-full grid place-items-center text-white font-extrabold text-xs shrink-0" style={{ background: '#0E3B2E' }}>
                    {initials(c.contactName, c.contactNumber)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 font-bold text-[13.5px]" style={{ color: '#14201B' }}>
                      <span className="truncate">{c.contactName || `+${c.contactNumber}`}</span>
                      <span className="font-mono text-[10.5px] font-normal shrink-0" style={{ color: '#5C6B63' }}>{fmtTime(c.lastMessageAt)}</span>
                    </div>
                    <div className="text-[12.5px] truncate mt-0.5" style={{ color: '#5C6B63' }}>
                      {c.lastDirection === 'out' ? 'You: ' : ''}{c.lastMessage}
                    </div>
                    {!c.sessionOpen && (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10.5px] font-bold mt-1" style={{ background: '#FBF0DC', color: '#8A5A0F' }}>
                        Session closed
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Thread */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex justify-between items-center gap-2.5 px-4 py-3 flex-wrap" style={{ borderBottom: '1px solid #DCE4DF' }}>
              <div>
                <b style={{ color: '#14201B' }}>{current?.contactName || (current ? `+${current.contactNumber}` : '—')}</b>{' '}
                {current?.contactName && (
                  <span className="font-mono text-[12.5px]" style={{ color: '#5C6B63' }}>+{current.contactNumber}</span>
                )}
                <div className="text-[12.5px]" style={{ color: '#5C6B63' }}>
                  via {workspace.businessLabel} · {workspace.sourcePhoneNumber ? `+${workspace.sourcePhoneNumber}` : workspace.phoneNumberId}
                </div>
              </div>
            </div>

            <div ref={msgsRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ background: '#EEF3EF' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="max-w-[72%] px-3 py-2 text-[13.5px]"
                  style={{
                    alignSelf: m.direction === 'in' ? 'flex-start' : 'flex-end',
                    background: m.direction === 'in' ? '#fff' : '#DCF5E7',
                    borderRadius: m.direction === 'in' ? '13px 13px 13px 4px' : '13px 13px 4px 13px',
                    boxShadow: '0 1px 2px rgba(0,0,0,.06)',
                    color: '#14201B',
                  }}
                >
                  {m.message}
                  <div className="text-[10px] mt-1 text-right font-mono" style={{ color: '#5C6B63' }}>
                    {fmtTime(m.created_at)}{' '}
                    {m.direction === 'out' && (
                      <span style={{ color: m.status === 'simulated' ? '#8A5A0F' : '#4FB6EC', fontWeight: 800 }}>
                        {m.status === 'simulated' ? '⌛ demo' : '✓✓'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="px-3.5 py-3 bg-white" style={{ borderTop: '1px solid #DCE4DF' }}>
              {session.open ? (
                <>
                  <div className="flex gap-2.5">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(); }}
                      placeholder="Type a reply…"
                      className="flex-1 rounded-[11px] px-3.5 py-2.5 text-sm outline-none"
                      style={{ border: '1.5px solid #DCE4DF' }}
                    />
                    <button
                      type="button"
                      disabled={sending || !reply.trim()}
                      onClick={() => void handleSend()}
                      className="rounded-[11px] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: '#1FAB5E' }}
                    >
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                  <div className="text-[11.5px] mt-2 flex items-center gap-1.5 font-mono" style={{ color: '#5C6B63' }}>
                    <span className="w-[7px] h-[7px] rounded-full inline-block" style={{ background: '#1FAB5E' }} />
                    Session open · free-form replies allowed for <b>{timeLeftLabel(session.expiresAt)}</b>
                  </div>
                </>
              ) : (
                <div className="rounded-[11px] px-3.5 py-3 text-[13px] flex justify-between gap-2.5 items-center flex-wrap"
                  style={{ background: '#FBF0DC', border: '1px solid #F0DCB4', color: '#6B4A10' }}>
                  <span>⏱ 24-hour session window closed. Meta requires an approved template to re-open the conversation.</span>
                  <button
                    type="button"
                    onClick={() => setShowTemplates((s) => !s)}
                    className="rounded-[9px] px-3.5 py-2 text-[13px] font-semibold text-white"
                    style={{ background: '#1FAB5E' }}
                  >
                    Choose template
                  </button>
                </div>
              )}

              {showTemplates && (
                <div className="flex flex-col gap-2 mt-2.5">
                  {templates.map((t) => {
                    const approved = t.status === 'approved';
                    return (
                      <button
                        key={t.name}
                        type="button"
                        disabled={!approved || sending}
                        onClick={() => void handleTemplate(t.name)}
                        className="rounded-[11px] px-3.5 py-2.5 text-left text-[13px] w-full disabled:opacity-60"
                        style={{ border: '1.5px solid #DCE4DF', background: '#fff', color: '#14201B' }}
                      >
                        <div className="font-mono text-[10.5px] uppercase tracking-[0.08em] flex justify-between mb-0.5" style={{ color: '#168B4B' }}>
                          <span>{t.name}</span>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 font-bold normal-case tracking-normal"
                            style={approved ? { background: '#E4F6EC', color: '#11713E' } : { background: '#FBF0DC', color: '#8A5A0F' }}>
                            {approved ? 'Approved' : 'In review'}
                          </span>
                        </div>
                        {t.body}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
