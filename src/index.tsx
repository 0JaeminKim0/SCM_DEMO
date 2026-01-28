import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { poData } from './data.js'

const app = new Hono()

// Enable CORS
app.use('/api/*', cors())

// API Routes
app.get('/api/data', (c) => {
  return c.json(poData)
})

// Step 1: PO 추출 - 전체 데이터 반환
app.get('/api/step1/po-extract', (c) => {
  const summary = {
    totalCount: poData.length,
    byCategory: {} as Record<string, number>,
    bySupplier: {} as Record<string, number>,
    byMaterialType: {} as Record<string, number>
  }
  
  poData.forEach(item => {
    // 구분별 건수
    const category = item.구분 as string
    summary.byCategory[category] = (summary.byCategory[category] || 0) + 1
    // 공급사별 건수
    const supplier = item.발주업체명 as string
    summary.bySupplier[supplier] = (summary.bySupplier[supplier] || 0) + 1
    // 자재구분별 건수
    if (item.자재구분) {
      const matType = item.자재구분 as string
      summary.byMaterialType[matType] = (summary.byMaterialType[matType] || 0) + 1
    }
  })
  
  return c.json({
    data: poData,
    summary: {
      totalCount: summary.totalCount,
      supplierCount: Object.keys(summary.bySupplier).length,
      byCategory: summary.byCategory,
      bySupplier: summary.bySupplier,
      byMaterialType: summary.byMaterialType
    }
  })
})

// Step 2: 계약 납기 검증
app.get('/api/step2/delivery-validation', (c) => {
  const results = poData.map(item => {
    const orderDate = new Date(item.발주일 as string)
    const leadTime = Number(item['LEAD TIME']) || 0
    const contractDateStr = item.계약납기일
    const contractDate = contractDateStr ? new Date(contractDateStr) : null
    
    // 예상 완료일 = 발주일 + Lead Time
    const expectedDate = new Date(orderDate)
    expectedDate.setDate(expectedDate.getDate() + leadTime)
    
    let status: 'danger' | 'warning' | 'normal' = 'normal'
    let daysDiff = 0
    
    if (contractDate) {
      daysDiff = Math.floor((contractDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff < 0) {
        status = 'danger' // 예상 완료일 > 계약납기일
      } else if (daysDiff <= 2) {
        status = 'warning' // 주의 필요
      }
    }
    
    return {
      ...item,
      expectedDate: expectedDate.toISOString().split('T')[0],
      daysDiff,
      status
    }
  })
  
  const summary = {
    danger: results.filter(r => r.status === 'danger').length,
    warning: results.filter(r => r.status === 'warning').length,
    normal: results.filter(r => r.status === 'normal').length
  }
  
  return c.json({
    data: results,
    summary
  })
})

// Step 3: PND 변경 사항
app.get('/api/step3/pnd-changes', (c) => {
  const changedItems = poData.filter(item => item['변경된 PND'] && item['PND 변경'])
  
  const results = changedItems.map(item => {
    const originalPnd = new Date(item.PND as string)
    const changedPnd = new Date(item['변경된 PND'] as string)
    const daysDiff = Math.floor((changedPnd.getTime() - originalPnd.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      ...item,
      daysDiff,
      direction: daysDiff < 0 ? 'earlier' : daysDiff > 0 ? 'later' : 'same'
    }
  })
  
  const summary = {
    totalChanges: results.length,
    earlier: results.filter(r => r.direction === 'earlier').length,
    later: results.filter(r => r.direction === 'later').length,
    noChange: poData.length - results.length
  }
  
  return c.json({
    data: results,
    summary
  })
})

// Step 4: 보급 요청 현황
app.get('/api/step4/supply-requests', (c) => {
  const withRequest = poData.filter(item => item.보급요청일)
  const withoutRequest = poData.filter(item => !item.보급요청일)
  const urgentRequests = poData.filter(item => (item.비고 as string | null)?.includes('긴급'))
  
  return c.json({
    data: poData,
    summary: {
      withRequest: withRequest.length,
      withoutRequest: withoutRequest.length,
      urgent: urgentRequests.length
    },
    urgentItems: urgentRequests
  })
})

// Step 5: 적정성 판단
app.get('/api/step5/appropriateness', (c) => {
  const results = poData.map(item => {
    const contractDate = item.계약납기일 ? new Date(item.계약납기일) : null
    const supplyDate = item.보급요청일 ? new Date(item.보급요청일) : null
    
    let status: 'danger' | 'warning' | 'normal' | 'unknown' = 'unknown'
    let daysDiff = 0
    
    if (contractDate && supplyDate) {
      daysDiff = Math.floor((supplyDate.getTime() - contractDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff < 0) {
        status = 'danger' // 계약납기 > 보급요청일
      } else if (daysDiff <= 2) {
        status = 'warning' // 촉박
      } else {
        status = 'normal' // 여유
      }
    }
    
    return {
      ...item,
      daysDiff,
      status
    }
  })
  
  const validResults = results.filter(r => r.status !== 'unknown')
  
  const summary = {
    danger: validResults.filter(r => r.status === 'danger').length,
    warning: validResults.filter(r => r.status === 'warning').length,
    normal: validResults.filter(r => r.status === 'normal').length,
    unknown: results.filter(r => r.status === 'unknown').length
  }
  
  return c.json({
    data: results,
    summary
  })
})

// Step 6: 메일 발송 현황 - PRD v2: 협력사별 상세 데이터 포함
app.get('/api/step6/email-status', (c) => {
  const suppliers = [...new Set(poData.map(item => item.발주업체명))]
  
  const emailStatus = suppliers.map((supplier, index) => {
    // 해당 협력사의 발주 항목들
    const supplierItems = poData.filter(item => item.발주업체명 === supplier)
    
    return {
      supplier,
      itemCount: supplierItems.length,
      status: 'sent', // 데모: 전체 발송 완료
      sentAt: '2025-01-28 09:30:00',
      // 협력사별 발주 현황 (메일 미리보기용)
      items: supplierItems.map(item => ({
        poNumber: item.구매오더,
        ship: item.호선,
        contractDate: item.계약납기일,
        currentDate: item['2549주입고예정일'] || item['2548주입고예정일'] || item['2547주입고예정일'] || null,
        materialNumber: item.자재번호,
        materialName: item.자재내역
      }))
    }
  })
  
  return c.json({
    data: emailStatus,
    summary: {
      totalSuppliers: suppliers.length,
      sent: emailStatus.filter(e => e.status === 'sent').length,
      pending: emailStatus.filter(e => e.status === 'pending').length,
      failed: emailStatus.filter(e => e.status === 'failed').length
    }
  })
})

// Step 7: 회신 수집 - PRD v2: 협력사 수 기준 제출률
app.get('/api/step7/response-collection', (c) => {
  const suppliers = [...new Set(poData.map(item => item.발주업체명))]
  
  // PRD v2 예시: 7개 협력사 중 5개 회신 완료 = 71%
  // 데모용으로 앞의 5개 협력사만 제출 완료로 설정
  const submittedCount = Math.min(5, suppliers.length) // 5개 협력사 제출
  
  const responseStatus = suppliers.map((supplier, index) => ({
    supplier,
    itemCount: poData.filter(item => item.발주업체명 === supplier).length,
    submitted: index < submittedCount,
    submittedAt: index < submittedCount ? ['2025-01-28 09:00:00', '2025-01-28 14:30:00', '2025-01-28 10:15:00', '2025-01-29 09:45:00', '2025-01-30 11:00:00'][index % 5] : null,
    reminderSent: index >= submittedCount
  }))
  
  const submissionRate = Math.round((submittedCount / suppliers.length) * 100)
  
  return c.json({
    data: responseStatus,
    summary: {
      totalSuppliers: suppliers.length,
      submitted: submittedCount,
      notSubmitted: suppliers.length - submittedCount,
      submissionRate
    },
    pendingReminders: responseStatus.filter(r => !r.submitted)
  })
})

// Step 8: 비교 분석
app.get('/api/step8/comparison-analysis', (c) => {
  const itemsWithMultipleSchedules = poData.filter(item => 
    item['2547주입고예정일'] || item['2548주입고예정일'] || item['2549주입고예정일']
  )
  
  const delayedItems = poData.filter(item => item.지연구분 === '지연')
  const cautionItems = poData.filter(item => item.지연구분 === '주의')
  const shortageItems = poData.filter(item => item.결품구분 === '결품')
  
  const riskItems = poData.filter(item => {
    // 연속 지연 체크 (진행현황에서 '지연' 포함)
    return item.지연구분 === '지연' || item.결품구분 === '결품'
  }).map(item => ({
    ...item,
    riskLevel: item.결품구분 === '결품' ? 'critical' : 'high',
    recommendation: item.결품구분 === '결품' 
      ? '긴급 대체 공급사 검토 필요' 
      : '공급사 연락 및 일정 조정 협의'
  }))
  
  return c.json({
    data: itemsWithMultipleSchedules,
    riskItems,
    summary: {
      totalItems: poData.length,
      delayed: delayedItems.length,
      caution: cautionItems.length,
      shortage: shortageItems.length,
      critical: shortageItems.length,
      withScheduleChanges: itemsWithMultipleSchedules.filter(item => 
        item['2548주입고예정일'] || item['2549주입고예정일']
      ).length
    }
  })
})

// Alerts API - PRD v2 프로세스명 연동
app.get('/api/alerts', (c) => {
  const alerts = [
    {
      id: 1,
      type: 'danger',
      icon: '🔴',
      title: '납기 지연 위험',
      description: '2579AVGTKWCG1030 외 4건',
      detail: 'STEP ② 계약 납기일 검증 - 계약납기 초과 예상',
      time: '방금 전',
      isNew: true,
      items: poData.filter(item => item.지연구분 === '지연').slice(0, 5)
    },
    {
      id: 2,
      type: 'warning',
      icon: '⚠️',
      title: 'PND 변경 감지',
      description: '2582AVEJBUBA2310',
      detail: 'STEP ③ PND 변경 사항 검토 - 17일 앞당겨짐',
      time: '5분 전',
      isNew: true,
      items: poData.filter(item => item['변경된 PND']).slice(0, 3)
    },
    {
      id: 3,
      type: 'urgent',
      icon: '📦',
      title: '긴급 보급 요청',
      description: '호선 2583 - 생산1팀 김철수',
      detail: 'STEP ④ 보급 요청일 검토 - 즉시 처리 필요',
      time: '10분 전',
      isNew: true,
      items: poData.filter(item => (item.비고 as string | null)?.includes('긴급')).slice(0, 3)
    },
    {
      id: 4,
      type: 'info',
      icon: '📧',
      title: '회신 미제출 알림',
      description: 'SNRI SCHUF, FUJI TRADING CO. 외 2개 협력사',
      detail: 'STEP ⑦ 납기 예정일 회신 수집 - 기한 D-1',
      time: '1시간 전',
      isNew: false,
      items: []
    },
    {
      id: 5,
      type: 'warning',
      icon: '📈',
      title: '납기 변동 경고',
      description: '2539AVRHAWCG4150-M',
      detail: 'STEP ⑧ 비교 분석 - 3차 연속 지연',
      time: '2시간 전',
      isNew: false,
      items: poData.filter(item => item['2549주입고예정일']).slice(0, 2)
    },
    {
      id: 6,
      type: 'danger',
      icon: '🔴',
      title: '납기 지연 예상',
      description: '3차 납기예정일 > 보급요청일',
      detail: 'STEP ⑧ 비교 분석 - 5.2 적정성 판단 위험',
      time: '3시간 전',
      isNew: false,
      items: poData.filter(item => item['2549주입고예정일'] && item['보급요청일']).slice(0, 2)
    }
  ]
  
  return c.json(alerts)
})

// Main HTML page
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>한화오션 SCM 납기관리 AI Agent</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.3); opacity: 0; }
    }
    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .pulse-ring::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid currentColor;
      animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    .spin-slow {
      animation: spin-slow 2s linear infinite;
    }
    .step-connector {
      position: absolute;
      top: 50%;
      left: 100%;
      width: 40px;
      height: 2px;
      background: linear-gradient(90deg, #d1d5db, #d1d5db);
      transform: translateY(-50%);
    }
    .step-connector.completed {
      background: linear-gradient(90deg, #22c55e, #22c55e);
    }
    .step-connector.active {
      background: linear-gradient(90deg, #3b82f6, #93c5fd);
      animation: flow 1s ease-in-out infinite;
    }
    @keyframes flow {
      0% { background-position: 0% 50%; }
      100% { background-position: 100% 50%; }
    }
    .toast-enter {
      animation: slideIn 0.3s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .alert-badge {
      animation: bounce 1s infinite;
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    .progress-bar {
      transition: width 0.5s ease-out;
    }
    .data-row:hover {
      background-color: #f3f4f6;
    }
    .scrollbar-thin::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .scrollbar-thin::-webkit-scrollbar-track {
      background: #f1f1f1;
    }
    .scrollbar-thin::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
    .modal-overlay {
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
    }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
  <div id="app"></div>
  <script src="/static/app.js"></script>
</body>
</html>`)
})

export default app
