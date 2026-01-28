# 한화오션 SCM 납기관리 AI Agent

## 프로젝트 개요
- **Name**: Hanwha Ocean SCM Delivery Management AI Agent
- **Version**: 2.0.0 (Demo - PRD v2)
- **Goal**: SCM 납기관리 업무 자동화 - PO 정보 추출부터 공급사 회신 분석까지 8단계 프로세스 자동화
- **Platform**: Railway (Node.js + Hono)

## 주요 기능 (8단계 프로세스) - PRD v2

| 단계 | 프로세스명 | 설명 |
|------|-----------|------|
| ① | 납기관리 Tracking 포맷 생성 | 50건 데이터 추출 (원본 엑셀 포맷 유지) |
| ② | 계약 납기일 검증 | 발주일 + Lead Time vs 계약납기일 비교 |
| ③ | PND 변경 사항 검토 | PND 변경 이력 추적 및 분석 |
| ④ | 보급 요청일 검토 | 보급 요청 현황 및 긴급 요청 식별 |
| ⑤ | 납기 예정일 적정성 판단 | 계약납기일 vs 보급요청일 비교 분석 |
| ⑥ | 주단위 협력사 납기 예정일 업데이트 요청 | 매주 전체 협력사 메일 발송 |
| ⑦ | 납기 예정일 회신 수집 | 협력사 기준 제출률 관리 |
| ⑧ | 비교 분석 | 5.1 변동현황 + 5.2 적정성판단 |

## URL & Repository

- **GitHub**: https://github.com/0JaeminKim0/SCM_DEMO
- **Local Dev**: http://localhost:3000

## 용어 정의 (PRD v2)

| 용어 | 설명 |
|------|------|
| **PND** | 설계팀이 정한 생산에 필요한 자재 도착 기한 |
| **보급요청일** | 생산팀이 요청한 자재 필요일 (PND와 별개) |
| **계약납기일** | 계약서상 납기일 (고정값) |
| **협력사 납기예정일** | 협력사가 회신한 실제 납품 예정일 |
| **2547주/2548주/2549주** | 협력사 납기예정일 1차/2차/3차 (주차 기준) |

## API Endpoints

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/` | GET | 메인 대시보드 |
| `/api/data` | GET | 전체 PO 데이터 |
| `/api/step1/po-extract` | GET | 납기관리 Tracking 포맷 생성 |
| `/api/step2/delivery-validation` | GET | 계약 납기일 검증 |
| `/api/step3/pnd-changes` | GET | PND 변경 사항 검토 |
| `/api/step4/supply-requests` | GET | 보급 요청일 검토 |
| `/api/step5/appropriateness` | GET | 납기 예정일 적정성 판단 |
| `/api/step6/email-status` | GET | 협력사 메일 발송 현황 |
| `/api/step7/response-collection` | GET | 납기 예정일 회신 수집 |
| `/api/step8/comparison-analysis` | GET | 비교 분석 |
| `/api/alerts` | GET | 실시간 알림 목록 |

## PRD v2 주요 변경사항

### 1. 프로세스명 변경
- PO 추출 → 납기관리 Tracking 포맷 생성
- 납기 검증 → 계약 납기일 검증
- 보급 요청 → 보급 요청일 검토
- 적정성 판단 → 납기 예정일 적정성 판단
- 메일 발송 → 주단위 협력사 납기 예정일 업데이트 요청
- 회신 수집 → 납기 예정일 회신 수집

### 2. STEP ① 엑셀 포맷 유지
- 원본 엑셀 컬럼 순서, 컬럼명 변경 불가

### 3. STEP ⑥ 메일 본문 추가
- 요청 사항, 발주 현황 요약, 회신 기한 포함
- 첨부 파일: 납기예정일_회신양식_{협력사명}.xlsx

### 4. STEP ⑦ 제출률 기준 변경
- 자재 건수 → 협력사 수 기준
- 음수 표기 → "⏳ 대기중" 또는 "✅ 제출완료"

### 5. STEP ⑧ 하위 섹션 분리
- 5.1 자재별 협력사 납기 예정일 변동 현황
- 5.2 납기 적정성 판단 (3차 납기예정일 vs 보급요청일)

### 6. 알림 센터 프로세스명 연동
- 각 알림에 해당 STEP 명칭 표시

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
│       ├── app.js     # 프론트엔드 JavaScript (PRD v2)
│       └── style.css  # 커스텀 스타일
├── dist/              # 빌드 출력
├── railway.json       # Railway 설정
├── Procfile          # 프로세스 정의
├── nixpacks.toml     # Nixpacks 설정
├── package.json      
├── tsconfig.json     
└── README.md
```

## 변경 이력

- **v2.0.0** (2025-01-28): PRD v2 반영
  - 8단계 프로세스명 변경
  - STEP ⑥ 메일 본문 내용 추가
  - STEP ⑦ 협력사 기준 제출률
  - STEP ⑧ 5.1/5.2 섹션 분리
  - 알림 센터 프로세스명 연동
  - 용어 정의 추가

- **v1.0.0** (2025-01-28): Railway 배포용으로 변환
  - Cloudflare Pages → Railway (Node.js)
  - Vite → TypeScript 직접 컴파일

## 라이선스

MIT License

---

**개발**: Hanwha Ocean SCM Team  
**데모 날짜**: 2025-01-29
