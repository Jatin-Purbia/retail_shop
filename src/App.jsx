import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CustomerPage from './pages/CustomerPage';
import LandingPage from './pages/LandingPage';
import './index.css';
import { useEffect, useState } from 'react';

// Layout with Navbar
function LayoutWithNavbar({ children }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link to="/admin" className="inline-flex items-center px-4 py-2 text-gray-700 hover:text-blue-600">
                Admin
              </Link>
              <Link to="/customer" className="inline-flex items-center px-4 py-2 text-gray-700 hover:text-blue-600">
                Customer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto">
        {children}
      </main>
    </div>
  );
}

// App component with location-aware rendering
function AppContent({ setIsLoggedIn, setEmployeeName }) {
  const location = useLocation();

  const isLanding = location.pathname === '/';

  return (
    isLanding ? (
      <LandingPage setIsLoggedIn={setIsLoggedIn} setEmployeeName={setEmployeeName} />
    ) : (
      <LayoutWithNavbar>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/customer" element={<CustomerPage />} />
        </Routes>
      </LayoutWithNavbar>
    )
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [employeeName, setEmployeeName] = useState('');

  return (
    <Router>
      <Routes>
        <Route path="*" element={<AppContent setIsLoggedIn={setIsLoggedIn} setEmployeeName={setEmployeeName} />} />
      </Routes>
    </Router>
  );
}

export default App;
