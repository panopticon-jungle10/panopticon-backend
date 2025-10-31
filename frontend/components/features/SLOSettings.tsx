"use client";

import { useState } from 'react'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Plus, Trash2, Save } from 'lucide-react'    // 아이콘
import { toast } from 'sonner'    // 알림 토스트


// =============================
// ① 타입 정의
// =============================
type Metric = 'latency' | 'availability' | 'error_rate' | 'throughput'


// 각 SLO 항목의 형태를 지정
type SLO = {
  id: number
  service: string
  metric: Metric
  threshold: number
  percentile: number
  availability: number
  errorBudget: number
}


// =============================
// ② 메인 컴포넌트 시작
// =============================
export default function SLOSettings() {
  const [slos, setSlos] = useState<SLO[]>([
    // { id: 1, service: 'payment-api', metric: 'latency', threshold: 500, percentile: 95, availability: 99.5, errorBudget: 0.5 },
    // { id: 2, service: 'user-service', metric: 'availability', threshold: 200, percentile: 99, availability: 99.9, errorBudget: 0.1 },
  ])


  // 새로 추가할 SLO 임시 입력값 상태
  const [newSLO, setNewSLO] = useState<Omit<SLO, 'id' | 'errorBudget'>>({
    service: '',
    metric: 'latency',
    threshold: 500,
    percentile: 95,
    availability: 99.9,
  })


  
  // =============================
  // ③ SLO 추가 & 삭제 &저장 & 취소 함수
  // =============================
  const addSLO = () => {
    if (!newSLO.service.trim()) {
      toast.error('서비스명을 입력하세요.')
      return
    }
    const errorBudget = Number((100 - newSLO.availability).toFixed(1))
    setSlos((prev) => [...prev, { id: Date.now(), errorBudget, ...newSLO }])
    toast.success(`${newSLO.service} SLO가 추가되었습니다.`)
    setNewSLO({ service: '', metric: 'latency', threshold: 500, percentile: 95, availability: 99.9 })
  }

  const deleteSLO = (id: number) => {
    const target = slos.find((s) => s.id === id)
    setSlos((prev) => prev.filter((s) => s.id !== id))
    toast.success(`${target?.service ?? '항목'} SLO가 삭제되었습니다.`)
  }

  const saveAllSLOs = () => toast.success('모든 변경사항이 저장되었습니다.')
  const cancelChanges = () => toast.info('변경사항을 취소했습니다.')


  // =============================
  // ⑥ 렌더링 영역
  // =============================
  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-1">SLO 설정</h1>
        <p className="text-gray-500">서비스 레벨 목표(Service Level Objective)를 정의하고 관리합니다.</p>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-gray-900 mb-4">새 SLO 추가</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <Label>서비스명</Label>
            <Input
              placeholder="예: payment-api"
              value={newSLO.service}
              onChange={(e) => setNewSLO({ ...newSLO, service: e.target.value })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>측정 지표</Label>
            <Select value={newSLO.metric} onValueChange={(v) => setNewSLO({ ...newSLO, metric: v as Metric })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latency">Latency</SelectItem>
                <SelectItem value="availability">Availability</SelectItem>
                <SelectItem value="error_rate">Error Rate</SelectItem>
                <SelectItem value="throughput">Throughput</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>임계값 (ms)</Label>
            <Input
              type="number"
              value={newSLO.threshold}
              onChange={(e) => setNewSLO({ ...newSLO, threshold: Number(e.target.value) })}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>백분위수 (P)</Label>
            <Select value={String(newSLO.percentile)} onValueChange={(v) => setNewSLO({ ...newSLO, percentile: Number(v) })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">P50</SelectItem>
                <SelectItem value="90">P90</SelectItem>
                <SelectItem value="95">P95</SelectItem>
                <SelectItem value="99">P99</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>가용성 목표 (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={newSLO.availability}
              onChange={(e) => setNewSLO({ ...newSLO, availability: Number(e.target.value) })}
              className="mt-1.5"
            />
          </div>
        </div>

        <Button onClick={addSLO} className="w-full">
          <Plus className="w-4 h-4 mr-2" />새 SLO 추가
        </Button>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">설정된 SLO 목록</h3>
          <Badge>{slos.length}개 서비스</Badge>
        </div>

        <div className="space-y-4">
          {slos.map((slo) => (
            <div key={slo.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <Label className="text-gray-500 text-xs">서비스명</Label>
                    <p className="text-gray-900 mt-1">{slo.service}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">측정 지표</Label>
                    <Badge variant="outline" className="mt-1">{slo.metric}</Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">임계값</Label>
                    <p className="text-gray-900 mt-1">{slo.threshold}ms</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">백분위수</Label>
                    <p className="text-gray-900 mt-1">P{slo.percentile}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">가용성 목표</Label>
                    <p className="text-gray-900 mt-1">{slo.availability}%</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 text-xs">에러 버짓</Label>
                    <p className="text-red-600 mt-1">{slo.errorBudget}%</p>
                  </div>
                </div>

                <button onClick={() => deleteSLO(slo.id)} className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <Button className="flex-1" onClick={saveAllSLOs}>
            <Save className="w-4 h-4 mr-2" />모든 변경사항 저장
          </Button>
          <Button variant="outline" onClick={cancelChanges}>취소</Button>
        </div>
      </Card>
    </div>
  )
}

