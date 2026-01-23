import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-wizard-bg-deep px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-2xl text-purple-200 mb-8">Page Not Found</p>
        <Link
          to="/"
          className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-violet-500 transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
