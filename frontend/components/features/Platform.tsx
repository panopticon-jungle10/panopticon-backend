"use client";
import { useState } from 'react';
import { Activity, Bell, FileText, BarChart3, LogOut } from 'lucide-react';
import { Button } from '../ui/button';
import Dashboard from './Dashboard';
import SLOSettings from './SLOSettings';
import NotificationSettings from './NotificationSettings';
import LogViewer from './LogViewer';
import { toast } from 'sonner';

interface PlatformProps {
  onLogout: () => void;
}

export default function Platform({ onLogout }: PlatformProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Activity },
    { id: 'slo', label: 'SLO 설정', icon: BarChart3 },
    { id: 'notifications', label: '알림 설정', icon: Bell },
    { id: 'logs', label: '로그 뷰어', icon: FileText },
  ];

  const handleLogout = () => {
    toast.success('로그아웃되었습니다.');
    setTimeout(onLogout, 500);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-blue-600">SRE Platform</h1>
          <p className="text-gray-500 text-sm mt-1">Site Reliability Engineering</p>
        </div>
        
        <nav className="px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 w-64 p-3 border-t border-gray-200 bg-white">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-700"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            로그아웃
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'slo' && <SLOSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'logs' && <LogViewer />}
      </div>
    </div>
  );
}
