"use client";
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Activity, Zap, BarChart3, Brain, Bell, Shield, CheckCircle } from 'lucide-react'

export interface LandingProps {
  onLoginClick: () => void
}

export default function Landing({ onLoginClick }: LandingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <span className="text-blue-600">SRE Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost">제품</Button>
            <Button variant="ghost">가격</Button>
            <Button variant="ghost">문서</Button>
            <Button variant="outline" onClick={onLoginClick}>로그인</Button>
            <Button onClick={onLoginClick}>무료로 시작하기</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6">
          <Zap className="w-4 h-4" />
          <span className="text-sm">AI 기반 자동화 SRE 플랫폼</span>
        </div>
        
        <h1 className="text-gray-900 mb-6 max-w-4xl mx-auto">
          운영 자동화의 새로운 기준,<br />
          LLM과 K8s가 만나다
        </h1>
        
        <p className="text-gray-600 text-xl mb-8 max-w-2xl mx-auto">
          메트릭과 로그를 실시간으로 분석하고, AI가 제안하는 최적의 조치로<br />
          시스템 안정성을 자동으로 유지하세요.
        </p>

        <div className="flex items-center justify-center gap-4 mb-12">
          <Button size="lg" onClick={onLoginClick}>
            무료로 시작하기
          </Button>
          <Button size="lg" variant="outline">
            데모 보기
          </Button>
        </div>

        {/* Hero Image/Dashboard Preview */}
        <Card className="p-4 max-w-5xl mx-auto shadow-2xl">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg aspect-video flex items-center justify-center">
            <div className="text-white text-center">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-80" />
              <p className="text-lg opacity-90">Dashboard Preview</p>
            </div>
          </div>
        </Card>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-gray-900 mb-4">핵심 기능</h2>
          <p className="text-gray-600">SRE 운영의 모든 것을 하나의 플랫폼에서</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-gray-900 mb-2">실시간 SLO 모니터링</h3>
            <p className="text-gray-600">
              서비스 레벨 목표를 실시간으로 추적하고 에러 예산을 관리합니다.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-gray-900 mb-2">LLM 기반 분석</h3>
            <p className="text-gray-600">
              AI가 로그와 메트릭을 분석하여 근본 원인을 자동으로 파악합니다.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-gray-900 mb-2">K8s 자동 조치</h3>
            <p className="text-gray-600">
              AI가 제안한 조치를 Kubernetes 클러스터에 자동으로 적용합니다.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-gray-900 mb-2">스마트 알림</h3>
            <p className="text-gray-600">
              Slack, 이메일 등 다양한 채널로 중요한 알림만 받아보세요.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-gray-900 mb-2">통합 로그 뷰어</h3>
            <p className="text-gray-600">
              여러 서비스의 로그를 한 곳에서 검색하고 트레이싱할 수 있습니다.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-gray-900 mb-2">안전한 자동화</h3>
            <p className="text-gray-600">
              모든 자동 조치는 승인 프로세스와 롤백 기능을 지원합니다.
            </p>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl mb-2">99.9%</div>
              <p className="text-blue-100">평균 시스템 가용성</p>
            </div>
            <div>
              <div className="text-4xl mb-2">80%</div>
              <p className="text-blue-100">장애 대응 시간 단축</p>
            </div>
            <div>
              <div className="text-4xl mb-2">50+</div>
              <p className="text-blue-100">서비스 모니터링</p>
            </div>
            <div>
              <div className="text-4xl mb-2">24/7</div>
              <p className="text-blue-100">자동 모니터링</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-gray-900 mb-6">
              SRE 팀의 생산성을<br />
              10배 향상시키세요
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-gray-900 mb-1">자동화된 인시던트 대응</h4>
                  <p className="text-gray-600">수동 개입 없이 AI가 장애를 감지하고 자동으로 복구합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-gray-900 mb-1">실시간 근본 원인 분석</h4>
                  <p className="text-gray-600">LLM이 로그와 메트릭을 분석하여 문제의 원인을 즉시 파악합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="text-gray-900 mb-1">안전한 조치 실행</h4>
                  <p className="text-gray-600">모든 자동 조치는 사전 정의된 정책에 따라 안전하게 실행됩니다.</p>
                </div>
              </div>
            </div>
          </div>
          <Card className="p-8 bg-gradient-to-br from-purple-500 to-blue-500">
            <div className="aspect-square bg-white/10 rounded-lg flex items-center justify-center">
              <Brain className="w-24 h-24 text-white opacity-80" />
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            14일 무료 체험으로 SRE Platform의 강력한 기능을 경험해보세요.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" variant="secondary" onClick={onLoginClick}>
              무료로 시작하기
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
              영업팀 문의
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-6 h-6 text-blue-600" />
                <span className="text-blue-600">SRE Platform</span>
              </div>
              <p className="text-gray-600 text-sm">
                AI 기반 자동화 SRE 플랫폼
              </p>
            </div>
            <div>
              <h4 className="text-gray-900 mb-4">제품</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>기능</li>
                <li>가격</li>
                <li>사용 사례</li>
                <li>통합</li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 mb-4">리소스</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>문서</li>
                <li>API</li>
                <li>가이드</li>
                <li>블로그</li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-900 mb-4">회사</h4>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>소개</li>
                <li>채용</li>
                <li>고객사</li>
                <li>문의</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex items-center justify-between text-sm text-gray-600">
            <p>© 2025 SRE Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>개인정보처리방침</span>
              <span>이용약관</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
