// 사내정보센터 · 이용안내 목업 데이터.

import type { Faq, InfoCategory, Me } from '../types/portal'

export const infoCategories: InfoCategory[] = [
  {
    id: 'rules',
    title: '규정 및 지침',
    description: '취업규칙, 보안 · 경비 규정 등 회사 운영 기준',
    icon: 'file',
    documents: [
      { id: 'r-1', title: '취업규칙 (2026 개정)', updated: '2026-03-02', url: '#/info/rules' },
      { id: 'r-2', title: '정보보안 지침', updated: '2026-07-15', url: '#/info/rules' },
      { id: 'r-3', title: '경비 집행 규정', updated: '2026-01-10', url: '#/info/rules' },
    ],
  },
  {
    id: 'manuals',
    title: '업무 매뉴얼',
    description: '사내 시스템 사용법과 업무 처리 절차',
    icon: 'book',
    documents: [
      { id: 'm-1', title: '회사 계정 · OTP 등록 방법', updated: '2026-09-29', url: '#/guide' },
      { id: 'm-2', title: '연구노트 작성 가이드', updated: '2026-10-29', url: '#/info/manuals' },
      { id: 'm-3', title: '자산 반출 · 반납 절차', updated: '2026-05-20', url: '#/info/manuals' },
    ],
  },
  {
    id: 'welfare',
    title: '복지 · 제도 안내',
    description: '휴가, 경조사, 교육 지원 등 복지 제도',
    icon: 'gift',
    documents: [
      { id: 'w-1', title: '연차 · 반차 사용 안내', updated: '2026-02-01', url: '#/info/welfare' },
      { id: 'w-2', title: '경조사 지원 기준', updated: '2026-04-11', url: '#/info/welfare' },
      { id: 'w-3', title: '외부 교육비 지원 신청', updated: '2026-06-03', url: '#/info/welfare' },
    ],
  },
  {
    id: 'forms',
    title: '업무 서식함',
    description: '품의서, 출장 신청서 등 공통 서식',
    icon: 'folder',
    documents: [
      { id: 'f-1', title: '품의서 양식', updated: '2026-01-05', url: '#/info/forms' },
      { id: 'f-2', title: '국내 · 해외 출장 신청서', updated: '2026-01-05', url: '#/info/forms' },
      { id: 'f-3', title: '비품 구매 요청서', updated: '2026-08-21', url: '#/info/forms' },
    ],
  },
  {
    id: 'org',
    title: '조직도',
    description: '부서 구성과 담당 업무',
    icon: 'org',
    documents: [
      { id: 'o-1', title: '2026 하반기 조직도', updated: '2026-07-01', url: '#/info/org' },
      { id: 'o-2', title: '부서별 담당 업무 · 연락처', updated: '2026-09-15', url: '#/info/org' },
    ],
  },
]

export const faqs: Faq[] = [
  {
    id: 'faq-1',
    question: '포털에 보이지 않는 서비스가 있어요.',
    answer:
      '포털은 회사 계정의 역할에 따라 쓸 수 있는 서비스만 보여줍니다. 부서가 지정되지 않았거나 권한이 없으면 일부 서비스가 숨겨집니다. 관리팀에 권한을 요청해 주세요.',
  },
  {
    id: 'faq-2',
    question: '비밀번호나 OTP 를 바꾸고 싶어요.',
    answer: '오른쪽 위 이름을 눌러 "계정 설정"으로 들어가면 비밀번호, OTP, 패스키(지문)를 관리할 수 있습니다.',
  },
  {
    id: 'faq-3',
    question: '로그아웃하면 다른 서비스도 로그아웃되나요?',
    answer: '네. 포털의 로그아웃은 회사 계정(SSO) 세션까지 끊기 때문에 다른 사내 서비스도 다시 로그인해야 합니다.',
  },
  {
    id: 'faq-4',
    question: '"개별 로그인" 표시가 있는 서비스는 무엇인가요?',
    answer: '아직 회사 계정 통합 로그인으로 전환하지 않은 서비스입니다. 해당 서비스의 계정으로 따로 로그인해야 합니다.',
  },
  {
    id: 'faq-5',
    question: '자주 쓰는 서비스를 위로 올릴 수 있나요?',
    answer: '서비스 카드의 별 표시를 누르면 즐겨찾기에 추가되어 목록 맨 앞에 보입니다. 이 설정은 지금 쓰는 브라우저에 저장됩니다.',
  },
]

/** 로컬 개발(vite)에서는 Edge 함수가 돌지 않아 /api/auth/me 가 없다. 그때 쓰는 사용자. */
export const mockMe: Me = {
  signedIn: true,
  name: '김지현',
  email: 'jihyun.kim@dvi-ind.com',
  department: '연구개발팀',
  realm: ['employee'],
  svc: { jagigo: ['user'], 'hi-yo': ['user'] },
}
