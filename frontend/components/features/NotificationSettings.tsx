"use client";

import { useState } from 'react'
import { Card } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Mail, MessageSquare, Bell, Save, TestTube } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { toast } from 'sonner'

export default function NotificationSettings() {
  const [slackEnabled, setSlackEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [webhookEnabled, setWebhookEnabled] = useState(false)

  // const testConnection = () => {
  //   toast.loading('연결 테스트 중...', { duration: 1000 })
  //   setTimeout(() => toast.success('연결이 성공했습니다!'), 1000)
  // }

  const saveRules = () => toast.success('알림 규칙이 저장되었습니다.')
  const saveTemplates = () => toast.success('메시지 템플릿이 저장되었습니다.')

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-1">알림 설정</h1>
        <p className="text-gray-500">SLO/에러 이벤트를 받을 채널을 설정합니다.</p>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList>
          <TabsTrigger value="channels">알림 채널</TabsTrigger>
          <TabsTrigger value="rules">알림 규칙</TabsTrigger>
          <TabsTrigger value="templates">메시지 템플릿</TabsTrigger>
        </TabsList>

        {/* ------------------------------ */}
        {/* 🟣 알림 채널 설정 */}
        {/* ------------------------------ */}

        <TabsContent value="channels" className="space-y-6">
          {/* Slack */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-gray-900">Slack 연동</h3>
                  <p className="text-gray-500 text-sm">Slack 채널로 알림을 전송합니다.</p>
                </div>
              </div>
              <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
            </div>

            {/* Slack 상세 설정 */}
            {slackEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <Label>Slack Webhook URL</Label>
                  <Input placeholder="https://hooks.slack.com/services/..." className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>기본 채널</Label>
                    <Input placeholder="#sre-alerts" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>긴급 알림 채널</Label>
                    <Input placeholder="#critical-alerts" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" >
                    {/* <TestTube className="w-4 h-4 mr-2" />연결 테스트 */}
                  </Button>
                  {/* <Badge variant="outline" className="ml-auto">대기</Badge> */}
                </div>
              </div>
            )}
          </Card>

           {/* Email */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-gray-900">이메일 알림</h3>
                  <p className="text-gray-500 text-sm">지정된 이메일 주소로 알림을 전송합니다.</p>
                </div>
              </div>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>

            {emailEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <Label>수신 이메일(쉼표로 구분)</Label>
                  <Textarea placeholder="sre@company.com, ops@company.com" className="mt-1.5" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>발신자 이름</Label>
                    <Input placeholder="SRE Platform" className="mt-1.5" />
                  </div>
                  <div>
                    <Label>발신 주소</Label>
                    <Input placeholder="noreply@company.com" className="mt-1.5" />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="email-digest" />
                    <Label htmlFor="email-digest" className="cursor-pointer">매일 요약 이메일</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="email-urgent" defaultChecked />
                    <Label htmlFor="email-urgent" className="cursor-pointer">긴급 알림만</Label>
                  </div>
                </div>
              </div>
            )}
          </Card>

           {/* Webhook */}
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bell className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-gray-900">Webhook</h3>
                  <p className="text-gray-500 text-sm">자체 엔드포인트로 알림을 전송합니다.</p>
                </div>
              </div>
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
            </div>

            {webhookEnabled && (
              <div className="space-y-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://your-api.com/webhooks/sre-alerts" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>HTTP Method</Label>
                    <Select defaultValue="POST">
                      <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>인증 토큰</Label>
                    <Input type="password" placeholder="Bearer token..." className="mt-1.5" />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* 알림 규칙 */}
        <TabsContent value="rules">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">알림 규칙</h3>
            <div className="space-y-4">
              <NotificationRule title="SLO 위반 (Critical)" description="서비스의 SLO가 목표치를 벗어났을 때" severity="critical" channels={['Slack', 'Email']} />
              <NotificationRule title="에러 버짓 50% 초과" description="에러 버짓이 50%를 초과했을 때" severity="warning" channels={['Slack']} />
              <NotificationRule title="에러 버짓 80% 초과" description="에러 버짓이 80%를 초과했을 때" severity="critical" channels={['Slack', 'Email']} />
              <NotificationRule title="Auto-scaling 이벤트" description="자동 스케일링이 수행되었을 때" severity="info" channels={['Slack']} />
              <NotificationRule title="자동 조치 수행" description="권고된 조치가 자동 수행되었을 때" severity="warning" channels={['Slack', 'Email', 'Webhook']} />
            </div>
            <Button className="w-full mt-6" onClick={saveRules}><Save className="w-4 h-4 mr-2" />규칙 저장</Button>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card className="p-6">
            <h3 className="text-gray-900 mb-4">메시지 템플릿</h3>
            <div className="space-y-6">
              <div>
                <Label>SLO 위반 메시지</Label>
                <Textarea className="mt-1.5 font-mono text-sm" rows={8}
                  defaultValue={`[알림] SLO 위반 감지\n\n서비스: {{service_name}}\n지표: {{metric_name}} {{current_value}} (목표: {{target_value}})\n\nAI 분석:\n{{ai_analysis}}\n\n권고 조치:\n{{suggested_actions}}`} />
              </div>
              <div>
                <Label>에러 버짓 초과 메시지</Label>
                <Textarea className="mt-1.5 font-mono text-sm" rows={6}
                  defaultValue={`[경고] 에러 버짓 초과\n\n서비스: {{service_name}}\n버짓 소모율: {{burn_rate}}%\n남은 버짓: {{remaining_budget}}%\n\n현재 추세로는 {{estimated_time}} 내 소진 예상`} />
              </div>
            </div>
            <Button className="w-full mt-6" onClick={saveTemplates}><Save className="w-4 h-4 mr-2" />템플릿 저장</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationRule({ title, description, severity, channels }: any) {
  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700',
    warning: 'bg-yellow-100 text-yellow-700',
    info: 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-gray-900">{title}</h4>
            <Badge className={severityColors[severity] || ''}>{severity}</Badge>
          </div>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <span className="text-gray-500 text-sm">알림 채널:</span>
        {channels.map((c: string) => (<Badge key={c} variant="outline">{c}</Badge>))}
      </div>
    </div>
  )
}

