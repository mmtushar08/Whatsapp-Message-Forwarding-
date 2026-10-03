import { ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchWabaInfo, PhoneOption } from '../api/client';
import { SetupWarnings, WebhookDetails } from '../components/ConnectionNotices';
import { useProduct } from '../context/ProductContext';
import {
  EmbeddedSignupCancelled,
  isEmbeddedSignupConfigured,
  loadFacebookSdk,
  runEmbeddedSignup,
} from '../lib/embeddedSignup';
import { useLiveRefresh } from '../lib/useLiveRefresh';
import { formatPhone, workspaceToSettingsInput } from '../lib/workspace';
import { PLAN_CAPABILITIES } from '../types';

const LABEL_CLASS = 'block text-[12.5px] font-bold uppercase tracking-[0.04em] mb-1.5';
const INPUT_CLASS = 'w-full rounded-[10px] px-3 py-2.5 text-sm outline-none';
const INPUT_STYLE = { border: '1.5px solid #DCE4DF' } as const;
const DEFAULT_LABEL = 'WhatsApp Business Account';

/* ── layout pieces (module level so inputs keep focus across renders) ── */

const STEPS = ['Business', 'WhatsApp', 'First rule', 'Go live'];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {STEPS.map((label, i) => {
        const done = i < step - 1;
        const now = i === step - 1;
        return (
          <div key={label} className="flex-1 text-center">
            <div
              className="h-[5px] rounded-full mb-1.5"
              style={{
                background: done || now ? '#1FAB5E' : '#DCE4DF',
                boxShadow: now ? '0 0 0 3px rgba(31,171,94,.18)' : undefined,
              }}
            />
            <div
              className="font-mono text-[10.5px] uppercase tracking-[0.1em]"
              style={{ color: now ? '#168B4B' : '#5C6B63', fontWeight: now ? 700 : 400 }}
            >
              {i + 1} · {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-white rounded-[14px] p-8"
      style={{ border: '1px solid #DCE4DF', boxShadow: '0 8px 30px rgba(14,59,46,.10)' }}
    >
      {children}
    </div>
  );
}

function Foot({
  back,
  onNext,
  nextLabel = 'Continue →',
  nextDisabled = false,
}: {
  back?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex justify-between items-center mt-6">
      {back ? (
        <button
          type="button"
          onClick={back}
          className="text-[13.5px] underline bg-transparent border-none"
          style={{ color: '#5C6B63' }}
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-40"
        style={{ background: '#1FAB5E' }}
      >
        {nextLabel}
      </button>
    </div>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] px-4 py-3 text-sm" style={{ background: '#FBE3E2', color: '#A03330' }} role="alert">
      {children}
    </div>
  );
}

type DestType = 'whatsapp' | 'email' | 'webhook';

const DEST_OPTS: Array<{
  id: DestType;
  icon: string;
  label: string;
  placeholder: string;
  hint: string;
  plan?: 'Starter' | 'Pro';
}> = [
  {
    id: 'whatsapp',
    icon: '📱',
    label: 'WhatsApp number',
    placeholder: '919000011122',
    hint: 'Country code first, digits only (no +).',
  },
  {
    id: 'email',
    icon: '✉️',
    label: 'Email',
    placeholder: 'sales@yourcompany.com',
    hint: 'Each message arrives as an email.',
    plan: 'Starter',
  },
  {
    id: 'webhook',
    icon: '⚙️',
    label: 'Webhook',
    placeholder: 'https://api.yourcompany.com/whatsapp',
    hint: 'We POST a JSON payload for every message.',
    plan: 'Pro',
  },
];

/* ── page ── */

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentUser, workspace, connectWithMeta, connectWithToken, saveWorkspace, refreshWorkspaceData } =
    useProduct();
  const caps = PLAN_CAPABILITIES[currentUser?.plan ?? 'free'];
  const metaConfigured = isEmbeddedSignupConfigured();

  const [step, setStep] = useState(1);

  /* step 1 */
  const [bizName, setBizName] = useState(
    workspace?.businessLabel && workspace.businessLabel !== DEFAULT_LABEL ? workspace.businessLabel : '',
  );

  /* step 2 */
  const [replacing, setReplacing] = useState(false);
  const [tab, setTab] = useState<'meta' | 'token'>(metaConfigured ? 'meta' : 'token');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [phones, setPhones] = useState<PhoneOption[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<PhoneOption | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  /* step 3 */
  const [destType, setDestType] = useState<DestType>(
    workspace?.emailForwardTo && !workspace.forwardToNumber ? 'email' : 'whatsapp',
  );
  const [destValue, setDestValue] = useState(
    workspace?.forwardToNumber || workspace?.emailForwardTo || workspace?.webhookRelayUrl || '',
  );
  const [keyword, setKeyword] = useState(workspace?.keywordFilters.join(', ') ?? '');
  const [savingRule, setSavingRule] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);

  useEffect(() => {
    if (metaConfigured) loadFacebookSdk().catch(() => undefined);
  }, [metaConfigured]);

  // On the last step, notice as soon as Meta verifies the customer's webhook.
  useLiveRefresh(refreshWorkspaceData, {
    enabled: step === 4 && workspace?.status === 'needs_webhook_setup',
    intervalMs: 5_000,
  });

  const showConnectedCard = Boolean(workspace) && !replacing;
  const label = bizName.trim() || undefined;

  async function handleMetaConnect() {
    setConnectError(null);
    setConnecting(true);
    try {
      await loadFacebookSdk();
      const signup = await runEmbeddedSignup();
      const result = await connectWithMeta({ ...signup, businessLabel: label });
      if (result.ok) setReplacing(false);
      else setConnectError(result.error);
    } catch (e) {
      if (!(e instanceof EmbeddedSignupCancelled)) setConnectError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleFindNumbers() {
    setConnectError(null);
    setLookingUp(true);
    setPhones([]);
    setSelectedPhone(null);
    try {
      const result = await fetchWabaInfo(token.trim());
      setPhones(result.phones);
      setSelectedPhone(result.phones[0] ?? null);
    } catch (e) {
      setConnectError((e as Error).message);
    } finally {
      setLookingUp(false);
    }
  }

  async function handleTokenConnect() {
    if (!selectedPhone) return;
    setConnectError(null);
    setConnecting(true);
    const result = await connectWithToken({
      accessToken: token.trim(),
      phoneNumberId: selectedPhone.phoneNumberId,
      wabaId: selectedPhone.wabaId,
      appSecret: appSecret.trim() || undefined,
      businessLabel: label,
    });
    setConnecting(false);
    if (result.ok) {
      setReplacing(false);
      setToken('');
      setAppSecret('');
    } else {
      setConnectError(result.error);
    }
  }

  async function handleSaveRule() {
    if (!workspace) return;
    setRuleError(null);
    setSavingRule(true);
    const value = destValue.trim();
    const result = await saveWorkspace(
      workspaceToSettingsInput(workspace, {
        businessLabel: label ?? workspace.businessLabel,
        forwardToNumber: destType === 'whatsapp' ? value : workspace.forwardToNumber,
        emailForwardTo: destType === 'email' ? value : workspace.emailForwardTo,
        webhookRelayUrl: destType === 'webhook' ? value : workspace.webhookRelayUrl,
        keywordFilters: keyword,
        forwardingEnabled: true,
      }),
    );
    setSavingRule(false);
    if (!result.ok) {
      setRuleError(result.error);
      return;
    }
    setRuleSaved(true);
    setStep(4);
  }

  async function handleSkipRule() {
    // Still keep the business name the user typed in step 1.
    if (workspace && label && label !== workspace.businessLabel) {
      await saveWorkspace(workspaceToSettingsInput(workspace, { businessLabel: label }));
    }
    setRuleSaved(false);
    setStep(4);
  }

  const selectedDest = DEST_OPTS.find((o) => o.id === destType) ?? DEST_OPTS[0];
  const destLabel =
    destType === 'whatsapp' ? formatPhone(destValue.replace(/\D/g, '')) : destValue.trim();

  return (
    <div className="min-h-screen bg-[#F4F7F4] py-10 px-4">
      <div className="max-w-[660px] mx-auto">
        <div className="flex items-center gap-2 font-extrabold text-[19px] tracking-tight mb-6" style={{ color: '#14201B' }}>
          <div className="w-8 h-8 rounded-[9px] grid place-items-center text-white text-sm font-bold" style={{ background: '#1FAB5E' }}>⇶</div>
          Sendro
        </div>

        <StepBar step={step} />

        {/* ── STEP 1: Business ── */}
        {step === 1 && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Tell us about your business</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>
              This names your workspace. Forwarded emails and webhook payloads carry it too.
            </p>
            <label className={LABEL_CLASS} style={{ color: '#5C6B63' }} htmlFor="biz-name">Business name</label>
            <input
              id="biz-name"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
              value={bizName}
              onChange={(e) => setBizName(e.target.value)}
              placeholder="Acme Realty"
              maxLength={120}
            />
            <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>
              Optional — we'll use your WhatsApp display name if you leave it blank.
            </span>
            <Foot back={() => navigate('/app')} onNext={() => setStep(2)} />
          </Card>
        )}

        {/* ── STEP 2: Connect WhatsApp ── */}
        {step === 2 && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Connect your WhatsApp Business number</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>
              Use Meta's official signup, or import a number with a permanent access token.
            </p>

            {showConnectedCard && workspace ? (
              <div className="space-y-4">
                <div className="rounded-[16px] p-6" style={{ border: '2px solid #BFE7D1', background: '#F0FAF4' }}>
                  <div className="flex justify-between items-start gap-3 flex-wrap">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[11.5px] font-bold mb-2.5" style={{ background: '#E4F6EC', color: '#11713E' }}>
                        ● Connected
                      </span>
                      <p className="font-bold text-base" style={{ color: '#14201B' }}>{label ?? workspace.businessLabel}</p>
                      <p className="font-mono text-sm mt-0.5" style={{ color: '#5C6B63' }}>
                        {formatPhone(workspace.sourcePhoneNumber) || `Phone ID ${workspace.phoneNumberId}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplacing(true)}
                      className="rounded-[9px] px-3 py-1.5 text-sm font-semibold border"
                      style={{ borderColor: '#DCE4DF', color: '#14201B' }}
                    >
                      Connect a different number
                    </button>
                  </div>
                </div>
                <SetupWarnings workspace={workspace} />
              </div>
            ) : (
              <>
                <div className="flex gap-1 rounded-[8px] p-1 mb-6" style={{ background: '#EDF1EE' }} role="tablist">
                  {(['meta', 'token'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => { setTab(t); setConnectError(null); }}
                      className="flex-1 rounded-[6px] py-2 text-sm font-semibold transition"
                      style={tab === t ? { background: '#fff', color: '#14201B', boxShadow: '0 1px 4px rgba(0,0,0,.08)' } : { color: '#5C6B63' }}
                    >
                      {t === 'meta' ? 'Connect with Meta' : 'Use an access token'}
                    </button>
                  ))}
                </div>

                {tab === 'meta' && (
                  <div className="rounded-[16px] p-8 text-center mb-4" style={{ border: '2px dashed #DCE4DF', background: '#FAFCFA' }}>
                    {metaConfigured ? (
                      <>
                        <div className="text-4xl mb-2.5">💬</div>
                        <p className="font-semibold mb-1" style={{ color: '#14201B' }}>
                          {connecting ? 'Finish the steps in the Meta window…' : 'Log in with Facebook to pick your number'}
                        </p>
                        <p className="text-sm mb-5" style={{ color: '#5C6B63' }}>
                          You'll need admin access to your Meta Business Portfolio. Meta lets you pick an
                          existing WhatsApp number or add a new one.
                        </p>
                        <button
                          type="button"
                          disabled={connecting}
                          onClick={() => void handleMetaConnect()}
                          className="rounded-[11px] px-5 py-3 text-sm font-semibold text-white flex items-center gap-2 mx-auto disabled:opacity-60"
                          style={{ background: '#1877F2' }}
                        >
                          <b style={{ fontSize: 17 }}>f</b> {connecting ? 'Connecting…' : 'Continue with Facebook'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl mb-2.5">🔌</div>
                        <p className="font-semibold mb-1" style={{ color: '#14201B' }}>Meta signup isn't configured on this deployment</p>
                        <p className="text-sm mb-4" style={{ color: '#5C6B63' }}>
                          The operator needs to set <code>VITE_META_APP_ID</code> and <code>VITE_META_CONFIG_ID</code>.
                          You can still connect with a permanent access token.
                        </p>
                        <button
                          type="button"
                          onClick={() => setTab('token')}
                          className="rounded-[9px] px-4 py-2 text-sm font-semibold border"
                          style={{ borderColor: '#DCE4DF', color: '#14201B' }}
                        >
                          Use an access token
                        </button>
                      </>
                    )}
                  </div>
                )}

                {tab === 'token' && (
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className={LABEL_CLASS} style={{ color: '#5C6B63' }} htmlFor="access-token">Permanent access token</label>
                      <textarea
                        id="access-token"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        rows={3}
                        placeholder="EAAB…"
                        className="w-full rounded-[6px] px-3 py-2 font-mono text-xs outline-none"
                        style={INPUT_STYLE}
                      />
                      <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>
                        A System User token from Meta Business Settings with <code>whatsapp_business_management</code> and{' '}
                        <code>whatsapp_business_messaging</code>. Stored encrypted.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleFindNumbers()}
                      disabled={!token.trim() || lookingUp}
                      className="rounded-[9px] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: '#14201B' }}
                    >
                      {lookingUp ? 'Looking up…' : 'Find my numbers'}
                    </button>

                    {phones.length > 0 && (
                      <div className="space-y-2">
                        {phones.map((p) => (
                          <label
                            key={p.phoneNumberId}
                            className="flex items-start gap-3 rounded-[8px] p-4 cursor-pointer"
                            style={{
                              border: `1.5px solid ${selectedPhone?.phoneNumberId === p.phoneNumberId ? '#1FAB5E' : '#DCE4DF'}`,
                              background: selectedPhone?.phoneNumberId === p.phoneNumberId ? '#F0FAF4' : '#fff',
                            }}
                          >
                            <input
                              type="radio"
                              name="phone"
                              checked={selectedPhone?.phoneNumberId === p.phoneNumberId}
                              onChange={() => setSelectedPhone(p)}
                              className="mt-0.5"
                            />
                            <div>
                              <div className="text-sm font-semibold">{p.displayPhoneNumber}</div>
                              <div className="text-xs" style={{ color: '#5C6B63' }}>
                                {p.verifiedName}{p.wabaName ? ` · ${p.wabaName}` : ''}
                              </div>
                            </div>
                          </label>
                        ))}
                        <div>
                          <label className={LABEL_CLASS} style={{ color: '#5C6B63' }} htmlFor="app-secret">
                            App secret <span className="font-normal normal-case">(if the token is from your own Meta app)</span>
                          </label>
                          <input
                            id="app-secret"
                            type="password"
                            className={INPUT_CLASS}
                            style={INPUT_STYLE}
                            value={appSecret}
                            onChange={(e) => setAppSecret(e.target.value)}
                            placeholder="Used to verify webhooks your app sends us"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleTokenConnect()}
                          disabled={!selectedPhone || connecting}
                          className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                          style={{ background: '#1FAB5E' }}
                        >
                          {connecting ? 'Connecting…' : 'Connect this number'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {workspace && (
                  <button
                    type="button"
                    onClick={() => { setReplacing(false); setConnectError(null); }}
                    className="text-[13px] underline bg-transparent border-none mb-2"
                    style={{ color: '#5C6B63' }}
                  >
                    Keep {formatPhone(workspace.sourcePhoneNumber) || 'the current number'}
                  </button>
                )}
              </>
            )}

            {connectError && <div className="mt-2"><ErrorBox>{connectError}</ErrorBox></div>}

            <Foot back={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!showConnectedCard} />
          </Card>
        )}

        {/* ── STEP 3: First rule ── */}
        {step === 3 && workspace && (
          <Card>
            <h2 className="text-[23px] font-bold tracking-tight mb-1" style={{ color: '#14201B' }}>Create your first forwarding rule</h2>
            <p className="text-sm mb-6" style={{ color: '#5C6B63' }}>
              Where should messages to {formatPhone(workspace.sourcePhoneNumber) || 'your number'} go?
            </p>

            <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))' }}>
              {DEST_OPTS.map((opt) => {
                const locked =
                  (opt.id === 'email' && !caps.emailForward) || (opt.id === 'webhook' && !caps.webhookRelay);
                const active = destType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={locked}
                    aria-pressed={active}
                    onClick={() => {
                      setDestType(opt.id);
                      setDestValue(
                        opt.id === 'whatsapp'
                          ? workspace.forwardToNumber
                          : opt.id === 'email'
                            ? workspace.emailForwardTo
                            : workspace.webhookRelayUrl,
                      );
                    }}
                    className="rounded-[12px] p-4 text-center text-sm font-semibold border transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      borderColor: active ? '#1FAB5E' : '#DCE4DF',
                      background: active ? '#F0FAF4' : '#fff',
                      boxShadow: active ? '0 0 0 3px rgba(31,171,94,.14)' : undefined,
                      color: '#14201B',
                    }}
                  >
                    <span className="block text-[21px] mb-1.5">{opt.icon}</span>
                    {opt.label}
                    {locked && (
                      <span className="block mt-1 text-[11px] font-bold" style={{ color: '#8A5A0F' }}>
                        🔒 {opt.plan} plan
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {(!caps.emailForward || !caps.webhookRelay) && (
              <p className="text-xs -mt-2 mb-4" style={{ color: '#5C6B63' }}>
                Email and webhook destinations are on paid plans. <Link to="/pricing" className="underline" style={{ color: '#168B4B' }}>See pricing</Link>
              </p>
            )}

            <div className="space-y-4">
              <div>
                <label className={LABEL_CLASS} style={{ color: '#5C6B63' }} htmlFor="dest-value">
                  Forward to ({selectedDest.label})
                </label>
                <input
                  id="dest-value"
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                  value={destValue}
                  onChange={(e) => setDestValue(e.target.value)}
                  placeholder={selectedDest.placeholder}
                  type={destType === 'email' ? 'email' : destType === 'webhook' ? 'url' : 'tel'}
                />
                <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>{selectedDest.hint}</span>
              </div>
              <div>
                <label className={LABEL_CLASS} style={{ color: '#5C6B63' }} htmlFor="keyword">
                  Only forward messages containing <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  id="keyword"
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g. price, booking, site visit"
                />
                <span className="mt-1.5 block text-xs" style={{ color: '#5C6B63' }}>Comma-separated. Leave blank to forward everything.</span>
              </div>
            </div>

            <div className="mt-4 rounded-[12px] p-4" style={{ background: '#FAFCFA', border: '1px solid #DCE4DF' }}>
              <div className="flex items-center gap-2.5">
                <div className="rounded-[14px_14px_14px_4px] px-3 py-2 text-sm" style={{ background: '#E4F6EC', border: '1px solid #BFE7D1' }}>
                  {keyword.trim() ? `Contains "${keyword.trim()}"` : 'Any message'}
                </div>
                <div className="flex-1 h-0.5" style={{ backgroundImage: 'linear-gradient(90deg,#1FAB5E 55%,transparent 0)', backgroundSize: '9px 2px' }} />
                <div className="rounded-[10px] px-3 py-1.5 text-xs font-semibold border truncate max-w-[55%]" style={{ borderColor: '#DCE4DF' }}>
                  {selectedDest.icon} {destLabel || selectedDest.placeholder}
                </div>
              </div>
            </div>

            {ruleError && <div className="mt-4"><ErrorBox>{ruleError}</ErrorBox></div>}

            <div className="flex justify-between items-center mt-6">
              <button type="button" onClick={() => void handleSkipRule()} className="text-[13.5px] underline bg-transparent border-none" style={{ color: '#5C6B63' }}>
                I'll do this later
              </button>
              <button
                type="button"
                onClick={() => void handleSaveRule()}
                disabled={savingRule || !destValue.trim()}
                className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
                style={{ background: '#1FAB5E' }}
              >
                {savingRule ? 'Saving…' : 'Save rule →'}
              </button>
            </div>
          </Card>
        )}

        {/* ── STEP 4: Go live ── */}
        {step === 4 && workspace && (
          <Card>
            <div className="text-center py-2">
              <div
                className="w-[72px] h-[72px] rounded-full grid place-items-center text-4xl mx-auto mb-5"
                style={ruleSaved ? { background: '#E4F6EC', color: '#168B4B' } : { background: '#FBF0DC', color: '#8A5A0F' }}
              >
                {ruleSaved ? '✓' : '…'}
              </div>
              {ruleSaved ? (
                <>
                  <h2 className="text-[23px] font-bold tracking-tight mb-2" style={{ color: '#14201B' }}>
                    {workspace.status === 'connected' ? `You're live, ${workspace.businessLabel}! 🎉` : 'Rule saved — one step left'}
                  </h2>
                  <p className="text-sm mb-6 mx-auto max-w-[46ch]" style={{ color: '#5C6B63' }}>
                    Messages to <b>{formatPhone(workspace.sourcePhoneNumber)}</b>
                    {keyword.trim() ? <> containing <b>{keyword.trim()}</b></> : null} will be forwarded to <b>{destLabel}</b>.
                    Test it: send a WhatsApp message to {formatPhone(workspace.sourcePhoneNumber)} from another phone —
                    it shows up under Message logs within seconds.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-[23px] font-bold tracking-tight mb-2" style={{ color: '#14201B' }}>Your number is connected</h2>
                  <p className="text-sm mb-6 mx-auto max-w-[44ch]" style={{ color: '#5C6B63' }}>
                    Nothing is forwarded until you add a destination. Incoming messages still appear in your Inbox.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3 mb-6 text-left">
              <WebhookDetails workspace={workspace} />
              <SetupWarnings workspace={workspace} />
              {ruleSaved && destType === 'whatsapp' && !workspace.forwardTemplateName && (
                <div className="rounded-[10px] px-4 py-3 text-xs" style={{ background: '#FAFCFA', border: '1px solid #DCE4DF', color: '#5C6B63' }}>
                  WhatsApp only allows free-form forwards to numbers that messaged your business in the last 24 hours.
                  Set an approved template in <Link to="/app/settings" className="underline" style={{ color: '#168B4B' }}>Settings</Link> so
                  forwards outside that window still arrive.
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button type="button" onClick={() => navigate('/app')} className="rounded-[11px] px-6 py-3 text-sm font-semibold text-white" style={{ background: '#1FAB5E' }}>
                Go to dashboard →
              </button>
              <button
                type="button"
                onClick={() => navigate(ruleSaved ? '/app/rules' : '/app/settings')}
                className="rounded-[11px] px-6 py-3 text-sm font-semibold border"
                style={{ borderColor: '#DCE4DF', color: '#14201B' }}
              >
                {ruleSaved ? 'View rules' : 'Add a destination'}
              </button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
