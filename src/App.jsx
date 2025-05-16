import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Outlet,
  useLocation,
} from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CustomerPage from './pages/CustomerPage';
import LandingPage from './pages/LandingPage';
import './index.css';
import { useState } from 'react';

// Layout with Navbar
function LayoutWithNavbar() {
  const location = useLocation();
  const isAdminActive = location.pathname === '/admin';
  const isCustomerActive = location.pathname === '/customer';

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
            </div>
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employeeName, setEmployeeName] = useState('');

  return (
    <BrowserRouter basename='/retail_shop'>
      <Routes>
        <Route
          path="/"
          element={
            <LandingPage
              setIsLoggedIn={setIsLoggedIn}
              setEmployeeName={setEmployeeName}
            />
          }
        />
        <Route element={<LayoutWithNavbar />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/customer" element={<CustomerPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;