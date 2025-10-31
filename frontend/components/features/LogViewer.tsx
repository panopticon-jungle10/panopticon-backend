"use client";

import { useState } from 'react'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Search, Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type LogItem = {
  id: number
  timestamp: string
  level: 'ERROR' | 'WARN' | 'INFO'
  service: string
  message: string
}

const mockLogs: LogItem[] = [
  // { id: 1, timestamp: '2025-10-28 14:32:15.234', level: 'ERROR', service: 'payment-api', message: 'Database connection timeout after 30s' },
  // { id: 2, timestamp: '2025-10-28 14:31:58.123', level: 'WARN', service: 'user-service', message: 'High CPU usage detected: 87%' },
  // { id: 3, timestamp: '2025-10-28 14:31:45.567', level: 'INFO', service: 'inventory-api', message: 'Successfully processed batch update' },
];

export default function LogViewer() {
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null)
  const [filterLevel, setFilterLevel] = useState<'all' | LogItem['level']>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

  const filteredLogs = mockLogs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false
    if (filterService !== 'all' && log.service !== filterService) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!(`${log.timestamp} ${log.level} ${log.service} ${log.message}`.toLowerCase().includes(q))) return false
    }
    return true
  })


  
  const refreshLogs = () => toast.success('로그가 새로고침되었습니다.')
  const downloadLogs = () => toast.success('로그 파일 다운로드가 시작되었습니다.')

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input placeholder="검색어를 입력하세요" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          </div>
          <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as any)}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="ERROR">ERROR</SelectItem>
              <SelectItem value="WARN">WARN</SelectItem>
              <SelectItem value="INFO">INFO</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Service" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              <SelectItem value="payment-api">payment-api</SelectItem>
              <SelectItem value="user-service">user-service</SelectItem>
              <SelectItem value="inventory-api">inventory-api</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={refreshLogs}><RefreshCw className="h-4 w-4 mr-2" />새로고침</Button>
          <Button onClick={downloadLogs}><Download className="h-4 w-4 mr-2" />다운로드</Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-gray-600">
              <th className="py-2 px-3 text-left w-40">시간</th>
              <th className="py-2 px-3 text-left w-20">레벨</th>
              <th className="py-2 px-3 text-left w-40">서비스</th>
              <th className="py-2 px-3 text-left">메시지</th>
              <th className="py-2 px-3 text-right w-12">보기</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                <td className="py-2 px-3">
                  <Badge variant={log.level === 'ERROR' ? 'destructive' : log.level === 'WARN' ? 'outline' : 'secondary'}>
                    {log.level}
                  </Badge>
                </td>
                <td className="py-2 px-3">{log.service}</td>
                <td className="py-2 px-3">{log.message}</td>
                <td className="py-2 px-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                    상세
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {selectedLog && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-gray-900 font-medium">상세 로그</div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedLog(null)}>닫기</Button>
          </div>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">{JSON.stringify(selectedLog, null, 2)}</pre>
        </Card>
      )}
    </div>
  )
}

