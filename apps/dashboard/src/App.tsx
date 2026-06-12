import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ProductProvider, useProduct } from './context/ProductContext';
import Billing from './pages/Billing';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Login from './pages/Login';
import Messages from './pages/Messages';
import Numbers from './pages/Numbers';
import Onboarding from './pages/Onboarding';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Rules from './pages/Rules';
import Settings from './pages/Settings';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F7F4]">
      <div className="rounded-full border-4 border-[#DCE4DF] border-t-[#1FAB5E] h-12 w-12 animate-spin" />
    </div>
  );
}

function ProtectedAppShell() {
  const { bootstrapping, currentUser } = useProduct();
  if (bootstrapping) return <LoadingSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-[#F4F7F4]">
      <Sidebar />
      <main className="flex-1 p-7 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function PublicRoutes() {
  const { bootstrapping, currentUser } = useProduct();
  if (bootstrapping) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to="/app" replace /> : <Signup />}
      />
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/app" replace /> : <Login />}
      />
      <Route
        path="/onboarding"
        element={currentUser ? <Onboarding /> : <Navigate to="/login" replace />}
      />
      <Route path="/app" element={<ProtectedAppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="rules" element={<Rules />} />
        <Route path="numbers" element={<Numbers />} />
        <Route path="messages" element={<Messages />} />
        <Route path="settings" element={<Settings />} />
        <Route path="billing" element={<Billing />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ProductProvider>
      <BrowserRouter>
        <PublicRoutes />
      </BrowserRouter>
    </ProductProvider>
  );
}
