import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ProductProvider, useProduct } from './context/ProductContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Messages from './pages/Messages';
import Onboarding from './pages/Onboarding';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import Pricing from './pages/Pricing';
import Signup from './pages/Signup';
import Welcome from './pages/Welcome';

function ProtectedAppShell() {
  const { bootstrapping, currentUser, workspace } = useProduct();

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="rounded-full border-4 border-stone-200 border-t-emerald-700 h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!workspace) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/app" element={<Dashboard />} />
          <Route path="/app/messages" element={<Messages />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function PublicRoutes() {
  const { bootstrapping, currentUser, workspace } = useProduct();

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <div className="rounded-full border-4 border-stone-200 border-t-emerald-700 h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to={workspace ? '/app' : '/onboarding'} replace /> : <Signup />}
      />
      <Route
        path="/login"
        element={currentUser ? <Navigate to={workspace ? '/app' : '/onboarding'} replace /> : <Login />}
      />
      <Route
        path="/onboarding"
        element={currentUser ? <Onboarding /> : <Navigate to="/login" replace />}
      />
      <Route path="/app" element={<ProtectedAppShell />} />
      <Route path="/app/*" element={<ProtectedAppShell />} />
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
