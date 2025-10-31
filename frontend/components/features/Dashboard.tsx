"use client";

import { useState } from 'react';
import { Card } from '../ui/card';
import Shell from '../layout/Shell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, TrendingUp, Activity, Zap, Layout } from 'lucide-react';
import { Badge } from '../ui/badge';


// ======================================
// ① 임시 데이터 (나중에 API 연동 예정)
// ======================================
const metricsData = [
  // { time: '00:00', latency: 120, errors: 2, traffic: 1200, cpu: 45 },
  // { time: '04:00', latency: 110, errors: 1, traffic: 900, cpu: 38 },
  // { time: '08:00', latency: 250, errors: 5, traffic: 3200, cpu: 72 },
  // { time: '12:00', latency: 340, errors: 12, traffic: 4500, cpu: 85 },
  // { time: '16:00', latency: 280, errors: 8, traffic: 4100, cpu: 78 },
  // { time: '20:00', latency: 190, errors: 3, traffic: 2800, cpu: 61 },
] = [];   //시간별 latency, traffic, cpu 등

const serviceStatus = [
  // { name: 'payment-api', status: 'healthy', slo: 99.5, current: 99.8, latency: 145 },
  // { name: 'user-service', status: 'warning', slo: 99.9, current: 99.1, latency: 520 },
  // { name: 'inventory-api', status: 'healthy', slo: 99.0, current: 99.6, latency: 89 },
  // { name: 'notification-service', status: 'critical', slo: 99.5, current: 97.2, latency: 1250 },
] = [];        // 각 서비스 상태 (healthy, warning 등)



// ======================================
// ② 메인 컴포넌트
// ======================================
export default function Dashboard() {
  const [viewMode, setViewMode] = useState('grid');

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-gray-900 mb-1">대시보드</h1>
          <p className="text-gray-500">실시간 서비스 모니터링 및 SRE 지표</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">뷰 모드:</span>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            그리드
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'compact' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            컴팩트
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 rounded text-sm ${viewMode === 'detailed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            상세
          </button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">전체 개요</TabsTrigger>
          <TabsTrigger value="metrics">메트릭 분석</TabsTrigger>
          <TabsTrigger value="services">서비스 상태</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {viewMode === 'grid' && <GridView />}
          {viewMode === 'compact' && <CompactView />}
          {viewMode === 'detailed' && <DetailedView />}
        </TabsContent>

        <TabsContent value="metrics">
          <MetricsView />
        </TabsContent>

        <TabsContent value="services">
          <ServicesView />
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ======================================
// ③ Grid View (4개 통계 카드 + 2개 그래프)
// ======================================
function GridView() {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="평균 Latency"
          value="-"    //234ms
          change=""    // +12%
          trend="up"      
          icon={Activity}
        />
        <StatCard
          title="에러율"
          value="-"          //0.8%
          change=""          // -0.2%
          trend="down"
          icon={AlertCircle}
        />
        <StatCard
          title="트래픽"
          value="-"           // 3.2K req/s
          change=""           // +24%
          trend="up"
          icon={TrendingUp}
        />
        <StatCard
          title="평균 CPU"
          value="-"         // 67%
          change=""         // +5%
          trend="up"
          icon={Zap}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Latency 추이</h3>
          {/* <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#93c5fd" />
            </AreaChart>
          </ResponsiveContainer> */}
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">에러 발생 빈도</h3>
          {/* <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="errors" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer> */}
        </Card>
      </div>
    </>
  );
}


// ======================================
// ④ Compact View (주요 지표 + 서비스 상태 요약)
// ======================================
function CompactView() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">주요 지표</h3>
          <Badge>실시간</Badge>
        </div>
        
        <div className="grid grid-cols-4 gap-8">
          <div>
            <p className="text-gray-500 text-sm">Latency (P95)</p>
            {/* <p className="text-gray-900 mt-1">234ms</p>
            <span className="text-red-500 text-sm">+12%</span> */}
          </div>
          <div>
            <p className="text-gray-500 text-sm">Error Rate</p>
            {/* <p className="text-gray-900 mt-1">0.8%</p>
            <span className="text-green-500 text-sm">-0.2%</span> */}
          </div>
          <div>
            <p className="text-gray-500 text-sm">Traffic</p>
            {/* <p className="text-gray-900 mt-1">3.2K/s</p>
            <span className="text-blue-500 text-sm">+24%</span> */}
          </div>
          <div>
            <p className="text-gray-500 text-sm">Saturation</p>
            {/* <p className="text-gray-900 mt-1">67%</p>
            <span className="text-yellow-600 text-sm">+5%</span> */}
          </div>
        </div>

        {/* <div className="mt-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="traffic" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div> */}
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {serviceStatus.map((service) => (
          <Card key={service.name} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 text-sm">{service.name}</span>
              <Badge variant={service.status === 'healthy' ? 'default' : service.status === 'warning' ? 'outline' : 'destructive'}>
                {service.status}
              </Badge>
            </div>
            <p className="text-gray-900">{service.current}%</p>
            <p className="text-gray-500 text-sm">목표: {service.slo}%</p>
          </Card>
        ))}
      </div>
    </div>
  );
}


// ======================================
// ⑤ Detailed View (SLO 게이지 + 이벤트 로그)
// ======================================
function DetailedView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="평균 Latency"
          value="-"
          change=""
          trend="up"
          icon={Activity}
          subtitle="P95: 520ms | P99: 890ms"
        />
        <StatCard
          title="에러율"
          value="-"
          change=""
          trend="down"
          icon={AlertCircle}
          subtitle="4xx: 0.5% | 5xx: 0.3%"
        />
        <StatCard
          title="트래픽"
          value="-"
          change=""
          trend="up"
          icon={TrendingUp}
          subtitle="일일 총계: 276M"
        />
        <StatCard
          title="평균 CPU"
          value="-"
          change=""
          trend="up"
          icon={Zap}
          subtitle="Memory: 72% | Disk: 45%"
        />
      </div>

      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">통합 메트릭 분석</h3>
        {/* <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metricsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="latency" stroke="#3b82f6" strokeWidth={2} name="Latency (ms)" />
            <Line yAxisId="left" type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Errors" />
            <Line yAxisId="right" type="monotone" dataKey="cpu" stroke="#f59e0b" strokeWidth={2} name="CPU (%)" />
          </LineChart>
        </ResponsiveContainer> */}
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">서비스별 SLO 준수율</h3>
          <div className="space-y-4">
            {serviceStatus.map((service) => (
              <div key={service.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{service.name}</span>
                  <span className={service.current >= service.slo ? 'text-green-600' : 'text-red-600'}>
                    {service.current}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${service.current >= service.slo ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${service.current}%` }}
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">목표: {service.slo}% | Latency: {service.latency}ms</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">최근 이벤트</h3>
          <div className="space-y-3">
            {/* <EventItem
              type="critical"
              service="notification-service"
              message="SLO 위반: P95 Latency 1,250ms (목표: 500ms)"
              time="5분 전"
            />
            <EventItem
              type="warning"
              service="user-service"
              message="CPU 사용률 85% 도달"
              time="12분 전"
            />
            <EventItem
              type="info"
              service="payment-api"
              message="Auto-scaling: 3 → 5 pods"
              time="23분 전"
            />
            <EventItem
              type="success"
              service="inventory-api"
              message="배포 완료: v2.4.1"
              time="1시간 전"
            /> */}
          </div>
        </Card>
      </div>
    </div>
  );
}



// ======================================
// ⑥ Metrics View (지표별 그래프 4종)
// ======================================
function MetricsView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Latency 분포</h3>
          {/* <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#93c5fd" name="Latency (ms)" />
            </AreaChart>
          </ResponsiveContainer> */}
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">Traffic 패턴</h3>
          {/* <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="traffic" fill="#10b981" name="Requests/s" />
            </BarChart>
          </ResponsiveContainer> */}
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">에러 추이</h3>
          {/* <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} name="Error Count" />
            </LineChart>
          </ResponsiveContainer> */}
        </Card>

        <Card className="p-6">
          <h3 className="text-gray-900 mb-4">시스템 리소스 (CPU)</h3>
          {/* <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={metricsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="cpu" stroke="#f59e0b" fill="#fcd34d" name="CPU Usage (%)" />
            </AreaChart>
          </ResponsiveContainer> */}
        </Card>
      </div>
    </div>
  );
}

function ServicesView() {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-gray-900 mb-4">서비스 상태 요약</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-700">서비스명</th>
                <th className="text-left py-3 px-4 text-gray-700">상태</th>
                <th className="text-left py-3 px-4 text-gray-700">SLO 목표</th>
                <th className="text-left py-3 px-4 text-gray-700">현재 가용성</th>
                <th className="text-left py-3 px-4 text-gray-700">P95 Latency</th>
                <th className="text-left py-3 px-4 text-gray-700">에러율</th>
              </tr>
            </thead>
            <tbody>
              {serviceStatus.map((service, idx) => (
                <tr key={service.name} className={idx !== serviceStatus.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="py-3 px-4 text-gray-900">{service.name}</td>
                  <td className="py-3 px-4">
                    <Badge variant={service.status === 'healthy' ? 'default' : service.status === 'warning' ? 'outline' : 'destructive'}>
                      {service.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{service.slo}%</td>
                  <td className="py-3 px-4">
                    <span className={service.current >= service.slo ? 'text-green-600' : 'text-red-600'}>
                      {service.current}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-700">{service.latency}ms</td>
                  <td className="py-3 px-4 text-gray-700">
                    {service.status === 'critical' ? '2.8%' : service.status === 'warning' ? '0.9%' : '0.2%'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


// ======================================
// ⑧ 재사용 컴포넌트: 통계 카드
// ======================================
function StatCard({ title, value, change, trend, icon: Icon, subtitle }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-red-50' : 'bg-green-50'}`}>
          <Icon className={`w-4 h-4 ${trend === 'up' ? 'text-red-600' : 'text-green-600'}`} />
        </div>
      </div>
      <span className={`text-sm mt-2 inline-block ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
        {change}
      </span>
    </Card>
  );
}

function EventItem({ type, service, message, time }: any) {
  const colors = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 rounded-full mt-2 ${type === 'critical' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-700 text-sm">{service}</span>
          <span className="text-gray-400 text-xs">{time}</span>
        </div>
        <p className="text-gray-600 text-sm mt-0.5">{message}</p>
      </div>
    </div>
  );
}

