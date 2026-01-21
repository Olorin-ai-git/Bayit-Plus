import React from 'react';

// Manual Investigation App Component
const ManualInvestigationApp: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manual Investigation</h1>
        <p className="mt-2 text-gray-600">Expert-guided investigation tools and workflows</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Investigation Workspace</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900">Evidence Collection</h3>
                <p className="text-sm text-blue-700 mt-1">Gather and organize investigation evidence</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900">Collaboration Tools</h3>
                <p className="text-sm text-green-700 mt-1">Work with team members on investigations</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900">Step-by-Step Workflow</h3>
                <p className="text-sm text-purple-700 mt-1">Guided investigation process</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Cases</h3>
            <p className="text-gray-600">No active manual investigations</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Investigation Templates</h3>
            <p className="text-gray-600">Predefined investigation workflows</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export as default for Module Federation
const App: React.FC = () => {
  return <ManualInvestigationApp />;
};

export default App;