// 한화오션 SCM 납기관리 AI Agent - Frontend Application (PRD v2)

// State Management
const state = {
  currentStep: 0,
  stepStatus: Array(8).fill('pending'),
  stepData: {},
  alerts: [],
  unreadAlerts: 0,
  isAutoRunning: false,
  showAlertPanel: false,
  selectedAlert: null,
  toasts: [],
  showEmailPreview: false,
  selectedSupplier: null
};

// Step definitions - PRD v2 프로세스명 변경
const steps = [
  { id: 1, name: '납기관리 Tracking 포맷 생성', shortName: 'Tracking 포맷', icon: 'fa-file-excel', api: '/api/step1/po-extract' },
  { id: 2, name: '계약 납기일 검증', shortName: '납기 검증', icon: 'fa-check-circle', api: '/api/step2/delivery-validation' },
  { id: 3, name: 'PND 변경 사항 검토', shortName: 'PND 변경', icon: 'fa-calendar-alt', api: '/api/step3/pnd-changes' },
  { id: 4, name: '보급 요청일 검토', shortName: '보급 요청', icon: 'fa-box', api: '/api/step4/supply-requests' },
  { id: 5, name: '납기 예정일 적정성 판단', shortName: '적정성 판단', icon: 'fa-chart-pie', api: '/api/step5/appropriateness' },
  { id: 6, name: '주단위 협력사 납기 예정일 업데이트 요청', shortName: '메일 발송', icon: 'fa-envelope', api: '/api/step6/email-status' },
  { id: 7, name: '납기 예정일 회신 수집', shortName: '회신 수집', icon: 'fa-inbox', api: '/api/step7/response-collection' },
  { id: 8, name: '비교 분석', shortName: '비교 분석', icon: 'fa-chart-line', api: '/api/step8/comparison-analysis' }
];

// 용어 정의 - PRD v2
const terminology = {
  'PND': '설계팀이 정한 생산에 필요한 자재 도착 기한',
  '보급요청일': '생산팀이 요청한 자재 필요일 (PND와 별개)',
  '계약납기일': '계약서상 납기일 (고정값)',
  '협력사 납기예정일': '협력사가 회신한 실제 납품 예정일',
  '2547주/2548주/2549주': '협력사 납기예정일 1차/2차/3차 (주차 기준)'
};

// Utility functions
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return dateStr;
};

const getStatusBadge = (status) => {
  const badges = {
    danger: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">🔴 지연</span>',
    warning: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🟡 주의</span>',
    normal: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">🟢 양호</span>',
    unknown: '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">미정</span>'
  };
  return badges[status] || badges.unknown;
};

const getStatusDot = (status) => {
  const dots = {
    danger: '<span class="w-3 h-3 rounded-full bg-red-500"></span>',
    warning: '<span class="w-3 h-3 rounded-full bg-yellow-500"></span>',
    normal: '<span class="w-3 h-3 rounded-full bg-green-500"></span>'
  };
  return dots[status] || '';
};

// Toast notifications
function showToast(type, title, message, duration = 5000) {
  const toast = { id: Date.now(), type, title, message };
  state.toasts.push(toast);
  renderToasts();
  
  setTimeout(() => {
    state.toasts = state.toasts.filter(t => t.id !== toast.id);
    renderToasts();
  }, duration);
}

function renderToasts() {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  container.innerHTML = state.toasts.map(toast => `
    <div class="toast-enter bg-white rounded-lg shadow-lg border-l-4 ${
      toast.type === 'danger' ? 'border-red-500' : 
      toast.type === 'warning' ? 'border-yellow-500' : 
      toast.type === 'success' ? 'border-green-500' : 'border-blue-500'
    } p-4 mb-3 max-w-sm">
      <div class="flex items-start">
        <div class="flex-shrink-0">
          ${toast.type === 'danger' ? '<i class="fas fa-exclamation-circle text-red-500"></i>' :
            toast.type === 'warning' ? '<i class="fas fa-exclamation-triangle text-yellow-500"></i>' :
            toast.type === 'success' ? '<i class="fas fa-check-circle text-green-500"></i>' :
            '<i class="fas fa-info-circle text-blue-500"></i>'}
        </div>
        <div class="ml-3 flex-1">
          <p class="text-sm font-medium text-gray-900">${toast.title}</p>
          <p class="mt-1 text-sm text-gray-500">${toast.message}</p>
        </div>
        <button onclick="closeToast(${toast.id})" class="ml-4 text-gray-400 hover:text-gray-600">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `).join('');
}

function closeToast(id) {
  state.toasts = state.toasts.filter(t => t.id !== id);
  renderToasts();
}

// Alert functions - PRD v2 프로세스명 연동
async function loadAlerts() {
  try {
    const response = await fetch('/api/alerts');
    state.alerts = await response.json();
    state.unreadAlerts = state.alerts.filter(a => a.isNew).length;
    renderAlertBadge();
  } catch (error) {
    console.error('Failed to load alerts:', error);
  }
}

function renderAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (badge) {
    badge.textContent = state.unreadAlerts;
    badge.classList.toggle('hidden', state.unreadAlerts === 0);
  }
}

function toggleAlertPanel() {
  state.showAlertPanel = !state.showAlertPanel;
  renderAlertPanel();
}

function renderAlertPanel() {
  const panel = document.getElementById('alert-panel');
  if (!panel) return;
  
  if (!state.showAlertPanel) {
    panel.classList.add('hidden');
    return;
  }
  
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="fixed inset-0 z-40" onclick="toggleAlertPanel()"></div>
    <div class="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border z-50 max-h-[500px] overflow-hidden">
      <div class="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 class="font-semibold text-gray-900 flex items-center">
          <i class="fas fa-bell mr-2 text-blue-500"></i>
          알림 센터
        </h3>
        <button onclick="markAllRead()" class="text-sm text-blue-600 hover:text-blue-800">모두 읽음</button>
      </div>
      <div class="overflow-y-auto max-h-96">
        ${state.alerts.map(alert => `
          <div class="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors" onclick="showAlertDetail(${alert.id})">
            <div class="flex items-start gap-3">
              <span class="text-2xl">${alert.icon}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  ${alert.isNew ? '<span class="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded">NEW</span>' : ''}
                  <span class="font-medium text-gray-900">${alert.title}</span>
                </div>
                <p class="text-sm text-gray-600 truncate">${alert.description}</p>
                <p class="text-xs text-gray-500 mt-1">${alert.detail}</p>
                <p class="text-xs text-gray-400 mt-1">${alert.time}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function markAllRead() {
  state.alerts.forEach(a => a.isNew = false);
  state.unreadAlerts = 0;
  renderAlertBadge();
  renderAlertPanel();
}

function showAlertDetail(alertId) {
  const alert = state.alerts.find(a => a.id === alertId);
  if (!alert) return;
  
  alert.isNew = false;
  state.unreadAlerts = state.alerts.filter(a => a.isNew).length;
  state.selectedAlert = alert;
  renderAlertBadge();
  renderAlertModal();
}

function renderAlertModal() {
  const modal = document.getElementById('alert-modal');
  if (!modal || !state.selectedAlert) return;
  
  const alert = state.selectedAlert;
  modal.classList.remove('hidden');
  modal.innerHTML = `
    <div class="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6 border-b flex justify-between items-center">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <span class="text-2xl">${alert.icon}</span>
            ${alert.title} 알림
          </h3>
          <button onclick="closeAlertModal()" class="text-gray-400 hover:text-gray-600">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-700 mb-3 flex items-center">
              <i class="fas fa-info-circle mr-2 text-blue-500"></i>
              알림 정보
            </h4>
            <div class="space-y-2 text-sm">
              <p><span class="text-gray-500">설명:</span> ${alert.description}</p>
              <p><span class="text-gray-500">상세:</span> ${alert.detail}</p>
              <p><span class="text-gray-500">발생 시간:</span> ${alert.time}</p>
            </div>
          </div>
          
          ${alert.items && alert.items.length > 0 ? `
          <div class="bg-yellow-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-700 mb-3 flex items-center">
              <i class="fas fa-list mr-2 text-yellow-500"></i>
              관련 항목 (${alert.items.length}건)
            </h4>
            <div class="space-y-2 text-sm max-h-40 overflow-y-auto">
              ${alert.items.map(item => `
                <div class="flex justify-between items-center py-1 border-b border-yellow-100">
                  <span class="font-mono text-xs">${item['자재번호'] || '-'}</span>
                  <span class="text-gray-600">${item['발주업체명'] || '-'}</span>
                </div>
              `).join('')}
            </div>
          </div>
          ` : ''}
          
          <div class="bg-blue-50 rounded-lg p-4">
            <h4 class="font-medium text-gray-700 mb-3 flex items-center">
              <i class="fas fa-lightbulb mr-2 text-blue-500"></i>
              권장 조치
            </h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>1. 공급사 긴급 연락하여 납기 단축 협의</li>
              <li>2. 대체 공급사 검토</li>
              <li>3. 생산팀에 일정 조정 가능 여부 확인</li>
            </ul>
          </div>
        </div>
        <div class="p-4 bg-gray-50 border-t flex gap-2 justify-end">
          <button class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
            <i class="fas fa-envelope mr-1"></i> 공급사 메일 발송
          </button>
          <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm">
            <i class="fas fa-phone mr-1"></i> 담당자 연락
          </button>
          <button onclick="closeAlertModal()" class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm">
            <i class="fas fa-check mr-1"></i> 확인 완료
          </button>
        </div>
      </div>
    </div>
  `;
}

function closeAlertModal() {
  const modal = document.getElementById('alert-modal');
  if (modal) {
    modal.classList.add('hidden');
    modal.innerHTML = '';
  }
  state.selectedAlert = null;
  state.showAlertPanel = false;
  renderAlertPanel();
}

// Step execution
async function executeStep(stepIndex) {
  const step = steps[stepIndex];
  state.currentStep = stepIndex;
  state.stepStatus[stepIndex] = 'processing';
  renderStepper();
  renderContent();
  
  try {
    // Show loading animation
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const response = await fetch(step.api);
    const data = await response.json();
    state.stepData[stepIndex] = data;
    state.stepStatus[stepIndex] = 'completed';
    
    // Check for alerts based on step
    generateStepAlerts(stepIndex, data);
    
    renderStepper();
    renderContent();
    
    return true;
  } catch (error) {
    console.error(`Step ${stepIndex + 1} failed:`, error);
    state.stepStatus[stepIndex] = 'error';
    renderStepper();
    return false;
  }
}

// PRD v2 알림 연동 수정
function generateStepAlerts(stepIndex, data) {
  if (stepIndex === 1 && data.summary) {
    if (data.summary.danger > 0) {
      showToast('danger', '🔴 납기 지연 위험 감지', `STEP ② 계약 납기일 검증: ${data.summary.danger}건의 위험 항목 발견`);
    }
  }
  if (stepIndex === 2 && data.summary) {
    if (data.summary.totalChanges > 0) {
      showToast('warning', '⚠️ PND 변경 감지', `STEP ③ PND 변경 사항 검토: ${data.summary.totalChanges}건 변경됨`);
    }
  }
  if (stepIndex === 3 && data.summary) {
    if (data.summary.urgent > 0) {
      showToast('danger', '📦 긴급 보급 요청', `STEP ④ 보급 요청일 검토: ${data.summary.urgent}건 긴급`);
    }
  }
  if (stepIndex === 4 && data.summary) {
    if (data.summary.danger > 0) {
      showToast('warning', '📊 적정성 위험', `STEP ⑤ 납기 예정일 적정성 판단: ${data.summary.danger}건 위험`);
    }
  }
}

async function autoRun() {
  if (state.isAutoRunning) return;
  
  state.isAutoRunning = true;
  state.stepStatus = Array(8).fill('pending');
  state.stepData = {};
  renderStepper();
  
  const autoRunBtn = document.getElementById('auto-run-btn');
  if (autoRunBtn) {
    autoRunBtn.disabled = true;
    autoRunBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>실행 중...';
  }
  
  for (let i = 0; i < steps.length; i++) {
    const success = await executeStep(i);
    if (!success) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  state.isAutoRunning = false;
  if (autoRunBtn) {
    autoRunBtn.disabled = false;
    autoRunBtn.innerHTML = '<i class="fas fa-play mr-2"></i>자동실행';
  }
  
  showToast('success', '처리 완료', '모든 단계가 성공적으로 완료되었습니다.');
}

function resetSteps() {
  state.currentStep = 0;
  state.stepStatus = Array(8).fill('pending');
  state.stepData = {};
  state.isAutoRunning = false;
  renderStepper();
  renderContent();
}

function selectStep(stepIndex) {
  if (state.isAutoRunning) return;
  state.currentStep = stepIndex;
  
  if (state.stepStatus[stepIndex] === 'pending') {
    executeStep(stepIndex);
  } else {
    renderContent();
  }
  renderStepper();
}

// Render functions
function renderStepper() {
  const stepper = document.getElementById('stepper');
  if (!stepper) return;
  
  stepper.innerHTML = steps.map((step, index) => {
    const status = state.stepStatus[index];
    const isActive = state.currentStep === index;
    const isLast = index === steps.length - 1;
    
    let statusIcon, statusClass, bgClass;
    switch (status) {
      case 'completed':
        statusIcon = '<i class="fas fa-check"></i>';
        statusClass = 'text-white';
        bgClass = 'bg-green-500';
        break;
      case 'processing':
        statusIcon = '<i class="fas fa-sync-alt spin-slow"></i>';
        statusClass = 'text-white';
        bgClass = 'bg-blue-500 pulse-ring';
        break;
      case 'error':
        statusIcon = '<i class="fas fa-exclamation"></i>';
        statusClass = 'text-white';
        bgClass = 'bg-red-500';
        break;
      default:
        statusIcon = `<i class="fas ${step.icon}"></i>`;
        statusClass = 'text-gray-400';
        bgClass = 'bg-gray-200';
    }
    
    return `
      <div class="flex items-center ${isLast ? '' : 'flex-1'}">
        <div class="relative flex flex-col items-center cursor-pointer group" onclick="selectStep(${index})">
          <div class="w-12 h-12 rounded-full ${bgClass} ${statusClass} flex items-center justify-center text-lg transition-all duration-300 ${isActive ? 'ring-4 ring-blue-200' : ''} group-hover:scale-110">
            ${statusIcon}
          </div>
          <div class="mt-2 text-center max-w-[80px]">
            <div class="text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-600'} leading-tight">${step.shortName}</div>
            <div class="text-xs ${status === 'completed' ? 'text-green-500' : status === 'processing' ? 'text-blue-500' : 'text-gray-400'}">
              ${status === 'completed' ? '완료' : status === 'processing' ? '진행중' : status === 'error' ? '오류' : '대기'}
            </div>
          </div>
        </div>
        ${!isLast ? `
          <div class="flex-1 h-1 mx-2 rounded ${state.stepStatus[index] === 'completed' ? 'bg-green-500' : state.stepStatus[index] === 'processing' ? 'bg-blue-300' : 'bg-gray-200'} transition-all duration-500"></div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function renderContent() {
  const content = document.getElementById('content');
  if (!content) return;
  
  const stepIndex = state.currentStep;
  const status = state.stepStatus[stepIndex];
  const data = state.stepData[stepIndex];
  
  if (status === 'processing') {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center h-96">
        <div class="relative">
          <div class="w-24 h-24 border-4 border-blue-200 rounded-full"></div>
          <div class="absolute top-0 left-0 w-24 h-24 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <i class="fas fa-robot text-3xl text-blue-500"></i>
          </div>
        </div>
        <p class="mt-6 text-lg font-medium text-gray-700">AI Agent 작업 중...</p>
        <p class="mt-2 text-sm text-gray-500">${steps[stepIndex].name} 단계를 처리하고 있습니다</p>
        <div class="mt-4 w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-blue-500 rounded-full animate-pulse" style="width: 60%"></div>
        </div>
      </div>
    `;
    return;
  }
  
  if (status === 'pending') {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center h-96 text-gray-400">
        <i class="fas fa-hand-pointer text-6xl mb-4"></i>
        <p class="text-lg">단계를 선택하거나 자동실행을 클릭하세요</p>
        <div class="mt-6 bg-blue-50 rounded-lg p-4 max-w-md">
          <h4 class="font-medium text-blue-800 mb-2">📋 용어 정의</h4>
          <ul class="text-sm text-blue-700 space-y-1">
            ${Object.entries(terminology).map(([term, def]) => `
              <li><strong>${term}</strong>: ${def}</li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    return;
  }
  
  // Render based on step
  switch (stepIndex) {
    case 0: renderStep1(data); break;
    case 1: renderStep2(data); break;
    case 2: renderStep3(data); break;
    case 3: renderStep4(data); break;
    case 4: renderStep5(data); break;
    case 5: renderStep6(data); break;
    case 6: renderStep7(data); break;
    case 7: renderStep8(data); break;
  }
}

// PRD v2 STEP 1: 납기관리 Tracking 포맷 생성
function renderStep1(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  // 원본 엑셀 컬럼 순서 유지
  const excelColumns = ['구분', '발주업체명', '호선', '구매오더', '구매항목', '자재번호', '자재내역', 'LEAD TIME', '발주일', 'PND', '변경된 PND', 'PND 변경', '계약납기일', '보급요청신청일', '보급요청일', '자재구분'];
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-file-excel mr-2 text-green-500"></i>
          STEP ① 납기관리 Tracking 포맷 생성
        </h2>
        <div class="flex items-center gap-2">
          <span class="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
            <i class="fas fa-check mr-1"></i> 추출 완료
          </span>
          <button class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
            <i class="fas fa-download mr-1"></i> Excel 다운로드
          </button>
        </div>
      </div>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-yellow-500 mt-1"></i>
          <div>
            <p class="font-medium text-yellow-800">📋 원본 엑셀 포맷 유지</p>
            <p class="text-sm text-yellow-700 mt-1">추출된 데이터는 원본 엑셀 컬럼 순서와 컬럼명을 그대로 유지합니다.</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm">총 추출 건수</p>
              <p class="text-3xl font-bold mt-1">${summary.totalCount}</p>
            </div>
            <i class="fas fa-file-alt text-4xl text-blue-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-purple-100 text-sm">협력사 수</p>
              <p class="text-3xl font-bold mt-1">${summary.supplierCount}</p>
            </div>
            <i class="fas fa-building text-4xl text-purple-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm">일반 자재</p>
              <p class="text-3xl font-bold mt-1">${summary.byCategory['일반'] || 0}</p>
            </div>
            <i class="fas fa-cube text-4xl text-green-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-100 text-sm">대형 자재</p>
              <p class="text-3xl font-bold mt-1">${summary.byCategory['대형'] || 0}</p>
            </div>
            <i class="fas fa-cubes text-4xl text-orange-300"></i>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-white rounded-xl shadow-sm border p-5">
          <h3 class="font-semibold text-gray-700 mb-4">
            <i class="fas fa-building mr-2 text-purple-500"></i>
            협력사별 현황
          </h3>
          <div class="space-y-3 max-h-64 overflow-y-auto">
            ${Object.entries(summary.bySupplier).sort((a, b) => b[1] - a[1]).map(([supplier, count]) => `
              <div class="flex items-center justify-between py-2 border-b last:border-0">
                <span class="text-sm text-gray-600">${supplier}</span>
                <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">${count}건</span>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm border p-5">
          <h3 class="font-semibold text-gray-700 mb-4">
            <i class="fas fa-tags mr-2 text-green-500"></i>
            자재구분별 현황
          </h3>
          <div class="space-y-3">
            ${Object.entries(summary.byMaterialType).map(([type, count]) => `
              <div class="flex items-center justify-between py-2">
                <span class="text-sm text-gray-600">${type}</span>
                <div class="flex items-center gap-2">
                  <div class="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div class="h-full bg-green-500 rounded-full" style="width: ${(count / summary.totalCount * 100).toFixed(0)}%"></div>
                  </div>
                  <span class="text-sm font-medium text-gray-700 w-12 text-right">${count}건</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-table mr-2 text-green-500"></i>
            Tracking 포맷 데이터 (${data.data.length}건) - 원본 컬럼 순서 유지
          </h3>
          <input type="text" id="search-step1" placeholder="검색..." class="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" onkeyup="filterTable(1)">
        </div>
        <div class="overflow-x-auto max-h-96 scrollbar-thin">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                ${excelColumns.map(col => `<th class="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">${col}</th>`).join('')}
              </tr>
            </thead>
            <tbody id="table-body-step1">
              ${data.data.map(row => `
                <tr class="data-row border-b hover:bg-blue-50 transition-colors">
                  <td class="px-3 py-2">
                    <span class="px-2 py-1 ${row['구분'] === '대형' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} rounded text-xs">${row['구분']}</span>
                  </td>
                  <td class="px-3 py-2 font-medium">${row['발주업체명']}</td>
                  <td class="px-3 py-2">${row['호선']}</td>
                  <td class="px-3 py-2 font-mono text-xs">${row['구매오더']}</td>
                  <td class="px-3 py-2">${row['구매항목']}</td>
                  <td class="px-3 py-2 font-mono text-xs">${row['자재번호']}</td>
                  <td class="px-3 py-2 max-w-xs truncate" title="${row['자재내역']}">${row['자재내역']}</td>
                  <td class="px-3 py-2">${row['LEAD TIME']}일</td>
                  <td class="px-3 py-2">${formatDate(row['발주일'])}</td>
                  <td class="px-3 py-2">${formatDate(row['PND'])}</td>
                  <td class="px-3 py-2">${formatDate(row['변경된 PND'])}</td>
                  <td class="px-3 py-2">${formatDate(row['PND 변경'])}</td>
                  <td class="px-3 py-2">${formatDate(row['계약납기일'])}</td>
                  <td class="px-3 py-2">${formatDate(row['보급요청신청일'])}</td>
                  <td class="px-3 py-2">${formatDate(row['보급요청일'])}</td>
                  <td class="px-3 py-2">${row['자재구분'] || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderStep2(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  const total = summary.danger + summary.warning + summary.normal;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-check-circle mr-2 text-green-500"></i>
          STEP ② 계약 납기일 검증
        </h2>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-calculator text-blue-500 mt-1"></i>
          <div>
            <p class="font-medium text-blue-800">검증 기준: 발주일 + Lead Time vs 계약납기일</p>
            <ul class="text-sm text-blue-700 mt-1 space-y-1">
              <li><span class="font-bold text-red-600">🔴 지연</span>: 예상완료일 > 계약납기일</li>
              <li><span class="font-bold text-yellow-600">🟡 주의</span>: 여유 2일 이내</li>
              <li><span class="font-bold text-green-600">🟢 양호</span>: 여유 2일 초과</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-red-50 border border-red-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow" onclick="filterByStatus(2, 'danger')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-600 text-sm font-medium">🔴 지연</p>
              <p class="text-4xl font-bold text-red-700 mt-1">${summary.danger}</p>
              <p class="text-sm text-red-500 mt-1">${((summary.danger / total) * 100).toFixed(0)}%</p>
            </div>
            <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <i class="fas fa-exclamation-triangle text-2xl text-red-500"></i>
            </div>
          </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow" onclick="filterByStatus(2, 'warning')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-yellow-600 text-sm font-medium">🟡 주의</p>
              <p class="text-4xl font-bold text-yellow-700 mt-1">${summary.warning}</p>
              <p class="text-sm text-yellow-500 mt-1">${((summary.warning / total) * 100).toFixed(0)}%</p>
            </div>
            <div class="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <i class="fas fa-exclamation-circle text-2xl text-yellow-500"></i>
            </div>
          </div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-xl p-5 cursor-pointer hover:shadow-md transition-shadow" onclick="filterByStatus(2, 'normal')">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-600 text-sm font-medium">🟢 양호</p>
              <p class="text-4xl font-bold text-green-700 mt-1">${summary.normal}</p>
              <p class="text-sm text-green-500 mt-1">${((summary.normal / total) * 100).toFixed(0)}%</p>
            </div>
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <i class="fas fa-check-circle text-2xl text-green-500"></i>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-semibold text-gray-700 mb-4">
          <i class="fas fa-chart-pie mr-2 text-blue-500"></i>
          검증 결과 분포
        </h3>
        <div class="flex items-center gap-8">
          <div class="relative w-40 h-40">
            <canvas id="chart-step2"></canvas>
          </div>
          <div class="flex-1">
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-red-500"></span>
                <span class="text-sm text-gray-600">🔴 지연 - 납기 지연 예상</span>
                <span class="font-bold text-red-600">${summary.danger}건</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-yellow-500"></span>
                <span class="text-sm text-gray-600">🟡 주의 - 여유 2일 이내</span>
                <span class="font-bold text-yellow-600">${summary.warning}건</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="w-4 h-4 rounded-full bg-green-500"></span>
                <span class="text-sm text-gray-600">🟢 양호 - 여유 있음</span>
                <span class="font-bold text-green-600">${summary.normal}건</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-list mr-2 text-red-500"></i>
            검증 결과 상세
          </h3>
          <div class="flex gap-2">
            <button onclick="filterByStatus(2, 'all')" class="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">전체</button>
            <button onclick="filterByStatus(2, 'danger')" class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200">🔴 지연</button>
            <button onclick="filterByStatus(2, 'warning')" class="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200">🟡 주의</button>
          </div>
        </div>
        <div class="overflow-x-auto max-h-96 scrollbar-thin">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">자재번호</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">협력사</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">발주일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">L/T</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">예상완료일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">계약납기일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">차이</th>
              </tr>
            </thead>
            <tbody id="table-body-step2">
              ${data.data.sort((a, b) => a.daysDiff - b.daysDiff).map(row => `
                <tr class="data-row border-b hover:bg-blue-50 transition-colors" data-status="${row.status}">
                  <td class="px-4 py-3">${getStatusBadge(row.status)}</td>
                  <td class="px-4 py-3 font-mono text-xs">${row['자재번호']}</td>
                  <td class="px-4 py-3">${row['발주업체명']}</td>
                  <td class="px-4 py-3">${formatDate(row['발주일'])}</td>
                  <td class="px-4 py-3">${row['LEAD TIME']}일</td>
                  <td class="px-4 py-3">${row.expectedDate}</td>
                  <td class="px-4 py-3">${formatDate(row['계약납기일'])}</td>
                  <td class="px-4 py-3">
                    <span class="${row.daysDiff < 0 ? 'text-red-600 font-bold' : row.daysDiff <= 2 ? 'text-yellow-600' : 'text-green-600'}">
                      ${row.daysDiff}일
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
  
  // Render chart
  setTimeout(() => {
    const ctx = document.getElementById('chart-step2');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['🔴 지연', '🟡 주의', '🟢 양호'],
          datasets: [{
            data: [summary.danger, summary.warning, summary.normal],
            backgroundColor: ['#ef4444', '#f59e0b', '#22c55e'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '60%'
        }
      });
    }
  }, 100);
}

function renderStep3(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-calendar-alt mr-2 text-orange-500"></i>
          STEP ③ PND 변경 사항 검토
        </h2>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-500 mt-1"></i>
          <div>
            <p class="font-medium text-blue-800">📅 PND (계획 납기일)</p>
            <p class="text-sm text-blue-700 mt-1">설계팀이 정한 생산에 필요한 자재 도착 기한입니다. 변경 시 생산 일정에 영향을 미칩니다.</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-100 text-sm">총 변경 건수</p>
              <p class="text-3xl font-bold mt-1">${summary.totalChanges}</p>
            </div>
            <i class="fas fa-exchange-alt text-4xl text-orange-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-100 text-sm">📉 앞당겨짐</p>
              <p class="text-3xl font-bold mt-1">${summary.earlier}</p>
            </div>
            <i class="fas fa-arrow-up text-4xl text-red-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-blue-100 text-sm">📈 늦춰짐</p>
              <p class="text-3xl font-bold mt-1">${summary.later}</p>
            </div>
            <i class="fas fa-arrow-down text-4xl text-blue-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-100 text-sm">➡️ 변경 없음</p>
              <p class="text-3xl font-bold mt-1">${summary.noChange}</p>
            </div>
            <i class="fas fa-minus text-4xl text-gray-300"></i>
          </div>
        </div>
      </div>
      
      ${data.data.length > 0 ? `
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-history mr-2 text-orange-500"></i>
            PND 변경 이력
          </h3>
        </div>
        <div class="p-4 space-y-4 max-h-96 overflow-y-auto">
          ${data.data.map(item => `
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow ${item.direction === 'earlier' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-blue-500'}">
              <div class="flex justify-between items-start">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-medium">${item['자재번호']}</span>
                    <span class="px-2 py-0.5 ${item.direction === 'earlier' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} rounded text-xs">
                      ${item.direction === 'earlier' ? '📉 앞당겨짐' : '📈 늦춰짐'}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 mt-1">${item['자재내역']}</p>
                  <p class="text-sm text-gray-400 mt-1">협력사: ${item['발주업체명']}</p>
                </div>
                <div class="text-right">
                  <p class="text-lg font-bold ${item.direction === 'earlier' ? 'text-red-600' : 'text-blue-600'}">
                    ${Math.abs(item.daysDiff)}일 ${item.direction === 'earlier' ? '앞당겨짐' : '늦춰짐'}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">변경일: ${item['PND 변경']}</p>
                </div>
              </div>
              <div class="mt-3 flex items-center gap-4 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">기존 PND:</span>
                  <span class="font-medium">${item['PND']}</span>
                </div>
                <i class="fas fa-arrow-right text-gray-400"></i>
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">변경 PND:</span>
                  <span class="font-medium text-orange-600">${item['변경된 PND']}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : `
      <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
        <p class="text-lg font-medium text-green-700">PND 변경 사항이 없습니다</p>
      </div>
      `}
    </div>
  `;
}

function renderStep4(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-box mr-2 text-purple-500"></i>
          STEP ④ 보급 요청일 검토
        </h2>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-500 mt-1"></i>
          <div>
            <p class="font-medium text-blue-800">📦 보급요청일</p>
            <p class="text-sm text-blue-700 mt-1">생산팀이 요청한 자재 필요일입니다. PND와는 별개로 관리됩니다.</p>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-100 text-sm">✅ 요청 있음</p>
              <p class="text-3xl font-bold mt-1">${summary.withRequest}</p>
            </div>
            <i class="fas fa-check-square text-4xl text-green-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-100 text-sm">⬜ 요청 없음</p>
              <p class="text-3xl font-bold mt-1">${summary.withoutRequest}</p>
            </div>
            <i class="fas fa-square text-4xl text-gray-300"></i>
          </div>
        </div>
        <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-100 text-sm">🚨 긴급 요청</p>
              <p class="text-3xl font-bold mt-1">${summary.urgent}</p>
            </div>
            <i class="fas fa-exclamation-circle text-4xl text-red-300"></i>
          </div>
        </div>
      </div>
      
      ${data.urgentItems.length > 0 ? `
      <div class="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 class="font-semibold text-red-700 mb-4 flex items-center">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          🚨 긴급 보급 요청 (${data.urgentItems.length}건)
        </h3>
        <div class="space-y-3">
          ${data.urgentItems.map(item => `
            <div class="bg-white rounded-lg p-4 border border-red-200">
              <div class="flex justify-between items-center">
                <div>
                  <span class="font-mono text-sm font-medium">${item['자재번호']}</span>
                  <span class="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">긴급</span>
                </div>
                <span class="text-sm text-gray-500">호선: ${item['호선']}</span>
              </div>
              <p class="text-sm text-gray-600 mt-1">${item['자재내역']}</p>
              <div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>요청자: ${item['요청자명'] || '-'}</span>
                <span>연락처: ${item['연락처'] || '-'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <h3 class="font-semibold text-gray-700 mb-4">
          <i class="fas fa-chart-bar mr-2 text-purple-500"></i>
          보급 요청 현황 차트
        </h3>
        <div class="h-64">
          <canvas id="chart-step4"></canvas>
        </div>
      </div>
    </div>
  `;
  
  setTimeout(() => {
    const ctx = document.getElementById('chart-step4');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['✅ 요청 있음', '⬜ 요청 없음', '🚨 긴급 요청'],
          datasets: [{
            label: '건수',
            data: [summary.withRequest, summary.withoutRequest, summary.urgent],
            backgroundColor: ['#22c55e', '#9ca3af', '#ef4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  }, 100);
}

function renderStep5(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-chart-pie mr-2 text-indigo-500"></i>
          STEP ⑤ 납기 예정일 적정성 판단
        </h2>
      </div>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-yellow-500 mt-1"></i>
          <div>
            <p class="font-medium text-yellow-800">📊 적정성 판단 기준 (계약납기일 vs 보급요청일)</p>
            <ul class="text-sm text-yellow-700 mt-1 space-y-1">
              <li><span class="font-bold text-red-600">🔴 지연</span>: 계약납기일 > 보급요청일 (보급 불가능)</li>
              <li><span class="font-bold text-yellow-600">🟡 주의</span>: 보급요청일 - 계약납기일 ≤ 2일 (촉박)</li>
              <li><span class="font-bold text-green-600">🟢 양호</span>: 보급요청일 - 계약납기일 > 2일 (여유)</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-red-50 border border-red-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-600 text-sm font-medium">🔴 지연</p>
              <p class="text-3xl font-bold text-red-700 mt-1">${summary.danger}</p>
            </div>
            <i class="fas fa-times-circle text-3xl text-red-400"></i>
          </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-yellow-600 text-sm font-medium">🟡 주의</p>
              <p class="text-3xl font-bold text-yellow-700 mt-1">${summary.warning}</p>
            </div>
            <i class="fas fa-exclamation-circle text-3xl text-yellow-400"></i>
          </div>
        </div>
        <div class="bg-green-50 border border-green-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-600 text-sm font-medium">🟢 양호</p>
              <p class="text-3xl font-bold text-green-700 mt-1">${summary.normal}</p>
            </div>
            <i class="fas fa-check-circle text-3xl text-green-400"></i>
          </div>
        </div>
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">⬜ 미정</p>
              <p class="text-3xl font-bold text-gray-700 mt-1">${summary.unknown}</p>
            </div>
            <i class="fas fa-question-circle text-3xl text-gray-400"></i>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-list mr-2 text-indigo-500"></i>
            적정성 분석 결과
          </h3>
        </div>
        <div class="overflow-x-auto max-h-96 scrollbar-thin">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">자재번호</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">협력사</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">계약납기일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">보급요청일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">차이</th>
              </tr>
            </thead>
            <tbody>
              ${data.data.filter(r => r.status !== 'unknown').sort((a, b) => a.daysDiff - b.daysDiff).map(row => `
                <tr class="data-row border-b hover:bg-blue-50 transition-colors">
                  <td class="px-4 py-3">${getStatusBadge(row.status)}</td>
                  <td class="px-4 py-3 font-mono text-xs">${row['자재번호']}</td>
                  <td class="px-4 py-3">${row['발주업체명']}</td>
                  <td class="px-4 py-3">${formatDate(row['계약납기일'])}</td>
                  <td class="px-4 py-3">${formatDate(row['보급요청일'])}</td>
                  <td class="px-4 py-3">
                    <span class="${row.daysDiff < 0 ? 'text-red-600 font-bold' : row.daysDiff <= 2 ? 'text-yellow-600' : 'text-green-600'}">
                      ${row.daysDiff > 0 ? '+' : ''}${row.daysDiff}일
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// PRD v2 STEP 6: 주단위 협력사 납기 예정일 업데이트 요청 (메일 본문 포함)
function renderStep6(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  const progress = Math.round((summary.sent / summary.totalSuppliers) * 100);
  
  // 현재 주차 계산
  const now = new Date();
  const weekNumber = Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7);
  const year = now.getFullYear();
  
  // 금요일 계산
  const friday = new Date(now);
  friday.setDate(now.getDate() + (5 - now.getDay()));
  const fridayStr = `${friday.getMonth() + 1}월 ${friday.getDate()}일 (금)`;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-envelope mr-2 text-blue-500"></i>
          STEP ⑥ 주단위 협력사 납기 예정일 업데이트 요청
        </h2>
        <span class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
          ${year}년 ${weekNumber}주차
        </span>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-500 mt-1"></i>
          <div>
            <p class="font-medium text-blue-800">📧 메일 발송 안내</p>
            <p class="text-sm text-blue-700 mt-1">매주 전체 협력사에 납기 예정일 업데이트 요청 메일을 발송합니다.</p>
            <p class="text-sm text-blue-700">회신 기한: <strong>${fridayStr}</strong></p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">📤 발송 진행률</h3>
          <span class="text-2xl font-bold text-blue-600">${progress}%</span>
        </div>
        <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
        </div>
        <div class="flex justify-between text-sm text-gray-500 mt-2">
          <span>발송 완료: ${summary.sent}개 협력사</span>
          <span>전체: ${summary.totalSuppliers}개 협력사</span>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-50 border border-green-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-600 text-sm font-medium">✅ 발송 완료</p>
              <p class="text-3xl font-bold text-green-700 mt-1">${summary.sent}</p>
            </div>
            <i class="fas fa-paper-plane text-3xl text-green-400"></i>
          </div>
        </div>
        <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-yellow-600 text-sm font-medium">⏳ 대기 중</p>
              <p class="text-3xl font-bold text-yellow-700 mt-1">${summary.pending}</p>
            </div>
            <i class="fas fa-clock text-3xl text-yellow-400"></i>
          </div>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-red-600 text-sm font-medium">❌ 발송 실패</p>
              <p class="text-3xl font-bold text-red-700 mt-1">${summary.failed}</p>
            </div>
            <i class="fas fa-exclamation-triangle text-3xl text-red-400"></i>
          </div>
        </div>
      </div>
      
      <!-- 메일 본문 미리보기 -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-eye mr-2 text-purple-500"></i>
            메일 본문 미리보기
          </h3>
          <button onclick="toggleEmailPreview()" class="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
            <i class="fas fa-expand mr-1"></i>전체 보기
          </button>
        </div>
        <div class="p-5 bg-gray-50 font-mono text-sm">
          <div class="bg-white border rounded-lg p-5 shadow-inner">
            <p class="text-gray-600 mb-4">
              <strong>제목:</strong> [한화오션] 주간 납기 예정일 업데이트 요청 (${year}년 ${weekNumber}주차)
            </p>
            <hr class="my-4">
            <p class="mb-3">안녕하세요, <span class="text-blue-600 font-bold">{협력사명}</span> 담당자님.</p>
            <p class="mb-3">한화오션 SCM팀입니다.</p>
            <p class="mb-4">아래 발주 건에 대한 납기 예정일 업데이트를 요청드립니다.<br>첨부된 양식에 최신 납기 예정일을 기입하여 회신 부탁드립니다.</p>
            
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
              <p class="font-bold text-blue-800 mb-2">■ 요청 사항</p>
              <ul class="text-blue-700 space-y-1">
                <li>• 대상: 귀사 발주 건 전체 (<span class="font-bold">{N}건</span>)</li>
                <li>• 요청 내용: 납기 예정일 업데이트</li>
                <li>• 회신 기한: <span class="font-bold text-red-600">${fridayStr}</span></li>
              </ul>
            </div>
            
            <div class="bg-gray-100 rounded-lg p-4 mb-4">
              <p class="font-bold text-gray-800 mb-2">■ 발주 현황 요약</p>
              <table class="w-full text-xs border-collapse">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2">PO 번호</th>
                    <th class="text-left py-2">호선</th>
                    <th class="text-left py-2">계약납기일</th>
                    <th class="text-left py-2">현재예정일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="border-b"><td class="py-1">4003XXXXXX</td><td>2579</td><td>2025-02-01</td><td>2025-01-28</td></tr>
                  <tr class="border-b"><td class="py-1">4003XXXXXX</td><td>2580</td><td>2025-02-15</td><td>-</td></tr>
                  <tr><td class="py-1 text-gray-500" colspan="4">...</td></tr>
                </tbody>
              </table>
            </div>
            
            <p class="text-sm text-gray-600 mb-3">※ 납기 변동이 예상되는 경우, 사유와 함께 회신 부탁드립니다.</p>
            <p class="mb-1">감사합니다.</p>
            <p class="font-bold">한화오션 SCM팀</p>
            
            <div class="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
              <p class="text-yellow-700 text-xs">
                <i class="fas fa-paperclip mr-1"></i>
                첨부: 납기예정일_회신양식_{협력사명}.xlsx
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-list mr-2 text-blue-500"></i>
            협력사별 메일 발송 현황
          </h3>
        </div>
        <div class="overflow-x-auto max-h-80 scrollbar-thin">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">협력사</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">항목 수</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">상태</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">발송 시간</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">액션</th>
              </tr>
            </thead>
            <tbody>
              ${data.data.map(row => `
                <tr class="data-row border-b hover:bg-blue-50 transition-colors">
                  <td class="px-4 py-3 font-medium">${row.supplier}</td>
                  <td class="px-4 py-3">${row.itemCount}건</td>
                  <td class="px-4 py-3">
                    ${row.status === 'sent' ? '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✅ 발송완료</span>' :
                      row.status === 'pending' ? '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">⏳ 대기중</span>' :
                      '<span class="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">❌ 발송실패</span>'}
                  </td>
                  <td class="px-4 py-3 text-gray-500">${row.sentAt || '-'}</td>
                  <td class="px-4 py-3">
                    ${row.status !== 'sent' ? `
                      <button class="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600">
                        <i class="fas fa-redo mr-1"></i>재발송
                      </button>
                    ` : `
                      <button class="px-3 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300" onclick="showEmailDetail('${row.supplier}')">
                        <i class="fas fa-eye mr-1"></i>미리보기
                      </button>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// PRD v2 STEP 7: 납기 예정일 회신 수집 (협력사 기준 제출률)
function renderStep7(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  // 협력사 수 기준 제출률 재계산
  const totalSuppliers = summary.totalSuppliers || data.data.length;
  const submittedSuppliers = data.data.filter(s => s.submitted).length;
  const submissionRate = Math.round((submittedSuppliers / totalSuppliers) * 100);
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-inbox mr-2 text-teal-500"></i>
          STEP ⑦ 납기 예정일 회신 수집
        </h2>
      </div>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <i class="fas fa-info-circle text-blue-500 mt-1"></i>
          <div>
            <p class="font-medium text-blue-800">📊 제출률 기준</p>
            <p class="text-sm text-blue-700 mt-1">제출률은 <strong>협력사 수</strong> 기준으로 계산됩니다. (자재 건수 X)</p>
          </div>
        </div>
      </div>
      
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold text-gray-700">📊 회신 제출률 (협력사 기준)</h3>
          <span class="text-2xl font-bold text-teal-600">${submissionRate}%</span>
        </div>
        <div class="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-1000" style="width: ${submissionRate}%"></div>
        </div>
        <div class="flex justify-between text-sm text-gray-500 mt-2">
          <span>✅ 제출 완료: ${submittedSuppliers}개 협력사</span>
          <span>⏳ 대기중: ${totalSuppliers - submittedSuppliers}개 협력사</span>
        </div>
        <p class="text-center text-lg font-medium text-teal-700 mt-4">
          📊 제출률: ${submissionRate}% (${submittedSuppliers}/${totalSuppliers}개 협력사)
        </p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-green-50 border border-green-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-green-600 text-sm font-medium">✅ 제출완료</p>
              <p class="text-3xl font-bold text-green-700 mt-1">${submittedSuppliers}</p>
              <p class="text-sm text-green-500">협력사</p>
            </div>
            <i class="fas fa-check-double text-3xl text-green-400"></i>
          </div>
        </div>
        <div class="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-orange-600 text-sm font-medium">⏳ 대기중</p>
              <p class="text-3xl font-bold text-orange-700 mt-1">${totalSuppliers - submittedSuppliers}</p>
              <p class="text-sm text-orange-500">협력사</p>
            </div>
            <i class="fas fa-clock text-3xl text-orange-400"></i>
          </div>
        </div>
      </div>
      
      ${data.pendingReminders && data.pendingReminders.length > 0 ? `
      <div class="bg-orange-50 border border-orange-200 rounded-xl p-5">
        <h3 class="font-semibold text-orange-700 mb-4 flex items-center">
          <i class="fas fa-bell mr-2"></i>
          📧 리마인더 예정 협력사 (${data.pendingReminders.length}개)
        </h3>
        <div class="flex flex-wrap gap-2">
          ${data.pendingReminders.map(item => `
            <span class="px-3 py-1 bg-white border border-orange-200 rounded-full text-sm text-orange-700">${item.supplier}</span>
          `).join('')}
        </div>
        <button class="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
          <i class="fas fa-paper-plane mr-2"></i>리마인더 일괄 발송
        </button>
      </div>
      ` : ''}
      
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gray-50 border-b">
          <h3 class="font-semibold text-gray-700">
            <i class="fas fa-list mr-2 text-teal-500"></i>
            협력사별 회신 현황
          </h3>
        </div>
        <div class="overflow-x-auto max-h-96 scrollbar-thin">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-600">협력사</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">요청일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">회신일</th>
                <th class="px-4 py-3 text-left font-medium text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody>
              ${data.data.map((row, idx) => {
                const requestDate = '01-27';
                const replyDate = row.submitted ? ['01-28', '01-29', '01-28', '01-29', '01-30'][idx % 5] : null;
                return `
                <tr class="data-row border-b hover:bg-blue-50 transition-colors">
                  <td class="px-4 py-3 font-medium">${row.supplier}</td>
                  <td class="px-4 py-3">${requestDate}</td>
                  <td class="px-4 py-3">${replyDate || '-'}</td>
                  <td class="px-4 py-3">
                    ${row.submitted ? 
                      '<span class="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">✅ 제출완료</span>' :
                      '<span class="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">⏳ 대기중</span>'}
                  </td>
                </tr>
              `}).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// PRD v2 STEP 8: 비교 분석 (2개 하위 섹션 분리)
function renderStep8(data) {
  const content = document.getElementById('content');
  const summary = data.summary;
  
  // 자재별 변동 현황 데이터 생성
  const scheduleChanges = data.data.filter(item => 
    item['2547주입고예정일'] || item['2548주입고예정일'] || item['2549주입고예정일']
  ).map(item => {
    const first = item['2547주입고예정일'];
    const second = item['2548주입고예정일'];
    const third = item['2549주입고예정일'];
    
    let trend = '➡️ 변동없음';
    let daysDiff = 0;
    
    if (first && third) {
      const firstDate = new Date(first);
      const thirdDate = new Date(third);
      daysDiff = Math.floor((thirdDate - firstDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 0) trend = `📈 +${daysDiff}일 지연`;
      else if (daysDiff < 0) trend = `📉 ${daysDiff}일 단축`;
    } else if (first && second && !third) {
      const firstDate = new Date(first);
      const secondDate = new Date(second);
      daysDiff = Math.floor((secondDate - firstDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0) trend = `📈 +${daysDiff}일 지연`;
      else if (daysDiff < 0) trend = `📉 ${daysDiff}일 단축`;
    }
    
    return { ...item, trend, daysDiff };
  });
  
  const delayedCount = scheduleChanges.filter(i => i.daysDiff > 0).length;
  const shortenedCount = scheduleChanges.filter(i => i.daysDiff < 0).length;
  const unchangedCount = scheduleChanges.filter(i => i.daysDiff === 0).length;
  
  // 적정성 판단 데이터 (3차 납기예정일 vs 보급요청일)
  const appropriatenessData = data.data.filter(item => 
    item['2549주입고예정일'] && item['보급요청일']
  ).map(item => {
    const thirdDate = new Date(item['2549주입고예정일']);
    const supplyDate = new Date(item['보급요청일']);
    const daysDiff = Math.floor((supplyDate - thirdDate) / (1000 * 60 * 60 * 24));
    
    let status = 'normal';
    if (daysDiff < 0) status = 'danger';
    else if (daysDiff <= 2) status = 'warning';
    
    return { ...item, daysDiff, status };
  });
  
  const goodCount = appropriatenessData.filter(i => i.status === 'normal').length;
  const cautionCount = appropriatenessData.filter(i => i.status === 'warning').length;
  const delayCount = appropriatenessData.filter(i => i.status === 'danger').length;
  const totalAppropriateness = appropriatenessData.length || 1;
  
  content.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-gray-800">
          <i class="fas fa-chart-line mr-2 text-purple-500"></i>
          STEP ⑧ 비교 분석
        </h2>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
          <p class="text-blue-100 text-sm">총 항목</p>
          <p class="text-3xl font-bold mt-1">${summary.totalItems}</p>
        </div>
        <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white">
          <p class="text-red-100 text-sm">지연</p>
          <p class="text-3xl font-bold mt-1">${summary.delayed}</p>
        </div>
        <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-5 text-white">
          <p class="text-yellow-100 text-sm">주의</p>
          <p class="text-3xl font-bold mt-1">${summary.caution}</p>
        </div>
        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
          <p class="text-purple-100 text-sm">결품</p>
          <p class="text-3xl font-bold mt-1">${summary.shortage}</p>
        </div>
        <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
          <p class="text-orange-100 text-sm">일정 변동</p>
          <p class="text-3xl font-bold mt-1">${summary.withScheduleChanges}</p>
        </div>
      </div>
      
      <!-- 5.1 자재별 협력사 납기 예정일 변동 현황 -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <h3 class="font-semibold text-gray-700 flex items-center">
            <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs mr-2">5.1</span>
            <i class="fas fa-chart-area mr-2 text-blue-500"></i>
            자재별 협력사 납기 예정일 변동 현황
          </h3>
          <p class="text-sm text-gray-500 mt-1">협력사 회신 (1차→2차→3차) 일정 변동 추이</p>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="text-center p-3 bg-red-50 rounded-lg">
              <p class="text-red-600 text-sm">📈 지연</p>
              <p class="text-2xl font-bold text-red-700">${delayedCount}건</p>
            </div>
            <div class="text-center p-3 bg-green-50 rounded-lg">
              <p class="text-green-600 text-sm">📉 단축</p>
              <p class="text-2xl font-bold text-green-700">${shortenedCount}건</p>
            </div>
            <div class="text-center p-3 bg-gray-50 rounded-lg">
              <p class="text-gray-600 text-sm">➡️ 변동없음</p>
              <p class="text-2xl font-bold text-gray-700">${unchangedCount}건</p>
            </div>
          </div>
          
          <div class="overflow-x-auto max-h-64 scrollbar-thin">
            <table class="w-full text-sm">
              <thead class="bg-gray-100 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">자재번호</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">1차(2547)</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">2차(2548)</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">3차(2549)</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">변동 추이</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleChanges.slice(0, 10).map(item => `
                  <tr class="border-b hover:bg-blue-50">
                    <td class="px-3 py-2 font-mono text-xs">${item['자재번호']}</td>
                    <td class="px-3 py-2">${formatDate(item['2547주입고예정일'])}</td>
                    <td class="px-3 py-2">${formatDate(item['2548주입고예정일'])}</td>
                    <td class="px-3 py-2">${formatDate(item['2549주입고예정일'])}</td>
                    <td class="px-3 py-2 ${item.daysDiff > 0 ? 'text-red-600' : item.daysDiff < 0 ? 'text-green-600' : 'text-gray-600'} font-medium">
                      ${item.trend}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <p class="text-sm text-gray-500 mt-3 text-center">
            요약: 총 ${summary.totalItems}건 중 일정 변동 ${scheduleChanges.length}건 (${Math.round(scheduleChanges.length / summary.totalItems * 100)}%)
          </p>
        </div>
      </div>
      
      <!-- 5.2 납기 적정성 판단 (협력사 납기예정일 vs 보급요청일) -->
      <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div class="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <h3 class="font-semibold text-gray-700 flex items-center">
            <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs mr-2">5.2</span>
            <i class="fas fa-balance-scale mr-2 text-purple-500"></i>
            납기 적정성 판단 (3차 납기예정일 vs 보급요청일)
          </h3>
        </div>
        <div class="p-4">
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <p class="font-medium text-gray-700 mb-2">📋 판단 기준</p>
            <div class="grid grid-cols-3 gap-3 text-sm">
              <div class="bg-green-100 rounded p-2 text-center">
                <span class="text-green-700 font-bold">🟢 양호</span>
                <p class="text-xs text-green-600 mt-1">3차 예정일이 보급요청일보다 2일 이상 빠름</p>
              </div>
              <div class="bg-yellow-100 rounded p-2 text-center">
                <span class="text-yellow-700 font-bold">🟡 주의</span>
                <p class="text-xs text-yellow-600 mt-1">3차 예정일이 보급요청일과 같거나 2일 이내 빠름</p>
              </div>
              <div class="bg-red-100 rounded p-2 text-center">
                <span class="text-red-700 font-bold">🔴 지연</span>
                <p class="text-xs text-red-600 mt-1">3차 예정일이 보급요청일보다 느림</p>
              </div>
            </div>
          </div>
          
          <!-- 적정성 분포 차트 -->
          <div class="bg-white border rounded-lg p-4 mb-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-gray-700">분석 결과 분포</span>
            </div>
            <div class="flex h-8 rounded-full overflow-hidden">
              <div class="bg-green-500 flex items-center justify-center text-white text-xs font-bold" style="width: ${goodCount/totalAppropriateness*100}%">
                ${goodCount}건
              </div>
              <div class="bg-yellow-500 flex items-center justify-center text-white text-xs font-bold" style="width: ${cautionCount/totalAppropriateness*100}%">
                ${cautionCount}건
              </div>
              <div class="bg-red-500 flex items-center justify-center text-white text-xs font-bold" style="width: ${delayCount/totalAppropriateness*100}%">
                ${delayCount}건
              </div>
            </div>
            <div class="flex justify-between text-xs mt-2 text-gray-500">
              <span>🟢 양호 ${goodCount}건 (${Math.round(goodCount/totalAppropriateness*100)}%)</span>
              <span>🟡 주의 ${cautionCount}건 (${Math.round(cautionCount/totalAppropriateness*100)}%)</span>
              <span>🔴 지연 ${delayCount}건 (${Math.round(delayCount/totalAppropriateness*100)}%)</span>
            </div>
          </div>
          
          <div class="overflow-x-auto max-h-64 scrollbar-thin">
            <table class="w-full text-sm">
              <thead class="bg-gray-100 sticky top-0">
                <tr>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">자재번호</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">3차예정일</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">보급요청일</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">차이</th>
                  <th class="px-3 py-2 text-left font-medium text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody>
                ${appropriatenessData.sort((a, b) => a.daysDiff - b.daysDiff).slice(0, 10).map(item => `
                  <tr class="border-b hover:bg-blue-50">
                    <td class="px-3 py-2 font-mono text-xs">${item['자재번호']}</td>
                    <td class="px-3 py-2">${formatDate(item['2549주입고예정일'])}</td>
                    <td class="px-3 py-2">${formatDate(item['보급요청일'])}</td>
                    <td class="px-3 py-2 ${item.daysDiff < 0 ? 'text-red-600 font-bold' : item.daysDiff <= 2 ? 'text-yellow-600' : 'text-green-600'}">
                      ${item.daysDiff > 0 ? '+' : ''}${item.daysDiff}일
                    </td>
                    <td class="px-3 py-2">${getStatusBadge(item.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      ${data.riskItems && data.riskItems.length > 0 ? `
      <div class="bg-red-50 border border-red-200 rounded-xl p-5">
        <h3 class="font-semibold text-red-700 mb-4 flex items-center">
          <i class="fas fa-exclamation-triangle mr-2"></i>
          🚨 위험 항목 알림 (${data.riskItems.length}건)
        </h3>
        <div class="space-y-3 max-h-64 overflow-y-auto">
          ${data.riskItems.slice(0, 5).map(item => `
            <div class="bg-white rounded-lg p-4 border ${item.riskLevel === 'critical' ? 'border-red-300' : 'border-orange-300'}">
              <div class="flex justify-between items-start">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-sm font-medium">${item['자재번호']}</span>
                    <span class="px-2 py-0.5 ${item.riskLevel === 'critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} rounded text-xs">
                      ${item.riskLevel === 'critical' ? '결품' : '지연'}
                    </span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">${item['자재내역']}</p>
                  <p class="text-sm text-gray-500">협력사: ${item['발주업체명']}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-500">호선: ${item['호선']}</p>
                </div>
              </div>
              <div class="mt-3 p-2 bg-blue-50 rounded text-sm text-blue-700">
                <i class="fas fa-lightbulb mr-1"></i>
                권장 조치: ${item.recommendation}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      <div class="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <i class="fas fa-check-circle text-5xl text-green-500 mb-4"></i>
        <p class="text-xl font-bold text-green-700">모든 프로세스 분석 완료</p>
        <p class="text-sm text-green-600 mt-2">AI Agent가 납기 관리 분석을 성공적으로 완료했습니다.</p>
      </div>
    </div>
  `;
}

// Filter functions
function filterTable(stepIndex) {
  const input = document.getElementById(`search-step${stepIndex}`);
  const filter = input.value.toLowerCase();
  const tbody = document.getElementById(`table-body-step${stepIndex}`);
  const rows = tbody.getElementsByClassName('data-row');
  
  for (let row of rows) {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  }
}

function filterByStatus(stepIndex, status) {
  const tbody = document.getElementById(`table-body-step${stepIndex}`);
  const rows = tbody.getElementsByClassName('data-row');
  
  for (let row of rows) {
    if (status === 'all') {
      row.style.display = '';
    } else {
      row.style.display = row.dataset.status === status ? '' : 'none';
    }
  }
}

function toggleEmailPreview() {
  showToast('info', '메일 미리보기', '전체 메일 내용은 발송 전 확인 가능합니다.');
}

function showEmailDetail(supplier) {
  showToast('info', `${supplier} 메일 확인`, '발송된 메일 내용을 확인합니다.');
}

// Main render function
function render() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen">
      <!-- Header -->
      <header class="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div class="max-w-7xl mx-auto px-4 py-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <i class="fas fa-robot text-xl"></i>
              </div>
              <div>
                <h1 class="text-xl font-bold">한화오션 SCM 납기관리 AI Agent</h1>
                <p class="text-blue-200 text-sm">상선 SCM팀 납기 관리 자동화 시스템 v2.0</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="relative" id="alert-panel-container">
                <button onclick="toggleAlertPanel()" class="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <i class="fas fa-bell text-xl"></i>
                  <span id="alert-badge" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center alert-badge hidden">0</span>
                </button>
                <div id="alert-panel" class="hidden"></div>
              </div>
              <button id="auto-run-btn" onclick="autoRun()" class="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center gap-2">
                <i class="fas fa-play"></i>
                자동실행
              </button>
              <button onclick="resetSteps()" class="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors flex items-center gap-2">
                <i class="fas fa-redo"></i>
                초기화
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <!-- Stepper -->
      <div class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div id="stepper" class="flex items-center justify-between"></div>
        </div>
      </div>
      
      <!-- Content -->
      <main class="max-w-7xl mx-auto px-4 py-6">
        <div id="content" class="bg-white rounded-xl shadow-sm border p-6 min-h-[500px]"></div>
      </main>
      
      <!-- Toast Container -->
      <div id="toast-container" class="fixed bottom-4 right-4 z-50"></div>
      
      <!-- Alert Modal -->
      <div id="alert-modal" class="hidden"></div>
      
      <!-- Footer -->
      <footer class="bg-gray-100 border-t mt-8">
        <div class="max-w-7xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          <p>한화오션 SCM 납기관리 AI Agent &copy; 2025 | Demo Version 2.0 (PRD v2)</p>
        </div>
      </footer>
    </div>
  `;
  
  renderStepper();
  renderContent();
  loadAlerts();
}

// Initialize
document.addEventListener('DOMContentLoaded', render);
