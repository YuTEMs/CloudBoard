'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Spinner } from '@heroui/spinner';
import { ArrowLeft, BarChart3, Eye, Calendar, TrendingUp, Image, Video, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const { boardId } = useParams();
  const router = useRouter();

  const [analytics, setAnalytics] = useState([]);
  const [boardName, setBoardName] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    if (session?.user?.id && boardId) {
      fetchBoardInfo();
      fetchAnalytics();

      // Auto-refresh analytics every 5 minutes
      const refreshInterval = setInterval(() => {
        fetchAnalytics();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [session, boardId]);

  const fetchBoardInfo = async () => {
    try {
      const response = await fetch(`/api/boards?boardId=${boardId}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both single board object and array of boards
        if (Array.isArray(data)) {
          const board = data.find(b => b.id === boardId);
          if (board) {
            setBoardName(board.name);
          }
        } else if (data && data.id === boardId) {
          // Single board object
          setBoardName(data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching board info:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/advertisements/analytics?boardId=${boardId}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);

        const total = data.reduce((sum, item) => sum + (item.view_count || 0), 0);
        setTotalViews(total);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-gradient-to-br from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-8">
            <Button
              isIconOnly
              variant="light"
              onPress={() => router.push(`/dashboard/${boardId}/advertisements`)}
              className="bg-white/80 backdrop-blur-sm hover:bg-white hover:shadow-md transition-all duration-300 rounded-2xl"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Advertisement Analytics
              </h1>
              <p className="text-gray-600 text-lg mt-2">Performance insights for "{boardName}"</p>
            </div>
            <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-3 rounded-2xl border border-blue-200/50 shadow-sm">
              <span className="text-blue-800 font-bold text-lg">{totalViews.toLocaleString()} Total Views</span>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center">
                <Eye className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Views</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {totalViews.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Active Advertisements</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  {analytics.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Avg. Views per Ad</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {analytics.length > 0 ? Math.round(totalViews / analytics.length) : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advertisement Analytics Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-3xl shadow-lg overflow-hidden">
          <div className="p-8 pb-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-b border-gray-100/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Advertisement Performance
              </h2>
            </div>
            <p className="text-gray-600 mt-2 ml-11">Detailed analytics for each advertisement</p>
          </div>

          <div className="p-8">
            {analytics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200/50">
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50 rounded-l-xl">Advertisement</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50">Type</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50">Views</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50">Audience Estimate</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50">Last Viewed</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-700 bg-gray-50/50 rounded-r-xl">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/30">
                    {analytics.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-gray-900">
                            {item.advertisements?.title || 'Unknown'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {item.advertisements?.media_type === 'image' ? (
                              <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                <Image className="w-4 h-4" />
                                <span className="text-sm font-medium">Image</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                                <Video className="w-4 h-4" />
                                <span className="text-sm font-medium">Video</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {(item.view_count || 0).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            {item.audience_estimate ? (
                              <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-semibold">{item.audience_estimate.toLocaleString()}</span>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-lg italic">
                                Pending AI Analysis
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-lg">
                            {item.last_viewed_at
                              ? new Date(item.last_viewed_at).toLocaleDateString()
                              : 'Never'
                            }
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-600 bg-white/60 px-3 py-1 rounded-lg">
                            {item.advertisements?.created_at
                              ? new Date(item.advertisements.created_at).toLocaleDateString()
                              : 'Unknown'
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-4">
                  No Analytics Data Yet
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                  Analytics will appear once your advertisements start being viewed on the display board
                </p>
                <Button
                  size="lg"
                  onPress={() => router.push(`/dashboard/${boardId}/advertisements`)}
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 font-semibold transition-all duration-300 hover:shadow-xl hover:scale-105 px-8 rounded-2xl"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>Manage Advertisements</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Future Enhancement Placeholders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-3xl shadow-lg overflow-hidden">
            <div className="p-8 pb-6 bg-gradient-to-r from-gray-50/50 to-blue-50/50 border-b border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-blue-400 rounded-xl flex items-center justify-center opacity-50">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">View Trends</h3>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center py-8">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Coming soon: View trends over time</p>
                <p className="text-gray-500 text-sm mt-2">Track advertisement performance across different time periods</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-3xl shadow-lg overflow-hidden">
            <div className="p-8 pb-6 bg-gradient-to-r from-gray-50/50 to-purple-50/50 border-b border-gray-100/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-purple-400 rounded-xl flex items-center justify-center opacity-50">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-400">Performance Insights</h3>
              </div>
            </div>
            <div className="p-8">
              <div className="text-center py-8">
                <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Coming soon: Detailed performance insights</p>
                <p className="text-gray-500 text-sm mt-2">Advanced analytics with engagement metrics and recommendations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}