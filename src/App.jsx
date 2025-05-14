import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CustomerPage from './pages/CustomerPage';
import './index.css'

function App() {
  return (
    <Router>
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

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/customer" element={<CustomerPage />} />
            <Route path="/" element={<CustomerPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
