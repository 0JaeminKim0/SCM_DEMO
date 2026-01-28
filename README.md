# 한화오션 SCM 납기관리 AI Agent

## Project Overview
- **Name**: 한화오션 SCM 납기관리 AI Agent
- **Goal**: SCM팀의 납기 관리 업무를 AI Agent 기반으로 자동화
- **Version**: v1.0 (Demo)
- **Demo Date**: 2025년 1월 29일

## URLs
- **Production**: https://3000-in60o5ejp7qkpb3soafrw-ad490db5.sandbox.novita.ai
- **API Base**: /api

## Features

### 8단계 프로세스 자동화
1. **PO 추출** (📥) - GCOPS에서 PO 정보 추출 및 표준화 Sheet 생성
2. **납기 검증** (✓) - 발주일 + L/T 기반 계약납기 적정성 판단
3. **PND 변경** (📅) - PND 변경 이력 추적 및 알림
4. **보급 요청** (📦) - 생산팀 보급 요청 자동 수신 및 업데이트
5. **적정성 판단** (📊) - 계약납기 vs 보급요청일 비교 분석
6. **메일 발송** (📧) - 공급사 납기 확인 요청 메일 자동 발송
7. **회신 수집** (📬) - 공급사 납기 회신 수집 및 통합
8. **비교 분석** (📈) - 납기 변동 추이 분석 및 위험 알림

### UI/UX 기능
- 프로세스 스텝퍼 (8단계 시각화)
- 자동실행 모드 (순차 진행)
- 수동 탐색 모드 (단계별 클릭)
- 알림 센터 (실시간 알림)
- 토스트 알림 (이벤트 알림)
- 신호등 시스템 (🔴🟡🟢)
- Chart.js 기반 데이터 시각화

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/data | 전체 PO 데이터 조회 |
| GET /api/step1/po-extract | PO 정보 추출 |
| GET /api/step2/delivery-validation | 계약 납기 검증 |
| GET /api/step3/pnd-changes | PND 변경 사항 |
| GET /api/step4/supply-requests | 보급 요청 현황 |
| GET /api/step5/appropriateness | 적정성 판단 |
| GET /api/step6/email-status | 메일 발송 현황 |
| GET /api/step7/response-collection | 회신 수집 현황 |
| GET /api/step8/comparison-analysis | 비교 분석 |
| GET /api/alerts | 알림 목록 |

## Data Models

### PO Data Schema
| Field | Type | Description |
|-------|------|-------------|
| 구분 | Text | 자재 구분 (일반/대형) |
| 발주업체명 | Text | 공급사명 |
| 호선 | Number | 선박 호선 번호 |
| 구매오더 | Number | PO 번호 |
| 자재번호 | Text | 자재 고유번호 |
| LEAD TIME | Number | 리드타임 (일) |
| 발주일 | Date | PO 발주일 |
| PND | Date | Production Need Date |
| 변경된 PND | Date | 설계팀 변경 PND |
| 계약납기일 | Date | 계약상 납기일 |
| 보급요청일 | Date | 실제 보급 요청일 |
| 지연구분 | Text | 지연 여부 |
| 결품구분 | Text | 결품 여부 |

### Status Types
- 🔴 **위험 (danger)**: 납기 지연 위험
- 🟡 **주의 (warning)**: 모니터링 필요
- 🟢 **정상 (normal)**: 문제 없음

## Tech Stack
- **Backend**: Hono (TypeScript)
- **Frontend**: Vanilla JS + Tailwind CSS
- **Charts**: Chart.js
- **Icons**: Font Awesome
- **Platform**: Cloudflare Pages

## Project Structure
```
webapp/
├── src/
│   ├── index.tsx      # Hono API routes
│   └── data.ts        # PO data (50 records)
├── public/
│   └── static/
│       └── app.js     # Frontend JavaScript
├── dist/              # Build output
├── ecosystem.config.cjs # PM2 configuration
├── wrangler.jsonc     # Cloudflare configuration
└── package.json
```

## User Guide

### 자동실행 모드
1. 화면 상단의 "자동실행" 버튼 클릭
2. 8단계가 순차적으로 자동 실행됨
3. 각 단계에서 AI Agent가 데이터 분석 수행
4. 완료 시 모든 단계에 ✅ 표시

### 수동 탐색 모드
1. 프로세스 스텝퍼에서 원하는 단계 클릭
2. 해당 단계의 결과 화면 즉시 표시
3. 상세 데이터 확인 및 필터링 가능

### 알림 확인
1. 우측 상단 🔔 아이콘 클릭
2. 알림 목록에서 상세 내용 확인
3. 권장 조치 확인 및 처리

## Deployment
- **Platform**: Cloudflare Pages
- **Status**: ✅ Active (Development)
- **Last Updated**: 2025-01-28

## Expected Benefits
| Metric | Before | After |
|--------|--------|-------|
| PO 정보 정리 시간 | 2시간/일 | 10분/일 |
| 납기 검증 시간 | 30분/건 | 자동화 |
| PND 변경 감지 | 수동 확인 | 실시간 알림 |
| 공급사 연락 시간 | 1시간/일 | 5분/일 |
| 납기 위험 인지 | 사후 인지 | 사전 예측 |

---

*한화오션 상선 SCM팀 납기관리 AI Agent Demo v1.0*
