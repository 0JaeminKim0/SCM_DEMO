# 한화오션 SCM 납기관리 AI Agent

## 프로젝트 개요
- **Name**: Hanwha Ocean SCM Delivery Management AI Agent
- **Version**: 1.0.0 (Demo)
- **Goal**: SCM 납기관리 업무 자동화 - PO 정보 추출부터 공급사 회신 분석까지 8단계 프로세스 자동화
- **Platform**: Railway (Node.js + Hono)

## 주요 기능 (8단계 프로세스)

| 단계 | 기능 | 설명 |
|------|------|------|
| 1 | PO 추출 | 50건 발주 데이터 추출 및 요약 통계 |
| 2 | 납기 검증 | 발주일 + Lead Time 기반 위험/주의/정상 분류 |
| 3 | PND 변경 | PND 변경 이력 17건 추적 및 분석 |
| 4 | 보급 요청 | 32건 보급 요청 현황 및 긴급 요청 식별 |
| 5 | 적정성 판단 | 계약납기 vs 보급요청일 비교 분석 |
| 6 | 메일 발송 | 26개 공급사 메일 발송 현황 |
| 7 | 회신 수집 | 65% 제출률, 미제출 공급사 알림 |
| 8 | 비교 분석 | 납기 변동 및 위험 항목 최종 분석 |

## URL & Repository

- **GitHub**: https://github.com/0JaeminKim0/SCM_DEMO
- **Local Dev**: http://localhost:3000

## API Endpoints

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/` | GET | 메인 대시보드 |
| `/api/data` | GET | 전체 PO 데이터 |
| `/api/step1/po-extract` | GET | PO 추출 결과 |
| `/api/step2/delivery-validation` | GET | 납기 검증 결과 |
| `/api/step3/pnd-changes` | GET | PND 변경 현황 |
| `/api/step4/supply-requests` | GET | 보급 요청 현황 |
| `/api/step5/appropriateness` | GET | 적정성 판단 결과 |
| `/api/step6/email-status` | GET | 메일 발송 현황 |
| `/api/step7/response-collection` | GET | 회신 수집 현황 |
| `/api/step8/comparison-analysis` | GET | 비교 분석 결과 |
| `/api/alerts` | GET | 실시간 알림 목록 |

## 데이터 모델

### POData Interface
```typescript
interface POData {
  구분: string;              // 일반/대형
  발주업체명: string;        // 공급사명
  호선: number;              // 선박 번호
  구매오더: number;          // PO 번호
  자재번호: string;          // 자재 코드
  자재내역: string;          // 자재 설명
  'LEAD TIME': number;       // 리드타임 (일)
  발주일: string;            // 발주 날짜
  PND: string;               // 계획 납기일
  '변경된 PND': string | null;
  계약납기일: string | null;
  보급요청일: string | null;
  지연구분: string | null;   // 지연/주의/null
  결품구분: string | null;   // 결품/null
  // ... 기타 38개 필드
}
```

## 기술 스택

- **Backend**: Hono (Node.js)
- **Frontend**: Vanilla JS + Tailwind CSS
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Language**: TypeScript

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (tsx watch)
npm run dev

# 빌드
npm run build

# 프로덕션 실행
npm start

# 빌드 + 실행
npm run preview
```

## Railway 배포

1. GitHub 저장소 연결
2. Railway에서 자동 감지 (Node.js)
3. 환경변수 설정:
   - `PORT`: Railway 자동 설정
   - `NODE_ENV`: production

### 배포 설정 파일
- `railway.json`: Railway 빌드/배포 설정
- `Procfile`: 프로세스 정의
- `nixpacks.toml`: Nixpacks 빌드 설정

## 프로젝트 구조

```
webapp/
├── src/
│   ├── server.ts      # Node.js 서버 진입점
│   ├── index.tsx      # Hono 라우터 및 API
│   └── data.ts        # PO 데이터 (50건)
├── public/
│   └── static/
│       ├── app.js     # 프론트엔드 JavaScript
│       └── style.css  # 커스텀 스타일
├── dist/              # 빌드 출력
├── railway.json       # Railway 설정
├── Procfile          # 프로세스 정의
├── nixpacks.toml     # Nixpacks 설정
├── package.json      
├── tsconfig.json     
└── README.md
```

## UI/UX 특징

- **8단계 스텝퍼**: 시각적 프로세스 진행 표시
- **자동 실행 모드**: 순차적 단계 자동 실행
- **수동 탐색 모드**: 개별 단계 클릭 탐색
- **알림 센터**: 실시간 알림 (납기 지연, PND 변경, 긴급 요청)
- **신호등 시스템**: 🔴 위험 / 🟡 주의 / 🟢 정상
- **토스트 알림**: 단계 완료 시 피드백

## 변경 이력

- **v1.0.0** (2025-01-28): Railway 배포용으로 변환
  - Cloudflare Pages → Railway (Node.js)
  - Vite → TypeScript 직접 컴파일
  - 서버 사이드 static file serving 추가

## 라이선스

MIT License

---

**개발**: Hanwha Ocean SCM Team  
**데모 날짜**: 2025-01-29
