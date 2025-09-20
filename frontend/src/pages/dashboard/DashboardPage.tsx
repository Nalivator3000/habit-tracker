import React from 'react';
import { DashboardOverview } from '../../components/dashboard';

const DashboardPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <DashboardOverview />
      </div>
    </div>
  );
};

export default DashboardPage;