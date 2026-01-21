import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-600 to-blue-700 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-xl">
            ✅
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Manual Investigation Service</h1>
          <p className="text-xl text-gray-600 mb-8">Module Federation is working!</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <p className="text-green-600 font-semibold">
              🎉 Success! The Manual Investigation microservice loaded successfully via Module Federation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestApp;