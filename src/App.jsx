import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Outlet,
  Navigate,
  useLocation,
} from 'react-router-dom';
import Admin from './pages/Admin';
import CustomerPage from './pages/CustomerPage';
import SavedBills from './pages/SavedBills';
import LandingPage from './pages/LandingPage';
import './index.css';
import { useEffect, useState } from 'react';
import { supabase } from './lib/api';

// Layout with Navbar
function LayoutWithNavbar({ session }) {
  const location = useLocation();
  const isAdminActive = location.pathname === '/admin';
  const isCustomerActive = location.pathname === '/customer';
  const isSavedBillsActive = location.pathname === '/saved-bills';

  if (!session) return <Navigate to="/" replace />;

  const linkBaseClasses =
    'inline-flex items-center px-6 py-2 rounded-md text-lg font-medium transition-colors duration-200';

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            <div className="flex space-x-4">
              <Link
                to="/admin"
                className={`${linkBaseClasses} ${
                  isAdminActive
                    ? 'bg-primary text-white shadow'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Admin
              </Link>
              <Link
                to="/customer"
                className={`${linkBaseClasses} ${
                  isCustomerActive
                    ? 'bg-primary text-white shadow'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Customer
              </Link>
              <Link
                to="/saved-bills"
                className={`${linkBaseClasses} ${
                  isSavedBillsActive
                    ? 'bg-primary text-white shadow'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                Saved Bills
              </Link>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 rounded-md text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto py-4 px-4">
        <Outlet />
      </main>
    </div>
  );
}

// Root App
function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return (
    <BrowserRouter basename="/retail_shop">
      <Routes>
        <Route
          path="/"
          element={session ? <Navigate to="/admin" replace /> : <LandingPage />}
        />
        <Route element={<LayoutWithNavbar session={session} />}>
          <Route path="/admin" element={<Admin />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/saved-bills" element={<SavedBills />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
