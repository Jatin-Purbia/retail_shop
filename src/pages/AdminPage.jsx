import React from 'react';
import inventory from '../inventoryData';

function AdminPage() {
  return (
    <div className="flex flex-col items-center p-2 justify-center min-h-screen bg-primary-light overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-primary mb-2 text-center">Inventory Management</h1>
        <p className="text-accent text-center mb-6">Manage your shop's inventory</p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Name</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Hindi Name</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-primary-dark uppercase tracking-wider">Unit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-primary-light/10 transition-colors">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-dark">{item.name}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-primary">{item.hindiName}</td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-primary">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPage; 