import React, { useEffect, useState } from 'react';
import { Card } from '../ui';
import habitService from '../../services/habitService';

interface WeeklyData {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

const WeeklyChart: React.FC = () => {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      setIsLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6); // Last 7 days

      const response = await habitService.getWeeklySummary(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Transform data for chart
      const transformedData: WeeklyData[] = response.daily_summaries.map((summary: any) => ({
        date: summary.date,
        completed: summary.completed_count || 0,
        total: summary.total_habits || 0,
        percentage: summary.total_habits > 0 ? Math.round((summary.completed_count / summary.total_habits) * 100) : 0
      }));

      setWeeklyData(transformedData);
    } catch (error) {
      console.error('Failed to fetch weekly data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDayName = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getBarHeight = (percentage: number) => {
    return Math.max(percentage, 5); // Minimum 5% height for visibility
  };

  const averageCompletion = weeklyData.length > 0
    ? Math.round(weeklyData.reduce((sum, day) => sum + day.percentage, 0) / weeklyData.length)
    : 0;

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Progress</h3>
        <div className="animate-pulse">
          <div className="flex items-end justify-between space-x-2 h-32">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="flex-1 bg-gray-200 rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }} />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="w-8 h-4 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Progress</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{averageCompletion}%</div>
          <div className="text-sm text-gray-500">Avg completion</div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-32 flex flex-col justify-between text-xs text-gray-500 -ml-8">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* Chart bars */}
        <div className="flex items-end justify-between space-x-2 h-32 ml-4 mr-2">
          {weeklyData.map((day, index) => (
            <div key={day.date} className="flex-1 flex flex-col items-center">
              <div
                className="w-full relative group cursor-pointer"
                style={{ height: `${getBarHeight(day.percentage)}%` }}
              >
                <div
                  className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${getBarColor(day.percentage)}`}
                  style={{ height: '100%' }}
                />

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{getDayName(day.date)}</div>
                    <div>{day.completed}/{day.total} habits</div>
                    <div>{day.percentage}% complete</div>
                  </div>
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-3 ml-4 mr-2">
          {weeklyData.map((day) => (
            <div key={day.date} className="flex-1 text-center">
              <div className="text-xs font-medium text-gray-600">
                {getDayName(day.date)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(day.date).getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Grid lines */}
        <div className="absolute inset-0 ml-4 mr-2">
          {[25, 50, 75].map((line) => (
            <div
              key={line}
              className="absolute w-full border-t border-gray-100"
              style={{ bottom: `${line}%` }}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-xs text-gray-600">Excellent (80%+)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded" />
          <span className="text-xs text-gray-600">Good (60-79%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span className="text-xs text-gray-600">Fair (40-59%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span className="text-xs text-gray-600">Poor (0-39%)</span>
        </div>
      </div>
    </Card>
  );
};

export default WeeklyChart;