import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchWorkspaceMessages,
  fetchWorkspaceStats,
  getCurrentSession,
  loginAccount,
  logoutAccount,
  saveWorkspaceRequest,
  signupAccount,
} from '../api/client';
import type {
  MessageStats,
  MarketplaceUser,
  Pagination,
  PrototypeMessageLog,
  WorkspaceSetup,
  WorkspaceSettingsInput,
} from '../types';

interface ProductContextValue {
  bootstrapping: boolean;
  currentUser: MarketplaceUser | null;
  workspace: WorkspaceSetup | null;
  messages: PrototypeMessageLog[];
  stats: MessageStats;
  pagination: Pagination | null;
  signup: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
  saveWorkspace: (
    input: WorkspaceSettingsInput,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  refreshWorkspaceData: () => Promise<void>;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [currentUser, setCurrentUser] = useState<MarketplaceUser | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSetup | null>(null);
  const [messages, setMessages] = useState<PrototypeMessageLog[]>([]);
  const [stats, setStats] = useState<MessageStats>({ total: 0, success: 0, failed: 0 });
  const [pagination, setPagination] = useState<Pagination | null>(null);

  async function loadWorkspaceData(): Promise<void> {
    try {
      const [messagePayload, statsPayload] = await Promise.all([
        fetchWorkspaceMessages(),
        fetchWorkspaceStats(),
      ]);
      setMessages(messagePayload.data);
      setPagination(messagePayload.pagination);
      setStats(statsPayload);
    } catch {
      setMessages([]);
      setPagination(null);
      setStats({ total: 0, success: 0, failed: 0 });
    }
  }

  useEffect(() => {
    getCurrentSession()
      .then((session) => {
        setCurrentUser(session?.user ?? null);
        setWorkspace(session?.workspace ?? null);
        if (session?.workspace) {
          void loadWorkspaceData();
        } else {
          setMessages([]);
          setPagination(null);
          setStats({ total: 0, success: 0, failed: 0 });
        }
      })
      .finally(() => setBootstrapping(false));
  }, []);

  const value = useMemo<ProductContextValue>(
    () => ({
      bootstrapping,
      currentUser,
      workspace,
      messages,
      stats,
      pagination,
      async signup(name, email, password) {
        try {
          const result = await signupAccount(name, email, password);
          setCurrentUser(result.user);
          setWorkspace(result.workspace);
          if (!result.workspace) {
            setMessages([]);
            setPagination(null);
            setStats({ total: 0, success: 0, failed: 0 });
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
      async login(email, password) {
        try {
          const result = await loginAccount(email, password);
          setCurrentUser(result.user);
          setWorkspace(result.workspace);
          if (result.workspace) {
            await loadWorkspaceData();
          } else {
            setMessages([]);
            setPagination(null);
            setStats({ total: 0, success: 0, failed: 0 });
          }
          return { ok: true };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
      async logout() {
        await logoutAccount();
        setCurrentUser(null);
        setWorkspace(null);
        setMessages([]);
        setPagination(null);
        setStats({ total: 0, success: 0, failed: 0 });
      },
      async saveWorkspace(input) {
        try {
          const result = await saveWorkspaceRequest(input);
          setWorkspace(result.workspace);
          await loadWorkspaceData();
          return { ok: true };
        } catch (error) {
          return { ok: false, error: (error as Error).message };
        }
      },
      async refreshWorkspaceData() {
        await loadWorkspaceData();
      },
    }),
    [bootstrapping, currentUser, workspace, messages, stats, pagination],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProduct(): ProductContextValue {
  const value = useContext(ProductContext);
  if (!value) {
    throw new Error('useProduct must be used within ProductProvider');
  }

  return value;
}
