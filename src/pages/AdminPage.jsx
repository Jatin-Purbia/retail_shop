import React from 'react';
import inventory from '../inventoryData';

function AdminPage() {
  return (
    <div className="flex flex-col items-center p-2 justify-center min-h-screen bg-primary-light overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl mt-9 p-4 w-full max-w-7xl">
        <h1 className="text-2xl font-bold text-primary mb-2 text-center">Inventory Management</h1>
        <p className="text-base text-accent text-center mb-4">Manage your shop's inventory</p>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-base font-medium text-primary-dark">Name</th>
                <th className="px-3 py-2 text-left text-base font-medium text-primary-dark">Hindi Name</th>
                <th className="px-3 py-2 text-left text-base font-medium text-primary-dark">Unit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-primary-light/10 transition-colors">
                  <td className="px-3 py-2 whitespace-nowrap text-base text-primary-dark">{item.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-primary">{item.hindiName}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-primary">{item.unit}</td>
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