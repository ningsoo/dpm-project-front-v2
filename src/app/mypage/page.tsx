'use client';

import { Suspense, useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { KeyRound, UserCog, Plus, Search, Pencil, Heart, X, Check, Unplug, Fingerprint, UserCircle } from 'lucide-react';
import { AppDispatch, RootState } from '@/store';
import { authApi } from '@/api/authApi';
import { mypageApi } from '@/api/mypageApi';
import { preparePayment } from '@/api/creditApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { clearAuth } from '@/store/slices/authSlice';
import { PasswordVerifyModal } from './PasswordVerifyModal';
import { SettlementSection } from './components/SettlementSection';
import { DonationSection } from './components/DonationSection';
import PopSection from './components/PopSection';
import { MyPageYouTubeSection } from './components/MyPageYouTubeSection';
import { MyPostsSection } from './components/MyPostsSection';
import { MyCommentsSection } from './components/MyCommentsSection';
import { MyPostLikesSection } from './components/MyPostLikesSection';
import defaultProfileImg from '@/assets/site/profile.png';
import { useNonce } from '@/contexts/NonceContext';
import styles from './mypage.module.css';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  /** 프로필 이미지 URL (GET /api/mypage/me 응답의 profileUrl) */
  profileUrl?: string | null;
  popBalance?: number;
  passwordless?: boolean;
  youtubeConnected?: boolean;
}

const TABS = [
  { id: 'playlists', label: '플레이리스트' },
  { id: 'posts', label: '내 게시글' },
  { id: 'comments', label: '내 댓글' },
  { id: 'liked', label: '좋아요 한 게시글' },
  { id: 'reports', label: '신고 내역' },
  { id: 'inquiries', label: '문의내역' },
  { id: 'donation', label: '후원' },
  { id: 'settlement', label: '정산' },
  { id: 'pop', label: 'POP' },
] as const;

/** 11자리 연락처를 3-4-4 형식(예: 010-1234-5678)으로 변환해 프로필 렌더링용으로 반환 */
function formatPhone11(phoneNumber: string | undefined): string {
  if (phoneNumber == null || phoneNumber === '') return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length !== 11) return phoneNumber;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

const TAB_IDS = TABS.map((t) => t.id);

function getValidTab(tabParam: string | null): string {
  if (tabParam && TAB_IDS.includes(tabParam as (typeof TAB_IDS)[number])) return tabParam;
  return 'playlists';
}

const PWLS_WITHDRAWAL_GUIDE =
  '패스워드리스 해지가 완료되었습니다.';

const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/** 프로필 이미지 API 에러 메시지 추출. 서버 message가 없거나 axios 기본문구면 fallback 반환 */
function getProfileImageErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  const message = data?.message;
  const trimmed = message != null && String(message).trim() !== '' ? String(message).trim() : '';
  if (!trimmed) return fallback;
  if (/request failed with status code\s*\d+/i.test(trimmed)) return fallback;
  return trimmed;
}

/** POP 충전 1회 한도 (원) */
const PER_CHARGE_LIMIT = 3_000_000;

const PER_CHARGE_LIMIT_MSG = '1회 충전 한도 금액은 300만원입니다.';

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 30일 전 날짜를 YYYY-MM-DD 형식으로 반환 */
function getDate30DaysAgo(): string {
  const today = new Date();
  const past = new Date(today);
  past.setDate(today.getDate() - 30);
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, '0');
  const day = String(past.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function MypagePageContent() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const nonce = useNonce();
  const cropModalId = useId().replace(/:/g, '');
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const [tab, setTab] = useState<string>(() => getValidTab(tabParam));

  /* ── 탭 전환 페이드 애니메이션 ── */
  const [displayedTab, setDisplayedTab] = useState<string>(tab);
  const [tabVisible, setTabVisible] = useState(true);
  const tabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreScrollRef = useRef<{ tab: string; scrollY: number } | null>(null);
  const TAB_FADE_MS = 150;

  const switchTab = useCallback((nextTab: string) => {
    if (nextTab === displayedTab) return;
    setTabVisible(false);
    if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
    tabTimeoutRef.current = setTimeout(() => {
      setDisplayedTab(nextTab);
      requestAnimationFrame(() => {
        setTabVisible(true);
      });
    }, TAB_FADE_MS);
  }, [displayedTab]);

  useEffect(() => {
    switchTab(tab);
  }, [tab, switchTab]);

  useEffect(() => {
    return () => {
      if (tabTimeoutRef.current) clearTimeout(tabTimeoutRef.current);
    };
  }, []);

  /* ── 뒤로가기 시 탭·스크롤 복원 (마운트 시 1회만 읽음) ── */
  useEffect(() => {
    const raw = sessionStorage.getItem('soundock_mypage_return');
    if (!raw) return;
    sessionStorage.removeItem('soundock_mypage_return');
    try {
      const data = JSON.parse(raw) as { tab?: string; scrollY?: number };
      if (data.tab && typeof data.scrollY === 'number' && TAB_IDS.includes(data.tab as (typeof TAB_IDS)[number])) {
        const currentTab = getValidTab(searchParams.get('tab'));
        if (currentTab !== data.tab) {
          router.replace(`/mypage?tab=${data.tab}`);
        }
        restoreScrollRef.current = { tab: data.tab, scrollY: data.scrollY };
      }
    } catch {
      // ignore invalid JSON
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only on mount
  }, []);

  useEffect(() => {
    const pending = restoreScrollRef.current;
    if (!pending || displayedTab !== pending.tab) return;
    restoreScrollRef.current = null;
    const scrollY = pending.scrollY;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    });
  }, [displayedTab]);

  const [searchQuery, setSearchQuery] = useState({ posts: '', comments: '', liked: '' });
  const [dateRange, setDateRange] = useState({
    settlement: { start: getDate30DaysAgo(), end: getTodayDateString() },
    reports: { start: getDate30DaysAgo(), end: getTodayDateString() },
    inquiries: { start: getDate30DaysAgo(), end: getTodayDateString() },
  });
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [showReportCancelModal, setShowReportCancelModal] = useState(false);
  const [showPencilIcon, setShowPencilIcon] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 });
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, size: 0, mouseX: 0, mouseY: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [receivedLikes, setReceivedLikes] = useState(0);
  const [showCreditChargeModal, setShowCreditChargeModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditError, setCreditError] = useState('');
  const creditValidationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [showPasswordVerifyModal, setShowPasswordVerifyModal] = useState(false);
  const [passwordVerifyTarget, setPasswordVerifyTarget] = useState<string | null>(null);
  const [showPwlsWithdrawalModal, setShowPwlsWithdrawalModal] = useState(false);
  const [pwlsWithdrawalLoading, setPwlsWithdrawalLoading] = useState(false);

  // 패스워드리스 등록 모달
  const [pwlsQrModalOpen, setPwlsQrModalOpen] = useState(false);
  const [pwlsRegisterDoneModalOpen, setPwlsRegisterDoneModalOpen] = useState(false);
  const [pwlsQrUrl, setPwlsQrUrl] = useState<string | null>(null);
  const [pwlsTotalSec, setPwlsTotalSec] = useState(180);
  const [pwlsRemainSec, setPwlsRemainSec] = useState(180);
  const [pwlsModalError, setPwlsModalError] = useState<string | null>(null);
  const [pwlsRegisterLoading, setPwlsRegisterLoading] = useState(false);
  const [pwlsServerUrl, setPwlsServerUrl] = useState<string | null>(null);
  const [pwlsRegisterKey, setPwlsRegisterKey] = useState<string | null>(null);
  const [pwlsRegPollingEmail, setPwlsRegPollingEmail] = useState('');
  const pwlsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pwlsRegPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pwlsRegPollingConsecutiveErrorsRef = useRef(0);
  const pwlsRegPollingEmailRef = useRef('');
  const pwlsRegPollStartRef = useRef(0);
  const pwlsRegPollTimeoutSecRef = useRef(180);

  /** GET /api/mypage/me data.profileUrl. null 또는 ''이면 기본 프로필 이미지 표시 */
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  // 문의내역
  const [inquiries, setInquiries] = useState<{ createdAt: string; inquiryType: string; title: string; inquiryStatus: string; inquiryId: number }[]>([]);
  const [inquiryPage, setInquiryPage] = useState(0);
  const [inquiryTotalPages, setInquiryTotalPages] = useState(0);
  const [inquiryLoading, setInquiryLoading] = useState(true);

  // 문의 상세 모달
  const [showInquiryDetailModal, setShowInquiryDetailModal] = useState(false);
  const [inquiryDetail, setInquiryDetail] = useState<{
    title: string;
    inquiryType: string;
    createdAt: string;
    content: string;
    fileUrl?: string;
    isImage?: boolean;
    commentStatus: string;
    adminComment?: string;
    commentCreatedAt?: string;
  } | null>(null);
  const [inquiryDetailLoading, setInquiryDetailLoading] = useState(false);

  /* ── 탭별 섹션 로딩 완료까지 페이지 스켈레톤 유지 (재중복 방지) ── */
  const [sectionLoading, setSectionLoading] = useState(true);

  // URL tab 쿼리와 tab state 동기화 (뒤로가기/링크/새로고침 시)
  useEffect(() => {
    const next = getValidTab(searchParams.get('tab'));
    setTab(next);
  }, [searchParams]);

  // 날짜가 바뀌면 종료일을 오늘로 자동 업데이트
  useEffect(() => {
    const updateEndDates = () => {
      const today = getTodayDateString();
      setDateRange((prev) => ({
        settlement: { ...prev.settlement, end: today },
        reports: { ...prev.reports, end: today },
        inquiries: { ...prev.inquiries, end: today },
      }));
    };
    updateEndDates();
    // 매일 자정에 업데이트하기 위한 interval (1분마다 확인)
    const interval = setInterval(() => {
      updateEndDates();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // 초기화 완료 후 사용자 정보 로드
  const MIN_SKELETON_MS = 350;
  useEffect(() => {
    if (!initialized) return;

    if (!isAuthenticated) {
      if (sessionStorage.getItem('soundock_logout_redirect') === '1') {
        sessionStorage.removeItem('soundock_logout_redirect');
        router.replace('/');
        return;
      }
      router.push('/auth/login');
      return;
    }

    const startTime = Date.now();

    // 사용자 정보 가져오기
    mypageApi.getMypage()
      .then(({ data }) => {
        const userData = data?.data as UserInfo | undefined;
        if (userData) {
          setUser(userData);
          setProfileUrl(userData.profileUrl != null && userData.profileUrl !== '' ? userData.profileUrl : null);
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
          if (sessionStorage.getItem('soundock_logout_redirect') === '1') {
            sessionStorage.removeItem('soundock_logout_redirect');
            router.replace('/');
          } else {
            router.push('/auth/login');
          }
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          if (sessionStorage.getItem('soundock_logout_redirect') === '1') {
            sessionStorage.removeItem('soundock_logout_redirect');
            router.replace('/');
          } else {
            router.push('/auth/login');
          }
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
        }
      })
      .finally(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_SKELETON_MS - elapsed);
        setTimeout(() => {
          setLoading(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setPageReady(true);
            });
          });
        }, remaining);
      });
  }, [initialized, isAuthenticated, router]);

  // 게시글 상세 등에서 "충전하기"로 진입 시 충전 모달 자동 오픈
  useEffect(() => {
    if (searchParams.get('openCharge') === '1') {
      setShowCreditChargeModal(true);
      router.replace('/mypage', { scroll: false });
    }
  }, [searchParams, router]);

  // 신고내역 탭 활성화 시 데이터 fetch (API 미연동 – 스켈레톤만 해제)
  useEffect(() => {
    if (tab !== 'reports' || !isAuthenticated) return;
    setReportsList([]);
    setReportsLoading(false);
  }, [tab, isAuthenticated]);

  // 문의내역 탭 활성화 시 데이터 fetch
  useEffect(() => {
    if (tab !== 'inquiries' || !isAuthenticated) return;
    setInquiryLoading(true);
    const params: { page: number; size: number; startDate?: string; endDate?: string } = { page: inquiryPage, size: 10 };
    if (dateRange.inquiries.start) params.startDate = dateRange.inquiries.start;
    if (dateRange.inquiries.end) params.endDate = dateRange.inquiries.end;
    mypageApi.getInquiries(params)
      .then(({ data }) => {
        const pageData = data?.data as { content?: { createdAt: string; inquiryType: string; title: string; inquiryStatus: string; inquiryId: number }[]; totalPages?: number } | undefined;
        setInquiries(pageData?.content ?? []);
        setInquiryTotalPages(pageData?.totalPages ?? 0);
      })
      .catch(() => {
        ToastUtils.error('문의 내역을 불러올 수 없습니다.');
      })
      .finally(() => {
        setInquiryLoading(false);
      });
  }, [tab, inquiryPage, isAuthenticated]);

  // unmount 시 크레딧 검증 타이머 정리
  useEffect(() => {
    return () => {
      if (creditValidationTimerRef.current) {
        clearTimeout(creditValidationTimerRef.current);
      }
    };
  }, []);

  // 크롭 영역 리사이즈 시 window mousemove/mouseup (항상 동일 훅 순서 유지)
  useEffect(() => {
    if (!isResizing) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;
      // 마우스 이동 델타 계산 (초기 마우스 위치 기준)
      const deltaX = e.clientX - resizeStartRef.current.mouseX;
      const deltaY = e.clientY - resizeStartRef.current.mouseY;
      const delta = Math.max(deltaX, deltaY);
      const newSize = resizeStartRef.current.size + delta;
      const maxSize = Math.min(rect.width, rect.height) * 0.95;
      const maxSizeByX = rect.width - resizeStartRef.current.x;
      const maxSizeByY = rect.height - resizeStartRef.current.y;
      const clampedSize = Math.max(
        80,
        Math.min(maxSize, maxSizeByX, maxSizeByY, Math.round(newSize))
      );
      setCropArea({
        x: resizeStartRef.current.x,
        y: resizeStartRef.current.y,
        size: clampedSize,
      });
    };
    const onMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isResizing]);

  // 크롭 영역 드래그 시 window mousemove/mouseup (영역 밖으로 마우스가 나가도 동작)
  const cropAreaRef = useRef(cropArea);
  cropAreaRef.current = cropArea;
  useEffect(() => {
    if (!isDragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cur = cropAreaRef.current;
      const newX = e.clientX - rect.left - dragStartRef.current.x;
      const newY = e.clientY - rect.top - dragStartRef.current.y;
      const maxX = rect.width - cur.size;
      const maxY = rect.height - cur.size;
      setCropArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      }));
    };
    const onMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const resetPwlsRegisterState = useCallback(() => {
    if (pwlsTimerRef.current) {
      clearInterval(pwlsTimerRef.current);
      pwlsTimerRef.current = null;
    }
    if (pwlsRegPollingRef.current) {
      clearInterval(pwlsRegPollingRef.current);
      pwlsRegPollingRef.current = null;
    }
    setPwlsQrModalOpen(false);
    setPwlsRegisterDoneModalOpen(false);
    setPwlsQrUrl(null);
    setPwlsModalError(null);
    setPwlsRegisterLoading(false);
    setPwlsServerUrl(null);
    setPwlsRegisterKey(null);
    setPwlsRegPollingEmail('');
    pwlsRegPollingEmailRef.current = '';
    pwlsRegPollingConsecutiveErrorsRef.current = 0;
    setPwlsTotalSec(180);
    setPwlsRemainSec(180);
  }, []);

  // ESC 키로 QR 모달 닫기
  useEffect(() => {
    if (!pwlsQrModalOpen && !pwlsRegisterDoneModalOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pwlsRegisterDoneModalOpen) setPwlsRegisterDoneModalOpen(false);
      else resetPwlsRegisterState();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [pwlsQrModalOpen, pwlsRegisterDoneModalOpen, resetPwlsRegisterState]);

  // 등록 완료 폴링
  useEffect(() => {
    if (!pwlsQrModalOpen || !pwlsRegPollingEmail) return;
    const PWLS_REG_POLL_INTERVAL_MS = 2000;
    const isRegistered = (data: unknown): boolean => {
      if (data === true) return true;
      if (data === 'true') return true;
      if (data != null && typeof data === 'object' && 'exist' in data) return (data as { exist?: unknown }).exist === true;
      return false;
    };
    const stopRegPollingAndOpenDone = () => {
      if (pwlsTimerRef.current) { clearInterval(pwlsTimerRef.current); pwlsTimerRef.current = null; }
      if (pwlsRegPollingRef.current) { clearInterval(pwlsRegPollingRef.current); pwlsRegPollingRef.current = null; }
      setPwlsQrModalOpen(false);
      setPwlsRegisterDoneModalOpen(true);
      setPwlsRegPollingEmail('');
      pwlsRegPollingEmailRef.current = '';
    };
    const id = setInterval(async () => {
      const elapsed = (Date.now() - pwlsRegPollStartRef.current) / 1000;
      if (elapsed >= pwlsRegPollTimeoutSecRef.current) {
        if (pwlsRegPollingRef.current) { clearInterval(pwlsRegPollingRef.current); pwlsRegPollingRef.current = null; }
        setPwlsRegPollingEmail('');
        pwlsRegPollingEmailRef.current = '';
        ToastUtils.error('등록 확인 시간이 만료되었습니다');
        return;
      }
      const userId = pwlsRegPollingEmailRef.current;
      if (!userId) return;
      try {
        const data = await authApi.getPasswordlessStatus();
        pwlsRegPollingConsecutiveErrorsRef.current = 0;
        if (isRegistered(data)) stopRegPollingAndOpenDone();
      } catch (err) {
        const status = (err as Error & { status?: number })?.status;
        if (status === 404) {
          if (pwlsRegPollingRef.current) { clearInterval(pwlsRegPollingRef.current); pwlsRegPollingRef.current = null; }
          setPwlsRegPollingEmail('');
          pwlsRegPollingEmailRef.current = '';
          setPwlsQrModalOpen(false);
          if (pwlsTimerRef.current) { clearInterval(pwlsTimerRef.current); pwlsTimerRef.current = null; }
          ToastUtils.error('존재하지 않는 유저입니다.');
        } else if (status === 500) {
          pwlsRegPollingConsecutiveErrorsRef.current += 1;
          if (pwlsRegPollingConsecutiveErrorsRef.current >= 3) {
            if (pwlsRegPollingRef.current) { clearInterval(pwlsRegPollingRef.current); pwlsRegPollingRef.current = null; }
            setPwlsRegPollingEmail('');
            pwlsRegPollingEmailRef.current = '';
            ToastUtils.error('서빙 API 통신 실패');
          }
        } else {
          pwlsRegPollingConsecutiveErrorsRef.current += 1;
        }
      }
    }, PWLS_REG_POLL_INTERVAL_MS);
    pwlsRegPollingRef.current = id;
    return () => { clearInterval(id); pwlsRegPollingRef.current = null; };
  }, [pwlsQrModalOpen, pwlsRegPollingEmail]);

  // 언마운트 시 등록 타이머·폴링 정리
  useEffect(() => {
    return () => {
      if (pwlsTimerRef.current) { clearInterval(pwlsTimerRef.current); pwlsTimerRef.current = null; }
      if (pwlsRegPollingRef.current) { clearInterval(pwlsRegPollingRef.current); pwlsRegPollingRef.current = null; }
    };
  }, []);

  if (!user) {
    if (!initialized || loading) {
      const t = getValidTab(tabParam);
      if (tabParam) {
        const getSkeletonBarWidthClass = (w: string) => {
          const key = `skeletonBarW${(w || '60%').replace('%', '')}`;
          return (styles as Record<string, string>)[key] || styles.skeletonBarW60;
        };
        const skeletonTableRow = (gridClass: string, cols: number, widths: string[]) => (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tableGrid} ${gridClass} ${styles.tableRow}`}>
              {Array.from({ length: cols }).map((__, c) => (
                <div key={c} className={styles.tableCell}>
                  <div className={`${styles.skeletonBar} ${getSkeletonBarWidthClass(widths[c])}`} />
                </div>
              ))}
            </div>
          ))
        );
        const searchBarEl = (
          <div className={styles.searchBarWrap}>
            <input type="text" placeholder="검색어 입력" disabled className={styles.searchInput} />
            <span className={styles.searchInputIcon}><Search size={18} /></span>
          </div>
        );

        const dateRowEl = (
          <div className={styles.dateRow}>
            <input type="date" defaultValue={getDate30DaysAgo()} disabled max={getTodayDateString()} className={styles.dateInput} />
            <span className={styles.dateTilde}>~</span>
            <input type="date" defaultValue={getTodayDateString()} disabled max={getTodayDateString()} className={styles.dateInput} />
            <button type="button" disabled className={styles.filterBtn}>조회</button>
          </div>
        );

        const settlementDateRowEl = (
          <div className={styles.settlementDateRow}>
            <input type="date" defaultValue={getDate30DaysAgo()} disabled max={getTodayDateString()} className={styles.settlementDateInput} />
            <span>~</span>
            <input type="date" defaultValue={getTodayDateString()} disabled max={getTodayDateString()} className={styles.settlementDateInput} />
            <button type="button" className={styles.settlementSearchBtn} disabled>조회</button>
          </div>
        );

        let tabSkeleton: React.ReactNode = null;
        if (t === 'posts') {
          tabSkeleton = (
            <div>
              {searchBarEl}
              <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableHeader}`}>
                  <div>날짜</div><div>게시판</div><div>제목</div><div>조회</div><div>추천</div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
                  </div>
                ))}
              </div></div>
            </div>
          );
        } else if (t === 'comments') {
          tabSkeleton = (
            <div>
              {searchBarEl}
              <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
                  <div>날짜</div><div>게시판</div><div>댓글</div><div>원문 글 제목</div><div>추천</div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
                  </div>
                ))}
              </div></div>
            </div>
          );
        } else if (t === 'liked') {
          tabSkeleton = (
            <div>
              {searchBarEl}
              <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.tableHeader}`}>
                  <div>게시판</div><div>제목</div><div>작성자</div><div>조회</div><div>추천</div>
                </div>
                {skeletonTableRow(styles.likedGrid5, 5, ['70%', '85%', '50%', '40%', '35%'])}
              </div></div>
            </div>
          );
        } else if (t === 'reports') {
          tabSkeleton = (
            <div>
              {dateRowEl}
              <div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableHeader}`}>
                  <div /><div>신고일시</div><div>신고사유</div><div>상태</div><div>글 바로가기</div><div>신고 취소</div>
                </div>
                {skeletonTableRow(styles.reportsGrid, 6, ['16px', '75%', '70%', '55%', '60%', '55%'])}
              </div>
            </div>
          );
        } else if (t === 'inquiries') {
          tabSkeleton = (
            <div>
              {dateRowEl}
              <div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableHeader}`}>
                  <div className={styles.tableHeaderCell}>문의일시</div><div>문의유형</div><div>제목</div><div>상태</div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (t === 'pop') {
          const popSt = searchParams.get('popSubTab');
          const popSub = (popSt === 'usage' || popSt === 'purchase') ? popSt : 'purchase';
          const isUsage = popSub === 'usage';
          tabSkeleton = (
            <div className={styles.popSection}>
              <div className={styles.settlementRequestSummaryBox}>
                <div className={styles.settlementSummaryRow}>
                  <span>보유 POP</span>
                  <span className={styles.settlementTotalAmount}>
                    <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
                  </span>
                </div>
                <button type="button" className={styles.submitBtn} disabled>충전하기</button>
              </div>
              <div className={styles.settlementSubTabs}>
                <button type="button" className={popSub === 'purchase' ? styles.settlementSubTabActive : styles.settlementSubTab}>구매내역{popSub === 'purchase' && <span className={styles.settlementSubTabIndicator} />}</button>
                <button type="button" className={popSub === 'usage' ? styles.settlementSubTabActive : styles.settlementSubTab}>사용내역{popSub === 'usage' && <span className={styles.settlementSubTabIndicator} />}</button>
              </div>
              {settlementDateRowEl}
              <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
                {isUsage ? (
                  <>
                    <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
                      <div>사용일시</div><div>사용수량</div><div>사용대상</div><div>사용내용</div><div>사용상태</div><div>사용취소</div>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableHeader}`}>
                      <div>충전일시</div><div>충전수량</div><div>상세내역</div><div>결제금액</div><div>유효기간</div><div>구매취소</div>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      </div>
                    ))}
                  </>
                )}
              </div></div>
            </div>
          );
        } else if (t === 'donation') {
          const donSt = searchParams.get('donationSubTab');
          const donSub = (donSt === 'sent' || donSt === 'received') ? donSt : 'sent';
          tabSkeleton = (
            <div className={styles.donationSection}>
              <div className={styles.settlementSubTabs}>
                <button type="button" className={donSub === 'sent' ? styles.settlementSubTabActive : styles.settlementSubTab}>보낸내역{donSub === 'sent' && <span className={styles.settlementSubTabIndicator} />}</button>
                <button type="button" className={donSub === 'received' ? styles.settlementSubTabActive : styles.settlementSubTab}>받은내역{donSub === 'received' && <span className={styles.settlementSubTabIndicator} />}</button>
              </div>
              <div className={styles.settlementInnerContent}>
                {settlementDateRowEl}
                <div className={styles.overflowXAuto}>
                  {donSub === 'sent' ? (
                    <>
                      <div className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableHeader}`}>
                        <div>후원일</div><div>요청일</div><div>승인일</div><div>취소일</div><div>금액</div><div>상태</div><div>취소</div><div>수혜자</div>
                      </div>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableRow}`}>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className={`${styles.tableGrid} ${styles.donationReceivedGrid7} ${styles.tableHeader}`}>
                        <div>후원일</div><div>요청일</div><div>확정일</div><div>취소일</div><div>금액</div><div>상태</div><div>후원자</div>
                      </div>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`${styles.tableGrid} ${styles.donationReceivedGrid7} ${styles.tableRow}`}>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                          <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        } else if (t === 'settlement') {
          const stParam = searchParams.get('settlementSubTab');
          const stSub = (stParam === 'history' || stParam === 'register' || stParam === 'request') ? stParam : 'history';
          let settlementContent: React.ReactNode = null;
          if (stSub === 'history') {
            settlementContent = (
              <div className={styles.settlementInnerContent}>
                {settlementDateRowEl}
                <div className={styles.overflowXAuto}>
                  <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                    <div>정산요청일</div><div>정산승인일</div><div>변동 수량</div><div>정산금액</div><div>정산처리상태</div>
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          } else if (stSub === 'register') {
            settlementContent = (
              <div className={styles.settlementInnerContent}>
                <div className={styles.settlementForm}>
                  {['이메일', '이름', '연락처', '계좌번호'].map((label) => (
                    <div key={label} className={styles.settlementField}>
                      <label>{label}</label>
                      <div className={`${styles.skeletonBar} ${styles.skeletonBarPx100H40}`} />
                    </div>
                  ))}
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarPx80H40}`} />
                </div>
              </div>
            );
          } else {
            settlementContent = (
              <div className={styles.settlementInnerContent}>
                <div className={styles.settlementRequestSummaryBox}>
                  <div className={styles.settlementSummaryRow}>
                    <span>정산 가능 금액</span>
                    <span className={styles.settlementTotalAmount}>
                      <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
                    </span>
                  </div>
                  <button type="button" className={styles.submitBtn} disabled>정산요청</button>
                </div>
                <div className={styles.settlementRequestTableWrap}><div className={styles.overflowXAuto}>
                  <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableHeader}`}>
                    <div className={styles.settlementTableHeaderCell}>후원금액</div>
                    <div className={styles.settlementTableHeaderCell}>후원승인일</div>
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                      <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                      <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div></div>
                    </div>
                  ))}
                </div></div>
              </div>
            );
          }
          tabSkeleton = (
            <div className={styles.settlementSection}>
              <div className={styles.settlementSubTabs}>
                {[{ id: 'history', label: '정산 내역' }, { id: 'register', label: '정산 정보 등록' }, { id: 'request', label: '정산 신청' }].map((st) => (
                  <button key={st.id} type="button" className={stSub === st.id ? styles.settlementSubTabActive : styles.settlementSubTab}>
                    {st.label}{stSub === st.id && <span className={styles.settlementSubTabIndicator} />}
                  </button>
                ))}
              </div>
              {settlementContent}
            </div>
          );
        } else if (t === 'playlists') {
          tabSkeleton = (
            <div>
              <div className={styles.flexBetweenMb16}>
                <div className={styles.flexGap8}><div className={styles.skeletonPlaylistActionBtn} /><div className={styles.skeletonPlaylistActionBtn} /></div>
                <div className={styles.flexGap8Min88}>
                  <div className={styles.skeletonCircle} />
                  <div className={styles.skeletonCircle} />
                </div>
              </div>
              <div className={styles.flexGap24Padding}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.skeletonCard} ${styles.skeletonCardThird}`}>
                    <div className={`${styles.skeletonCardThumb} ${styles.skeletonCardThumbH180}`} />
                    <div className={`${styles.skeletonCardBody} ${styles.skeletonCardBodyMin80}`}>
                      <div className={`${styles.skeletonBar} ${styles.skeletonBarW80H16}`} />
                      <div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          tabSkeleton = (
            <div className={styles.skeletonContent}>
              <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW100}`} />
              <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW85}`} />
              <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW92}`} />
            </div>
          );
        }
        return (
          <div className={styles.wrap}>
            <div className={styles.skeletonProfile}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonProfileText}>
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H26}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx200H16}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140H16}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx110H16}`} />
              </div>
            </div>
            <div className={styles.tabs}>
              {TABS.map((tb) => (
                <button key={tb.id} type="button" className={t === tb.id ? styles.tabActive : styles.tab}>
                  {tb.label}
                </button>
              ))}
            </div>
            <div className={styles.content}>{tabSkeleton}</div>
          </div>
        );
      }
      /* tabParam 없으면 플레이리스트 스켈레톤 (playlists와 동일) */
      return (
        <div className={styles.wrap}>
          <div className={styles.skeletonProfile}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonProfileText}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H26}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx200H16}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140H16}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx110H16}`} />
            </div>
          </div>
          <div className={styles.tabs}>
            {TABS.map((tb) => (
              <button key={tb.id} type="button" className={tb.id === 'playlists' ? styles.tabActive : styles.tab}>{tb.label}</button>
            ))}
          </div>
          <div className={styles.content}>
            <div>
              <div className={styles.flexBetweenMb16}>
                <div className={styles.flexGap8}><div className={styles.skeletonPlaylistActionBtn} /><div className={styles.skeletonPlaylistActionBtn} /></div>
                <div className={styles.flexGap8Min88}>
                  <div className={styles.skeletonCircle} />
                  <div className={styles.skeletonCircle} />
                </div>
              </div>
              <div className={styles.flexGap24Padding}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.skeletonCard} ${styles.skeletonCardThird}`}>
                    <div className={`${styles.skeletonCardThumb} ${styles.skeletonCardThumbH180}`} />
                    <div className={`${styles.skeletonCardBody} ${styles.skeletonCardBodyMin80}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80H16}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.wrap}>
        <p>사용자 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const handleSearch = (type: 'posts' | 'comments' | 'liked') => {
    const query = type === 'posts' ? searchQuery.posts : type === 'comments' ? searchQuery.comments : searchQuery.liked;
    if (query.trim()) {
      // TODO: 실제 검색 API 호출
      console.log(`Searching ${type}:`, query);
    }
  };

  const handleDateRangeSearch = async (type: 'settlement' | 'reports') => {
    const range = dateRange[type];
    if (!range.start || !range.end) {
      ToastUtils.error('시작일과 종료일을 모두 선택해 주세요.');
      return;
    }
    if (range.start > range.end) {
      ToastUtils.error('종료일이 시작일보다 빠를 수 없습니다.');
      return;
    }
    if (type === 'reports') {
      // TODO: 신고 API 연동 후 활성화
      setReportsList([]);
      setReportsLoading(false);
    }
  };

  const handleReportCancel = () => {
    if (selectedReports.length === 0) return;
    setShowReportCancelModal(true);
  };

  const handleReportCancelConfirm = () => {
    // TODO: API 호출하여 선택된 신고 취소
    console.log('Cancelling reports:', selectedReports);
    setSelectedReports([]);
    setShowReportCancelModal(false);
  };

  const handlePwlsWithdrawalConfirm = async () => {
    setPwlsWithdrawalLoading(true);
    try {
      await authApi.postPasswordlessWithdrawal();
      try {
        await authApi.logout();
      } catch {
        // 서버 로그아웃 실패해도 로컬 정리 진행
      }
      tokenUtils.clearTokens();
      dispatch(clearAuth());
      ToastUtils.success(PWLS_WITHDRAWAL_GUIDE);
      setShowPwlsWithdrawalModal(false);
      setPwlsWithdrawalLoading(false);
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : '패스워드리스 해지에 실패했습니다.';
      ToastUtils.error(message);
      setShowPwlsWithdrawalModal(false);
      setPwlsWithdrawalLoading(false);
    }
  };

  const startPwlsTimer = () => {
    if (pwlsTimerRef.current) clearInterval(pwlsTimerRef.current);
    const id = setInterval(() => {
      setPwlsRemainSec((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
    pwlsTimerRef.current = id;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      ToastUtils.success('복사되었습니다');
    } catch {
      ToastUtils.error('복사에 실패했습니다');
    }
  };

  const PWLS_REGISTER_TOTAL_SEC = 180;

  const openPwlsRegister = async (email: string) => {
    if (pwlsTimerRef.current) { clearInterval(pwlsTimerRef.current); pwlsTimerRef.current = null; }
    setPwlsQrUrl(null);
    setPwlsModalError(null);
    setPwlsServerUrl(null);
    setPwlsRegisterKey(null);
    setPwlsTotalSec(PWLS_REGISTER_TOTAL_SEC);
    setPwlsRemainSec(PWLS_REGISTER_TOTAL_SEC);
    setPwlsRegisterLoading(true);
    try {
      const res = await authApi.postPasswordlessRegister(email);
      const sec = typeof res.terms === 'number' && res.terms > 0 ? res.terms : 180;
      setPwlsQrUrl(res.qrUrl || null);
      setPwlsServerUrl(res.serverUrl ?? null);
      setPwlsRegisterKey(res.registerKey ?? null);
      setPwlsTotalSec(sec);
      setPwlsRemainSec(sec);
      setPwlsQrModalOpen(true);
      startPwlsTimer();
      pwlsRegPollingEmailRef.current = email;
      pwlsRegPollTimeoutSecRef.current = sec;
      pwlsRegPollStartRef.current = Date.now();
      setPwlsRegPollingEmail(email);
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      const msg = err instanceof Error ? err.message : undefined;
      if (status === 400) ToastUtils.info(msg || '이미 패스워드리스 서비스를 사용 중입니다.');
      else if (status === 404) ToastUtils.error(msg || '존재하지 않는 유저입니다.');
      else if (status === 500) ToastUtils.error(msg || '서빙 API 통신 실패');
      else ToastUtils.error(msg || '등록 요청에 실패했습니다');
    } finally {
      setPwlsRegisterLoading(false);
    }
  };

  const requestPwlsQR = async (email: string) => {
    if (pwlsTimerRef.current) { clearInterval(pwlsTimerRef.current); pwlsTimerRef.current = null; }
    setPwlsModalError(null);
    setPwlsRegisterLoading(true);
    try {
      const res = await authApi.postPasswordlessRegister(email);
      const sec = typeof res.terms === 'number' && res.terms > 0 ? res.terms : 180;
      setPwlsQrUrl(res.qrUrl || null);
      setPwlsServerUrl(res.serverUrl ?? null);
      setPwlsRegisterKey(res.registerKey ?? null);
      setPwlsTotalSec(sec);
      setPwlsRemainSec(sec);
      startPwlsTimer();
      pwlsRegPollingEmailRef.current = email;
      pwlsRegPollTimeoutSecRef.current = sec;
      pwlsRegPollStartRef.current = Date.now();
      setPwlsRegPollingEmail(email);
    } catch (err) {
      const status = (err as Error & { status?: number })?.status;
      const msg = err instanceof Error ? err.message : undefined;
      if (status === 400) { setPwlsQrModalOpen(false); ToastUtils.info(msg || '이미 패스워드리스 서비스를 사용 중입니다.'); }
      else if (status === 404) { setPwlsQrModalOpen(false); ToastUtils.error(msg || '존재하지 않는 유저입니다.'); }
      else if (status === 500) { setPwlsQrModalOpen(false); ToastUtils.error(msg || '서빙 API 통신 실패'); }
      else { setPwlsModalError(msg || 'QR 발급에 실패했습니다'); ToastUtils.error(msg || 'QR 발급에 실패했습니다'); }
    } finally {
      setPwlsRegisterLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      ToastUtils.error('이미지 파일만 선택 가능합니다. (jpg, png, webp, gif)');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string | undefined;
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:')) {
        ToastUtils.error('이미지를 불러올 수 없습니다.');
        return;
      }
      setCropArea({ x: 0, y: 0, size: 0 });
      setSelectedImage(imageUrl);
      setShowImageUpload(false);
      setShowCropModal(true);
    };
    reader.onerror = () => {
      ToastUtils.error('이미지를 읽는 중 오류가 발생했습니다.');
    };
    reader.readAsDataURL(file);
    input.value = '';
  };

  const handleCropConfirm = () => {
    if (!selectedImage || !imageRef.current || profileImageUploading) return;

    const displayWidth = imageRef.current.clientWidth;
    const displayHeight = imageRef.current.clientHeight;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const size = cropArea.size || 200;
      const scaleX = img.width / displayWidth;
      const scaleY = img.height / displayHeight;

      const sourceX = cropArea.x * scaleX;
      const sourceY = cropArea.y * scaleY;
      const sourceW = size * scaleX;
      const sourceH = size * scaleY;

      canvas.width = 200;
      canvas.height = 200;
      ctx.beginPath();
      ctx.arc(100, 100, 100, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceW, sourceH,
        0, 0, 200, 200
      );

      const croppedImageUrl = canvas.toDataURL('image/png');

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            ToastUtils.error('이미지 처리에 실패했습니다.');
            return;
          }
          const file = new File([blob], 'profile.png', { type: 'image/png' });
          const formData = new FormData();
          formData.append('profileImage', file);

          setProfileImageUploading(true);
          mypageApi
            .updateProfileImage(formData)
            .then(async () => {
              ToastUtils.success('프로필 사진이 변경되었습니다.');
              setShowCropModal(false);
              setSelectedImage(null);
              setCropArea({ x: 0, y: 0, size: 0 });
              try {
                const { data } = await mypageApi.getMypage();
                const userData = data?.data as UserInfo | undefined;
                if (userData) {
                  setUser(userData);
                  const nextUrl = userData.profileUrl != null && userData.profileUrl !== '' ? userData.profileUrl : null;
                  setProfileUrl(nextUrl);
                }
              } catch {
                // 갱신 실패해도 업로드는 완료된 상태 유지
              }
            })
            .catch((err) => {
              const msg = getProfileImageErrorMessage(err, '프로필 이미지 변경에 실패했습니다.');
              ToastUtils.error(msg);
            })
            .finally(() => setProfileImageUploading(false));
        },
        'image/png'
      );
    };
    img.src = selectedImage;
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setCropArea({ x: 0, y: 0, size: 0 });
  };

  /** 기본 프로필로 변경: profileImage 없이 PATCH 요청 → 서버가 null로 처리 */
  const handleSetDefaultProfile = () => {
    if (profileImageUploading) return;
    const formData = new FormData();
    setProfileImageUploading(true);
    mypageApi
      .updateProfileImage(formData)
      .then(() => {
        ToastUtils.success('프로필 사진이 변경되었습니다.');
        setProfileUrl(null);
        setShowCropModal(false);
        setSelectedImage(null);
        setCropArea({ x: 0, y: 0, size: 0 });
      })
      .catch((err) => {
        const msg = getProfileImageErrorMessage(err, '기본 프로필로 변경에 실패했습니다.');
        alert(msg);
      })
      .finally(() => setProfileImageUploading(false));
  };

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    const setCropCentered = () => {
      if (!imageRef.current) return;
      const w = imageRef.current.offsetWidth;
      const h = imageRef.current.offsetHeight;
      if (w <= 0 || h <= 0) {
        setTimeout(setCropCentered, 50);
        return;
      }
      const size = Math.min(w, h) * 0.6;
      setCropArea({
        x: (w - size) / 2,
        y: (h - size) / 2,
        size,
      });
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(setCropCentered);
    });
  };

  const CROP_MIN_SIZE = 80;
  const CROP_MAX_SIZE_RATIO = 0.95;

  const handleCropAreaMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || (e.target as HTMLElement).dataset.resizeHandle === 'true') return;
    e.preventDefault();
    setIsDragging(true);
    const rect = imageRef.current.getBoundingClientRect();
    dragStartRef.current = {
      x: e.clientX - rect.left - cropArea.x,
      y: e.clientY - rect.top - cropArea.y,
    };
  };

  const handleResizeHandleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageRef.current) return;
    setIsResizing(true);
    resizeStartRef.current = {
      x: cropArea.x,
      y: cropArea.y,
      size: cropArea.size,
      mouseX: e.clientX,
      mouseY: e.clientY,
    };
  };


  const validateCreditAmount = (value: string): string => {
    if (!value) {
      return '충전할 POP을 입력해 주세요';
    }

    const amount = parseInt(value, 10);
    if (isNaN(amount) || amount < 1000) {
      return '1000원 이상 입력해 주세요';
    }

    if (amount > PER_CHARGE_LIMIT) {
      return PER_CHARGE_LIMIT_MSG;
    }

    if (amount % 100 !== 0) {
      return '100원 단위로 입력해 주세요 (예: 1100)';
    }

    return '';
  };

  const handleCreditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCreditAmount(value);

    // 기존 타이머가 있으면 취소
    if (creditValidationTimerRef.current) {
      clearTimeout(creditValidationTimerRef.current);
    }

    // 입력 중에는 에러 메시지를 즉시 제거하지 않고, 디바운스 후 검증
    // 500ms 후에 검증 실행
    creditValidationTimerRef.current = setTimeout(() => {
      const error = validateCreditAmount(value);
      setCreditError(error);
      if (error === PER_CHARGE_LIMIT_MSG) {
        ToastUtils.error(PER_CHARGE_LIMIT_MSG);
      }
    }, 500);
  };

  const handleCreditAmountClear = () => {
    // 디바운스 타이머가 남아있다면 즉시 clearTimeout
    if (creditValidationTimerRef.current) {
      clearTimeout(creditValidationTimerRef.current);
      creditValidationTimerRef.current = null;
    }

    setCreditAmount('');
    setCreditError('충전할 POP을 입력해 주세요');
  };

  const handleQuickAmountAdd = (addAmount: number) => {
    const currentAmount = creditAmount ? parseInt(creditAmount, 10) : 0;
    const nextAmount = currentAmount + addAmount;
    const nextAmountString = String(nextAmount);
    
    setCreditAmount(nextAmountString);

    // 기존 타이머가 있으면 취소
    if (creditValidationTimerRef.current) {
      clearTimeout(creditValidationTimerRef.current);
    }

    // 버튼 클릭으로 값이 바뀐 뒤에도 500ms 디바운스 검증 흐름이 동일하게 적용
    creditValidationTimerRef.current = setTimeout(() => {
      const error = validateCreditAmount(nextAmountString);
      setCreditError(error);
      if (error === PER_CHARGE_LIMIT_MSG) {
        ToastUtils.error(PER_CHARGE_LIMIT_MSG);
      }
    }, 500);
  };

  const handleCreditPurchase = async () => {
    // 1) 입력 검증
    const error = validateCreditAmount(creditAmount);
    if (error) {
      setCreditError(error);
      if (error === PER_CHARGE_LIMIT_MSG) {
        ToastUtils.error(PER_CHARGE_LIMIT_MSG);
      }
      return;
    }

    const changeAmount = parseInt(creditAmount, 10);
    const amount = changeAmount + Math.floor(changeAmount / 10);

    try {
      // 2) POST /v1/payments/prepare
      const res = await preparePayment(changeAmount, amount);
      const body = res.data;

      if (body?.success === true && body?.data?.orderId) {
        const orderId = body.data.orderId;
        setShowCreditChargeModal(false);
        setCreditError('');
        // 결제창은 전체 페이지 이동. router.push() 시 스크롤 복원 로직이 fixed/sticky 요소와 충돌해 결제창이 안 뜨거나 콘솔 경고 발생.
        const creditUrl = `/mypage/credit?orderId=${encodeURIComponent(orderId)}&changeAmount=${changeAmount}&amount=${amount}`;
        window.location.href = creditUrl;
      } else {
        ToastUtils.error(body?.message ?? '결제 준비에 실패했습니다.');
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      ToastUtils.error(ax?.response?.data?.message ?? '결제 준비에 실패했습니다.');
    }
  };

  const closeModal = () => {
    // 디바운스 타이머가 있다면 정리
    if (creditValidationTimerRef.current) {
      clearTimeout(creditValidationTimerRef.current);
      creditValidationTimerRef.current = null;
    }

    setShowCreditChargeModal(false);
    setCreditAmount('');
    setCreditError('');
  };

  /* pageReady 전까지 스켈레톤 유지 → 하얀 화면 깜빡임 방지 */
  if (!pageReady) {
    const t = getValidTab(tabParam);
    if (tabParam) {
      const getSkeletonBarWidthClass2 = (w: string) => {
        const key = `skeletonBarW${(w || '60%').replace('%', '')}`;
        return (styles as Record<string, string>)[key] || styles.skeletonBarW60;
      };
      const skeletonTableRow = (gridClass: string, cols: number, widths: string[]) =>
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.tableGrid} ${gridClass} ${styles.tableRow}`}>
            {Array.from({ length: cols }).map((__, c) => (
              <div key={c} className={styles.tableCell}>
                <div className={`${styles.skeletonBar} ${getSkeletonBarWidthClass2(widths[c])}`} />
              </div>
            ))}
          </div>
        ));
      const searchBarEl = (
        <div className={styles.searchBarWrap}>
          <input type="text" placeholder="검색어 입력" disabled className={styles.searchInput} />
          <span className={styles.searchInputIcon}><Search size={18} /></span>
        </div>
      );
      const dateRowEl = (
        <div className={styles.dateRow}>
          <input type="date" defaultValue={getDate30DaysAgo()} disabled max={getTodayDateString()} className={styles.dateInput} />
          <span className={styles.dateTilde}>~</span>
          <input type="date" defaultValue={getTodayDateString()} disabled max={getTodayDateString()} className={styles.dateInput} />
          <button type="button" disabled className={styles.filterBtn}>조회</button>
        </div>
      );
      const settlementDateRowEl = (
        <div className={styles.settlementDateRow}>
          <input type="date" defaultValue={getDate30DaysAgo()} disabled max={getTodayDateString()} className={styles.settlementDateInput} />
          <span>~</span>
          <input type="date" defaultValue={getTodayDateString()} disabled max={getTodayDateString()} className={styles.settlementDateInput} />
          <button type="button" className={styles.settlementSearchBtn} disabled>조회</button>
        </div>
      );
      let tabSkeleton: React.ReactNode = null;
      if (t === 'playlists') {
        tabSkeleton = (
          <div>
            <div className={styles.flexBetweenMb16}>
              <div className={styles.flexGap8}><div className={styles.skeletonPlaylistActionBtn} /><div className={styles.skeletonPlaylistActionBtn} /></div>
              <div className={styles.flexGap8Min88}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonCircle} />
              </div>
            </div>
            <div className={styles.flexGap24Padding}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`${styles.skeletonCard} ${styles.skeletonCardThird}`}>
                  <div className={`${styles.skeletonCardThumb} ${styles.skeletonCardThumbH180}`} />
                  <div className={`${styles.skeletonCardBody} ${styles.skeletonCardBodyMin80}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80H16}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                </div>
              ))}
            </div>
          </div>
        );
      } else if (t === 'posts') {
        tabSkeleton = (
          <div>
            {searchBarEl}
            <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
              <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableHeader}`}>
                <div>날짜</div><div>게시판</div><div>제목</div><div>조회</div><div>추천</div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
                </div>
              ))}
            </div></div>
          </div>
        );
      } else if (t === 'comments') {
        tabSkeleton = (
          <div>
            {searchBarEl}
            <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
              <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
                <div>날짜</div><div>게시판</div><div>댓글</div><div>원문 글 제목</div><div>추천</div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
                </div>
              ))}
            </div></div>
          </div>
        );
      } else if (t === 'liked') {
        tabSkeleton = (
          <div>
            {searchBarEl}
            <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
              <div className={`${styles.tableGrid} ${styles.likedGrid5} ${styles.tableHeader}`}>
                <div>게시판</div><div>제목</div><div>작성자</div><div>조회</div><div>추천</div>
              </div>
              {skeletonTableRow(styles.likedGrid5, 5, ['70%', '85%', '50%', '40%', '35%'])}
            </div></div>
          </div>
        );
      } else if (t === 'reports') {
        tabSkeleton = (
          <div>
            {dateRowEl}
            <div className={styles.overflowXAuto}>
              <div className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableHeader}`}>
                <div /><div>신고일시</div><div>신고사유</div><div>상태</div><div>글 바로가기</div><div>신고 취소</div>
              </div>
              {skeletonTableRow(styles.reportsGrid, 6, ['16px', '75%', '70%', '55%', '60%', '55%'])}
            </div>
          </div>
        );
      } else if (t === 'inquiries') {
        tabSkeleton = (
          <div>
            {dateRowEl}
            <div className={styles.overflowXAuto}>
              <div className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableHeader}`}>
                <div className={styles.tableHeaderCell}>문의일시</div><div>문의유형</div><div>제목</div><div>상태</div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                </div>
              ))}
            </div>
          </div>
        );
      } else if (t === 'pop') {
        const popSt = searchParams.get('popSubTab');
        const popSub = (popSt === 'usage' || popSt === 'purchase') ? popSt : 'purchase';
        const isUsage = popSub === 'usage';
        tabSkeleton = (
          <div className={styles.popSection}>
            <div className={styles.settlementRequestSummaryBox}>
              <div className={styles.settlementSummaryRow}>
                <span>보유 POP</span>
                <span className={styles.settlementTotalAmount}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
                </span>
              </div>
              <button type="button" className={styles.submitBtn} disabled>충전하기</button>
            </div>
            <div className={styles.settlementSubTabs}>
              <button type="button" className={popSub === 'purchase' ? styles.settlementSubTabActive : styles.settlementSubTab}>구매내역{popSub === 'purchase' && <span className={styles.settlementSubTabIndicator} />}</button>
              <button type="button" className={popSub === 'usage' ? styles.settlementSubTabActive : styles.settlementSubTab}>사용내역{popSub === 'usage' && <span className={styles.settlementSubTabIndicator} />}</button>
            </div>
            {settlementDateRowEl}
            <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
              {isUsage ? (
                <>
                  <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
                    <div>사용일시</div><div>사용수량</div><div>사용대상</div><div>사용내용</div><div>사용상태</div><div>사용취소</div>
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableHeader}`}>
                    <div>충전일시</div><div>충전수량</div><div>상세내역</div><div>결제금액</div><div>유효기간</div><div>구매취소</div>
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.popPurchaseGrid6} ${styles.tableRow}`}>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                      <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    </div>
                  ))}
                </>
              )}
            </div></div>
          </div>
        );
      } else if (t === 'donation') {
        const donSt = searchParams.get('donationSubTab');
        const donSub = (donSt === 'sent' || donSt === 'received') ? donSt : 'sent';
        tabSkeleton = (
          <div className={styles.donationSection}>
            <div className={styles.settlementSubTabs}>
              <button type="button" className={donSub === 'sent' ? styles.settlementSubTabActive : styles.settlementSubTab}>보낸내역{donSub === 'sent' && <span className={styles.settlementSubTabIndicator} />}</button>
              <button type="button" className={donSub === 'received' ? styles.settlementSubTabActive : styles.settlementSubTab}>받은내역{donSub === 'received' && <span className={styles.settlementSubTabIndicator} />}</button>
            </div>
            <div className={styles.settlementInnerContent}>
              {settlementDateRowEl}
              <div className={styles.overflowXAuto}>
                {donSub === 'sent' ? (
                  <>
                    <div className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableHeader}`}>
                      <div>후원일</div><div>요청일</div><div>승인일</div><div>취소일</div><div>금액</div><div>상태</div><div>취소</div><div>수혜자</div>
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className={`${styles.tableGrid} ${styles.donationReceivedGrid7} ${styles.tableHeader}`}>
                      <div>후원일</div><div>요청일</div><div>확정일</div><div>취소일</div><div>금액</div><div>상태</div><div>후원자</div>
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.donationReceivedGrid7} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      } else if (t === 'settlement') {
        const stParam = searchParams.get('settlementSubTab');
        const stSub = (stParam === 'history' || stParam === 'register' || stParam === 'request') ? stParam : 'history';
        let settlementContent: React.ReactNode = null;
        if (stSub === 'history') {
          settlementContent = (
            <div className={styles.settlementInnerContent}>
              {settlementDateRowEl}
              <div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                  <div>정산요청일</div><div>정산승인일</div><div>변동 수량</div><div>정산금액</div><div>정산처리상태</div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else if (stSub === 'register') {
          settlementContent = (
            <div className={styles.settlementInnerContent}>
              <div className={styles.settlementForm}>
                {['이메일', '이름', '연락처', '계좌번호'].map((label) => (
                  <div key={label} className={styles.settlementField}>
                    <label>{label}</label>
                    <div className={`${styles.skeletonBar} ${styles.skeletonBarPx100H40}`} />
                  </div>
                ))}
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx80H40}`} />
              </div>
            </div>
          );
        } else {
          settlementContent = (
            <div className={styles.settlementInnerContent}>
              <div className={styles.settlementRequestSummaryBox}>
                <div className={styles.settlementSummaryRow}>
                  <span>정산 가능 금액</span>
                  <span className={styles.settlementTotalAmount}>
                    <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
                  </span>
                </div>
                <button type="button" className={styles.submitBtn} disabled>정산요청</button>
              </div>
              <div className={styles.settlementRequestTableWrap}><div className={styles.overflowXAuto}>
                <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableHeader}`}>
                  <div className={styles.settlementTableHeaderCell}>후원금액</div>
                  <div className={styles.settlementTableHeaderCell}>후원승인일</div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                    <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div></div>
                  </div>
                ))}
              </div></div>
            </div>
          );
        }
        tabSkeleton = (
          <div className={styles.settlementSection}>
            <div className={styles.settlementSubTabs}>
              {[{ id: 'history', label: '정산 내역' }, { id: 'register', label: '정산 정보 등록' }, { id: 'request', label: '정산 신청' }].map((st) => (
                <button key={st.id} type="button" className={stSub === st.id ? styles.settlementSubTabActive : styles.settlementSubTab}>
                  {st.label}{stSub === st.id && <span className={styles.settlementSubTabIndicator} />}
                </button>
              ))}
            </div>
            {settlementContent}
          </div>
        );
      } else {
        tabSkeleton = (
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW100}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW85}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW92}`} />
          </div>
        );
      }
      return (
        <div className={styles.wrap}>
          <div className={styles.skeletonProfile}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonProfileText}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H26}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx200H16}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140H16}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx110H16}`} />
            </div>
          </div>
          <div className={styles.tabs}>
            {TABS.map((tb) => (
              <button key={tb.id} type="button" className={t === tb.id ? styles.tabActive : styles.tab}>{tb.label}</button>
            ))}
          </div>
          <div className={styles.content}>{tabSkeleton}</div>
        </div>
      );
    }
    /* tabParam 없으면 기본 플레이리스트 스켈레톤 */
    return (
      <div className={styles.wrap}>
        <div className={styles.skeletonProfile}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonProfileText}>
            <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H26}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonBarPx200H16}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140H16}`} />
            <div className={`${styles.skeletonBar} ${styles.skeletonBarPx110H16}`} />
          </div>
        </div>
        <div className={styles.tabs}>
          {TABS.map((tb) => (
            <button key={tb.id} type="button" className={tb.id === 'playlists' ? styles.tabActive : styles.tab}>{tb.label}</button>
          ))}
        </div>
        <div className={styles.content}>
          <div>
            <div className={styles.flexBetweenMb16}>
              <div className={styles.flexGap8}><div className={styles.skeletonPlaylistActionBtn} /><div className={styles.skeletonPlaylistActionBtn} /></div>
              <div className={styles.flexGap8Min88}>
                <div className={styles.skeletonCircle} />
                <div className={styles.skeletonCircle} />
              </div>
            </div>
            <div className={styles.flexGap24Padding}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`${styles.skeletonCard} ${styles.skeletonCardThird}`}>
                  <div className={`${styles.skeletonCardThumb} ${styles.skeletonCardThumbH180}`} />
                  <div className={`${styles.skeletonCardBody} ${styles.skeletonCardBodyMin80}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80H16}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.wrap} ${pageReady ? styles.wrapVisible : styles.wrapHidden}`}>
      <section className={styles.profile}>
        <div
          className={`${styles.avatarWrap} ${styles.positionRelative}`}
          onMouseEnter={() => setShowPencilIcon(true)}
          onMouseLeave={() => setShowPencilIcon(false)}
        >
          <div className={styles.avatar}>
              <img src={profileUrl ? profileUrl : defaultProfileImg.src} alt="" className={`${styles.avatarImg} ${!profileUrl ? styles.avatarImgContain : ''}`} />
            </div>
          {showPencilIcon && (
            <button
              type="button"
              className={styles.avatarPencilBtn}
              onClick={() => {
                setShowImageUpload(true);
                fileInputRef.current?.click();
              }}
            >
              <Pencil size={24} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className={styles.inputHidden}
            onChange={handleImageSelect}
          />
        </div>
        <div className={styles.profileText}>
          <div className={styles.flexAlignCenterGap8}>
            <h1 className={styles.nickname}>{user.nickname}</h1>
            <div className={styles.profileLikesRow}>
              <Heart size={18} />
              <span>{receivedLikes}</span>
            </div>
          </div>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.phone}>{formatPhone11(user.phoneNumber) || '—'}</div>
          <div className={styles.credits}>POP {(user.popBalance ?? 0).toLocaleString('ko-KR')}</div>
        </div>
        <div className={styles.profileActions}>
          <button
            type="button"
            className={styles.iconLink}
            title="비밀번호 변경"
            onClick={() => {
              setPasswordVerifyTarget('/mypage/updatepassword');
              setShowPasswordVerifyModal(true);
            }}
          >
            <KeyRound size={22} />
          </button>
          <button
            type="button"
            className={styles.iconLink}
            title="정보수정"
            onClick={() => {
              setPasswordVerifyTarget('/mypage/updateprofile');
              setShowPasswordVerifyModal(true);
            }}
          >
            <UserCog size={22} />
          </button>
          {user?.passwordless === true ? (
            <button
              type="button"
              className={styles.iconLink}
              title="패스워드리스 해지"
              disabled={pwlsWithdrawalLoading}
              onClick={() => setShowPwlsWithdrawalModal(true)}
            >
              <Unplug size={22} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.iconLink}
              title="패스워드리스 등록"
              disabled={pwlsRegisterLoading}
              onClick={() => openPwlsRegister(user.email)}
            >
              <Fingerprint size={22} />
            </button>
          )}
        </div>
      </section>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? styles.tabActive : styles.tab}
            onClick={() => {
              setTab(t.id);
              router.replace(`/mypage?tab=${t.id}`);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`${styles.content} ${tabVisible ? styles.contentVisible : styles.contentHidden}`}>
        {displayedTab === 'playlists' && (
          <MyPageYouTubeSection user={user} isAuthenticated={isAuthenticated} onLoadingChange={setSectionLoading} />
        )}
        {displayedTab === 'posts' && <MyPostsSection onLoadingChange={setSectionLoading} />}
        {displayedTab === 'comments' && <MyCommentsSection onLoadingChange={setSectionLoading} />}
        {displayedTab === 'liked' && <MyPostLikesSection onLoadingChange={setSectionLoading} />}
        {displayedTab === 'reports' && (
          <div>
            <div className={styles.flexGap8Mb16}>
              <input
                type="date"
                value={dateRange.reports.start}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, start: e.target.value } })}
                max={getTodayDateString()}
                className={styles.dateInput}
              />
              <span className={styles.dateTilde}>~</span>
              <input
                type="date"
                value={dateRange.reports.end}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, end: e.target.value } })}
                max={getTodayDateString()}
                className={styles.dateInput}
              />
              <button type="button" onClick={() => handleDateRangeSearch('reports')} className={styles.modalBtn}>
                조회
              </button>
              {selectedReports.length > 0 && (
                <button type="button" onClick={handleReportCancel} className={styles.modalBtnDanger}>
                  신고 취소
                </button>
              )}
            </div>
            <div className={styles.overflowXAuto}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableHeader}>
                  <div>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedReports([]);
                        } else {
                          setSelectedReports([]);
                        }
                      }}
                    />
                  </div>
                  <div>신고일시</div>
                  <div>신고사유</div>
                  <div>상태</div>
                  <div>글 바로가기</div>
                  <div>신고 취소</div>
                </div>
                <div className={styles.fadeWrap}>
                  <div className={`${styles.fadeLayer} ${reportsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableRow}>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBar16}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                      </div>
                    ))}
                  </div>
                  <div className={`${styles.fadeLayer} ${!reportsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {reportsList.length === 0 && !reportsLoading ? (
                      <div className={styles.padding24Center}>
                        신고 내역이 없습니다.
                      </div>
                    ) : (
                      reportsList.map((report, idx) => (
                        <div key={idx} className={styles.tableGrid + ' ' + styles.reportsGrid + ' ' + styles.tableRow}>
                          <div className={styles.tableCell}>
                            <input
                              type="checkbox"
                              checked={selectedReports.includes(report.id || idx)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedReports([...selectedReports, report.id || idx]);
                                } else {
                                  setSelectedReports(selectedReports.filter((id) => id !== (report.id || idx)));
                                }
                              }}
                            />
                          </div>
                          <div className={styles.tableCell}>{report.createdAt || '-'}</div>
                          <div className={styles.tableCell}>{report.reason || '-'}</div>
                          <div className={styles.tableCell}>{report.status || '-'}</div>
                          <div className={styles.tableCell}>
                            {report.boardId ? (
                              <Link href={`/boards/${report.boardId}`}>바로가기</Link>
                            ) : (
                              '-'
                            )}
                          </div>
                          <div className={styles.tableCell}>-</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {displayedTab === 'settlement' && (() => {
          const stParam = searchParams.get('settlementSubTab');
          const validSt = (stParam === 'history' || stParam === 'register' || stParam === 'request') ? stParam : 'history';
          return (
            <SettlementSection
              user={user}
              subTab={validSt}
              onChangeSubTab={(next) => {
                router.replace(`/mypage?tab=settlement&settlementSubTab=${next}`, { scroll: false });
              }}
              onLoadingChange={setSectionLoading}
            />
          );
        })()}
        {displayedTab === 'donation' && (() => {
          const dtParam = searchParams.get('donationSubTab');
          const validDt = (dtParam === 'sent' || dtParam === 'received') ? dtParam : 'sent';
          return (
            <DonationSection
              subTab={validDt}
              onChangeSubTab={(next) => {
                router.replace(`/mypage?tab=donation&donationSubTab=${next}`, { scroll: false });
              }}
              onLoadingChange={setSectionLoading}
            />
          );
        })()}
        {displayedTab === 'inquiries' && (
          <div>
            <div className={styles.flexGap8Mb16}>
              <input
                type="date"
                value={dateRange.inquiries.start}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, start: e.target.value } })}
                max={getTodayDateString()}
                className={styles.dateInput}
              />
              <span className={styles.dateTilde}>~</span>
              <input
                type="date"
                value={dateRange.inquiries.end}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, end: e.target.value } })}
                max={getTodayDateString()}
                className={styles.dateInput}
              />
              <button
                type="button"
                disabled={inquiryLoading || (!!dateRange.inquiries.start !== !!dateRange.inquiries.end)}
                onClick={() => {
                  const { start, end } = dateRange.inquiries;
                  if ((start && !end) || (!start && end)) {
                    ToastUtils.error('시작일과 종료일을 모두 선택해 주세요.');
                    return;
                  }
                  if (start && end && start > end) {
                    ToastUtils.error('종료일이 시작일보다 빠를 수 없습니다.');
                    return;
                  }
                  setInquiryPage(0);
                  setInquiryLoading(true);
                  const params: { page: number; size: number; startDate?: string; endDate?: string } = { page: 0, size: 10 };
                  if (start) params.startDate = start;
                  if (end) params.endDate = end;
                  mypageApi.getInquiries(params)
                    .then(({ data }) => {
                      const pageData = data?.data as { content?: { createdAt: string; inquiryType: string; title: string; inquiryStatus: string; inquiryId: number }[]; totalPages?: number } | undefined;
                      setInquiries(pageData?.content ?? []);
                      setInquiryTotalPages(pageData?.totalPages ?? 0);
                    })
                    .catch(() => {
                      ToastUtils.error('문의 내역을 불러올 수 없습니다.');
                    })
                    .finally(() => {
                      setInquiryLoading(false);
                    });
                }}
                className={(inquiryLoading || (!!dateRange.inquiries.start !== !!dateRange.inquiries.end)) ? styles.inquiryFilterBtnDisabled : styles.modalBtn}
              >
                조회
              </button>
            </div>
            <div className={styles.overflowXAuto}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableHeader}>
                  <div className={styles.tableHeaderCell}>문의일시</div>
                  <div className={styles.tableHeaderCell}>문의유형</div>
                  <div className={styles.tableHeaderCell}>제목</div>
                  <div className={styles.tableHeaderCell}>상태</div>
                </div>
                <div className={styles.fadeWrap}>
                  <div className={`${styles.fadeLayer} ${inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow}>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                        <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                      </div>
                    ))}
                  </div>
                  <div className={`${styles.fadeLayer} ${!inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {inquiries.length === 0 ? (
                      <div className={styles.padding24Center}>
                        문의 내역이 없습니다.
                      </div>
                    ) : (
                      inquiries.map((item) => (
                        <div
                          key={item.inquiryId}
                          className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow}
                        >
                          <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                            {(() => {
                              if (!item.createdAt) return '-';
                              // LocalDateTime 배열: [year, month, day, hour, minute, second]
                              if (Array.isArray(item.createdAt)) {
                                const [y, mo, d, h = 0, mi = 0] = item.createdAt as unknown as number[];
                                return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                              }
                              // ISO 문자열: "2024-01-15T10:30:00"
                              const raw = String(item.createdAt);
                              const d = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                              if (isNaN(d.getTime())) return raw;
                              const y = d.getFullYear();
                              const mo = String(d.getMonth() + 1).padStart(2, '0');
                              const day = String(d.getDate()).padStart(2, '0');
                              const h = String(d.getHours()).padStart(2, '0');
                              const mi = String(d.getMinutes()).padStart(2, '0');
                              return `${y}.${mo}.${day} ${h}:${mi}`;
                            })()}
                          </div>
                          <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                            {(() => {
                              const map: Record<string, string> = {
                                USER: '계정/제재',
                                PAYMENT: '결제/재화',
                                DONATION: '후원',
                                POST: '게시물/작업물',
                                API: '외부 서비스 연동',
                                ETC: '기타',
                              };
                              return map[item.inquiryType] ?? item.inquiryType;
                            })()}
                          </div>
                          <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                            <button
                              type="button"
                              className={styles.inquiryTitleLink}
                              onClick={() => {
                                setInquiryDetailLoading(true);
                                setShowInquiryDetailModal(true);
                                setInquiryDetail(null);
                                mypageApi.getInquiryDetail(item.inquiryId)
                                  .then(({ data }) => {
                                    const detail = data?.data as {
                                      title: string;
                                      inquiryType: string;
                                      createdAt: string;
                                      content: string;
                                      fileUrl?: string;
                                      isImage?: boolean;
                                      commentStatus: string;
                                      adminComment?: string;
                                      commentCreatedAt?: string;
                                    } | undefined;
                                    setInquiryDetail(detail ?? null);
                                  })
                                  .catch(() => {
                                    ToastUtils.error('문의 상세 정보를 불러올 수 없습니다.');
                                    setShowInquiryDetailModal(false);
                                  })
                                  .finally(() => {
                                    setInquiryDetailLoading(false);
                                  });
                              }}
                            >
                              {item.title}
                            </button>
                          </div>
                          <div className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                            <span
                              className={
                                styles.statusBadge + ' ' +
                                (item.inquiryStatus === 'COMPLETED'
                                  ? styles.statusCompleted
                                  : item.inquiryStatus === 'PROCESSING'
                                    ? styles.statusProcessing
                                    : styles.statusPending)
                              }
                            >
                              {(() => {
                                const statusMap: Record<string, string> = {
                                  PENDING: '답변 대기',
                                  PROCESSING: '처리 중',
                                  COMPLETED: '답변 완료',
                                };
                                return statusMap[item.inquiryStatus] ?? item.inquiryStatus;
                              })()}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            {inquiryTotalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                      disabled={inquiryPage === 0}
                      onClick={() => setInquiryPage((p) => Math.max(0, p - 1))}
                    >
                      &lt;
                    </button>
                    {Array.from({ length: inquiryTotalPages }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={
                          styles.pageBtn + (i === inquiryPage ? ' ' + styles.pageBtnActive : '')
                        }
                        onClick={() => setInquiryPage(i)}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={inquiryPage >= inquiryTotalPages - 1}
                      onClick={() => setInquiryPage((p) => Math.min(inquiryTotalPages - 1, p + 1))}
                    >
                      &gt;
                    </button>
              </div>
            )}
          </div>
        )}
        {displayedTab === 'pop' && (() => {
          const popSubTabParam = searchParams.get('popSubTab');
          const validPopSubTab = popSubTabParam === 'usage' || popSubTabParam === 'purchase' ? popSubTabParam : 'purchase';
          return (
            <PopSection
              user={user}
              subTab={validPopSubTab}
              onLoadingChange={setSectionLoading}
              onChangeSubTab={(next) => {
                router.replace(`/mypage?tab=pop&popSubTab=${next}`, { scroll: false });
              }}
              onPopBalanceRefresh={async () => {
                try {
                  const { data } = await mypageApi.getMypage();
                  const userData = data?.data as UserInfo | undefined;
                  if (userData) {
                    setUser(userData);
                    setProfileUrl(userData.profileUrl != null && userData.profileUrl !== '' ? userData.profileUrl : null);
                  }
                } catch (error) {
                  console.error('Failed to refresh pop balance:', error);
                }
              }}
              onChargeClick={() => setShowCreditChargeModal(true)}
            />
          );
        })()}
      </div>

      {showReportCancelModal && (
        <div className={styles.modalOverlayCenter} role="dialog" aria-modal="true">
          <div className={styles.modalCardSmall}>
            <p className={`${styles.modalTitleMb16} ${styles.modalTitleMb16Dark}`}>이 신고를 취소하시겠어요?</p>
            <div className={styles.flexGap12Center}>
              <button type="button" onClick={() => setShowReportCancelModal(false)} className={styles.modalBtnCancel}>
                취소
              </button>
              <button type="button" onClick={handleReportCancelConfirm} className={styles.modalBtn}>
                예
              </button>
            </div>
          </div>
        </div>
      )}

      {showPwlsWithdrawalModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwls-withdrawal-modal-title"
        >
          <div className={styles.modalCard}>
            <h3 id="pwls-withdrawal-modal-title" className={styles.modalTitle}>
              패스워드리스 해지
            </h3>
            <p className={styles.pwlsWithdrawalConfirmText}>
              해지 후 로그아웃 처리 됩니다.
              <br />
              해지하시겠습니까?
            </p>
            <div className={styles.settlementConfirmActions}>
              <button
                type="button"
                className={styles.settlementConfirmCancelBtn}
                disabled={pwlsWithdrawalLoading}
                onClick={() => setShowPwlsWithdrawalModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                disabled={pwlsWithdrawalLoading}
                onClick={handlePwlsWithdrawalConfirm}
              >
                {pwlsWithdrawalLoading ? '처리 중…' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pwlsQrModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwls-register-modal-title"
          onClick={resetPwlsRegisterState}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={resetPwlsRegisterState}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 id="pwls-register-modal-title" className={styles.modalTitle} style={{ marginBottom: 8 }}>
              Passwordless 설정
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: 8 }}>
              휴대폰 앱으로 QR을 스캔해 등록하세요
            </p>
            <div className={styles.pwlsQrBox}>
              {pwlsRegisterLoading && <div className={styles.pwlsSpinner} />}
              {!pwlsRegisterLoading && pwlsModalError && !pwlsQrUrl && (
                <span style={{ color: '#A6534F', fontSize: '0.875rem' }}>{pwlsModalError}</span>
              )}
              {!pwlsRegisterLoading && pwlsQrUrl && (
                <img src={pwlsQrUrl} alt="QR 코드" />
              )}
            </div>
            {pwlsServerUrl && (
              <div className={styles.pwlsCopyRow}>
                <span className={styles.pwlsCopyLabel}>serverUrl</span>
                <span className={styles.pwlsCopyValue}>{pwlsServerUrl}</span>
                <button type="button" className={styles.pwlsCopyBtn} onClick={() => copyToClipboard(pwlsServerUrl!)}>복사</button>
              </div>
            )}
            {pwlsRegisterKey && (
              <div className={styles.pwlsCopyRow}>
                <span className={styles.pwlsCopyLabel}>registerKey</span>
                <span className={styles.pwlsCopyValue}>{pwlsRegisterKey}</span>
                <button type="button" className={styles.pwlsCopyBtn} onClick={() => copyToClipboard(pwlsRegisterKey!)}>복사</button>
              </div>
            )}
            {pwlsQrUrl && pwlsRemainSec > 0 && (
              <>
                <div className={styles.pwlsTimerRow}>
                  {Math.floor(pwlsRemainSec / 60)}:{String(pwlsRemainSec % 60).padStart(2, '0')}
                </div>
                <div className={styles.pwlsProgressTrack}>
                  <div
                    className={styles.pwlsProgressBar}
                    style={{ width: `${pwlsTotalSec > 0 ? (pwlsRemainSec / pwlsTotalSec) * 100 : 0}%` }}
                  />
                </div>
              </>
            )}
            {pwlsRemainSec === 0 && pwlsQrUrl && (
              <div className={styles.pwlsExpiredRow}>
                <p className={styles.pwlsExpiredMsg}>만료됨</p>
                <button
                  type="button"
                  className={styles.settlementConfirmBtn}
                  disabled={pwlsRegisterLoading}
                  onClick={() => requestPwlsQR(user.email)}
                >
                  {pwlsRegisterLoading ? '발급 중…' : 'QR 재발급'}
                </button>
              </div>
            )}
            {pwlsModalError && !pwlsQrUrl && !pwlsRegisterLoading && (
              <div className={styles.pwlsExpiredRow}>
                <p className={styles.pwlsExpiredMsg}>{pwlsModalError}</p>
                <button
                  type="button"
                  className={styles.settlementConfirmBtn}
                  disabled={pwlsRegisterLoading}
                  onClick={() => requestPwlsQR(user.email)}
                >
                  재시도
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pwlsRegisterDoneModalOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwls-register-done-title"
          onClick={() => setPwlsRegisterDoneModalOpen(false)}
        >
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="pwls-register-done-title" className={styles.modalTitle}>등록 완료</h3>
            <p className={styles.pwlsRegisterDoneText}>
              Passwordless 서비스가 등록되었습니다.
            </p>
            <div className={styles.settlementConfirmActions}>
              <button
                type="button"
                className={styles.settlementConfirmBtn}
                onClick={() => {
                  setPwlsRegisterDoneModalOpen(false);
                  setUser((prev) => prev ? { ...prev, passwordless: true } : prev);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropModal && selectedImage && typeof document !== 'undefined' && createPortal(
        <div className={styles.modalOverlayCrop} role="dialog" aria-modal="true">
          <div className={styles.modalCardCrop}>
            <h2 className={`${styles.modalTitle18} ${styles.modalTitleMb16Dark}`}>프로필 사진 영역 선택</h2>
            <div className={styles.cropPreviewWrap}>
              <img ref={imageRef} src={selectedImage} alt="Crop preview" onLoad={handleImageLoad} className={styles.cropImg} />
              {nonce ? (
                <>
                  <style
                    nonce={nonce}
                    dangerouslySetInnerHTML={{
                      __html: [
                        `.cropOverlay-${cropModalId}{position:absolute;inset:0;background:rgba(0,0,0,0.6);pointer-events:none;clip-path:polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% ${cropArea.y}px,${cropArea.x}px ${cropArea.y}px,${cropArea.x}px ${cropArea.y + cropArea.size}px,${cropArea.x + cropArea.size}px ${cropArea.y + cropArea.size}px,${cropArea.x + cropArea.size}px ${cropArea.y}px,0% ${cropArea.y}px);}`,
                        `.cropBox-${cropModalId}{position:absolute;left:${cropArea.x}px;top:${cropArea.y}px;width:${cropArea.size}px;height:${cropArea.size}px;border:2px solid rgba(255,255,255,0.7);border-radius:50%;box-sizing:border-box;cursor:${isDragging ? 'grabbing' : 'grab'};}`,
                      ].join(''),
                    }}
                  />
                  <div className={`cropOverlay-${cropModalId}`} aria-hidden />
                  <div className={`cropBox-${cropModalId}`} onMouseDown={handleCropAreaMouseDown}>
                    <div data-resize-handle="true" role="button" tabIndex={0} aria-label="크롭 영역 크기 조절" className={styles.cropResizeHandle} onMouseDown={handleResizeHandleMouseDown} />
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', pointerEvents: 'none',
                      clipPath: `polygon(0% 0%,100% 0%,100% 100%,0% 100%,0% ${cropArea.y}px,${cropArea.x}px ${cropArea.y}px,${cropArea.x}px ${cropArea.y + cropArea.size}px,${cropArea.x + cropArea.size}px ${cropArea.y + cropArea.size}px,${cropArea.x + cropArea.size}px ${cropArea.y}px,0% ${cropArea.y}px)`,
                    }}
                    aria-hidden
                  />
                  <div
                    style={{
                      position: 'absolute', left: cropArea.x, top: cropArea.y, width: cropArea.size, height: cropArea.size,
                      border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%', cursor: isDragging ? 'grabbing' : 'grab', boxSizing: 'border-box',
                    }}
                    onMouseDown={handleCropAreaMouseDown}
                  >
                    <div data-resize-handle="true" role="button" tabIndex={0} aria-label="크롭 영역 크기 조절" className={styles.cropResizeHandle} onMouseDown={handleResizeHandleMouseDown} />
                  </div>
                </>
              )}
            </div>
            <div className={styles.flexGap12End}>
              <button type="button" onClick={handleSetDefaultProfile} disabled={profileImageUploading} className={`${styles.modalBtnWithIcon} ${styles.modalBtnWithIconDefault}`}>
                <UserCircle size={18} /> 기본프로필
              </button>
              <button type="button" onClick={handleCropCancel} className={`${styles.modalBtnWithIcon} ${styles.modalBtnWithIconCancel}`}>
                <X size={18} /> 취소
              </button>
              <button type="button" onClick={handleCropConfirm} disabled={profileImageUploading} className={`${styles.modalBtnWithIcon} ${styles.modalBtnWithIconConfirm}`}>
                <Check size={18} /> {profileImageUploading ? '업로드 중…' : '확인'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPasswordVerifyModal && passwordVerifyTarget && (
        <PasswordVerifyModal
          isOpen={showPasswordVerifyModal}
          onClose={() => {
            setShowPasswordVerifyModal(false);
            setPasswordVerifyTarget(null);
          }}
          targetPath={passwordVerifyTarget}
          onSuccess={(path) => {
            router.push(path);
            setShowPasswordVerifyModal(false);
            setPasswordVerifyTarget(null);
          }}
        />
      )}

      {/* 문의 상세 모달 */}
      {showInquiryDetailModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={() => setShowInquiryDetailModal(false)}
        >
          <div
            className={styles.inquiryDetailCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setShowInquiryDetailModal(false)}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>문의 상세</h2>

            {inquiryDetailLoading ? (
              <div className={styles.padding24FlexCol}>
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW40H18}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} />
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} />
                <div className={styles.mt12}>
                  <div className={`${styles.skeletonBar} ${styles.skeletonBarW40H18}`} />
                </div>
                <div className={`${styles.skeletonBar} ${styles.skeletonBarW30}`} />
              </div>
            ) : inquiryDetail ? (
              <div className={styles.inquiryDetailBody}>
                {/* 문의 정보 */}
                <div className={styles.inquiryDetailSection}>
                  <h3 className={styles.inquiryDetailSectionTitle}>문의 정보</h3>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>제목</span>
                    <span className={styles.inquiryDetailValue}>{inquiryDetail.title}</span>
                  </div>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>유형</span>
                    <span className={styles.inquiryDetailValue}>
                      {({ USER: '계정/제재', PAYMENT: '결제/재화', DONATION: '후원', POST: '게시물/작업물', API: '외부 서비스 연동', ETC: '기타' } as Record<string, string>)[inquiryDetail.inquiryType] ?? inquiryDetail.inquiryType}
                    </span>
                  </div>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>작성일시</span>
                    <span className={styles.inquiryDetailValue}>
                      {(() => {
                        if (!inquiryDetail.createdAt) return '-';
                        if (Array.isArray(inquiryDetail.createdAt)) {
                          const [y, mo, d, h = 0, mi = 0] = inquiryDetail.createdAt as unknown as number[];
                          return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                        }
                        const raw = String(inquiryDetail.createdAt);
                        const dt = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                        if (isNaN(dt.getTime())) return raw;
                        return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>
                  <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                    <span className={styles.inquiryDetailLabel}>내용</span>
                    <span className={`${styles.inquiryDetailValue} ${styles.preWrap}`}>{inquiryDetail.content}</span>
                  </div>
                  {inquiryDetail.fileUrl && (
                    <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                      <span className={styles.inquiryDetailLabel}>첨부파일</span>
                      <span className={styles.inquiryDetailValue}>
                        {inquiryDetail.isImage ? (
                          <img
                            src={inquiryDetail.fileUrl}
                            alt="첨부 이미지"
                            className={styles.inquiryDetailAttachmentImg}
                          />
                        ) : (
                          <a
                            href={inquiryDetail.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.inquiryDetailAttachmentLink}
                          >
                            첨부파일 열기
                          </a>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* 관리자 답변 */}
                <div className={styles.inquiryDetailSection}>
                  <h3 className={styles.inquiryDetailSectionTitle}>관리자 답변</h3>
                  <div className={styles.inquiryDetailRow}>
                    <span className={styles.inquiryDetailLabel}>상태</span>
                    <span className={styles.inquiryDetailValue}>
                      <span
                        className={
                          styles.statusBadge + ' ' +
                          (inquiryDetail.commentStatus === 'COMPLETED'
                            ? styles.statusCompleted
                            : inquiryDetail.commentStatus === 'PROCESSING'
                              ? styles.statusProcessing
                              : styles.statusPending)
                        }
                      >
                        {({ PENDING: '답변 대기', PROCESSING: '처리 중', COMPLETED: '답변 완료' } as Record<string, string>)[inquiryDetail.commentStatus] ?? inquiryDetail.commentStatus}
                      </span>
                    </span>
                  </div>
                  {inquiryDetail.commentStatus === 'COMPLETED' && inquiryDetail.adminComment ? (
                    <>
                      <div className={`${styles.inquiryDetailRow} ${styles.inquiryDetailAlignStart}`}>
                        <span className={styles.inquiryDetailLabel}>답변</span>
                        <span className={`${styles.inquiryDetailValue} ${styles.preWrap}`}>{inquiryDetail.adminComment}</span>
                      </div>
                      {inquiryDetail.commentCreatedAt && (
                        <div className={styles.inquiryDetailRow}>
                          <span className={styles.inquiryDetailLabel}>답변일시</span>
                          <span className={styles.inquiryDetailValue}>
                            {(() => {
                              if (Array.isArray(inquiryDetail.commentCreatedAt)) {
                                const [y, mo, d, h = 0, mi = 0] = inquiryDetail.commentCreatedAt as unknown as number[];
                                return `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
                              }
                              const raw = String(inquiryDetail.commentCreatedAt);
                              const dt = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T'));
                              if (isNaN(dt.getTime())) return raw;
                              return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                            })()}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.inquiryDetailPending}>
                      답변 준비 중입니다.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.padding24Center}>
                정보를 불러올 수 없습니다.
              </div>
            )}
          </div>
        </div>
      )}

      {showCreditChargeModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onClick={closeModal}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className={styles.closeBtn}
              onClick={closeModal}
              aria-label="닫기"
            >
              <X size={20} />
            </button>
            <h2 className={styles.modalTitle}>
              POP 충전
            </h2>

            <label className={styles.labelBlock}>
              충전할 POP
            </label>
            <div className={styles.inputRow}>
              <input
                type="text"
                value={creditAmount}
                onChange={handleCreditAmountChange}
                placeholder="숫자만 입력"
                className={styles.amountInput}
              />
              {creditAmount && (
                <button
                  type="button"
                  onClick={handleCreditAmountClear}
                  className={styles.clearButton}
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className={styles.quickAmountRow}>
              <button
                type="button"
                className={styles.quickAmountBtn}
                onClick={() => handleQuickAmountAdd(1000)}
              >
                +1,000
              </button>
              <button
                type="button"
                className={styles.quickAmountBtn}
                onClick={() => handleQuickAmountAdd(5000)}
              >
                +5,000
              </button>
              <button
                type="button"
                className={styles.quickAmountBtn}
                onClick={() => handleQuickAmountAdd(10000)}
              >
                +10,000
              </button>
              <button
                type="button"
                className={styles.quickAmountBtn}
                onClick={() => handleQuickAmountAdd(50000)}
              >
                +50,000
              </button>
              <button
                type="button"
                className={styles.quickAmountBtn}
                onClick={() => handleQuickAmountAdd(100000)}
              >
                +100,000
              </button>
            </div>
            <div className={styles.errorSlot}>
              {creditError ? <span className={styles.errorText}>{creditError}</span> : null}
            </div>

            <div className={styles.totalRow}>
              <div>최종 결제금액</div>
              <div>
                {(() => {
                  if (!creditAmount) return '0';
                  const validationError = validateCreditAmount(creditAmount);
                  if (validationError) return '0';
                  const base = Number(creditAmount);
                  const final = base + (base / 10);
                  return final.toLocaleString('ko-KR');
                })()}원
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreditPurchase}
              disabled={!creditAmount || !!creditError}
              className={styles.primaryButton}
            >
              구매하기
            </button>

            <div className={styles.helperText}>
              <span>결제 관련 안내를 확인하시려면 </span>
              <button
                type="button"
                className={styles.helperLink}
              >
                안내보기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MypagePage() {
  return (
    <Suspense
      fallback={
        <div className={styles.wrap}>
          <div className={styles.skeletonProfile}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonProfileText}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H20}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx180}`} />
              <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140}`} />
            </div>
          </div>
          <div className={styles.skeletonTabs}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={`${styles.skeletonTab} ${i % 3 === 0 ? styles.skeletonTabW80 : i % 3 === 1 ? styles.skeletonTabW64 : styles.skeletonTabW56}`} />
            ))}
          </div>
          <div className={styles.skeletonContent}>
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW100}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW85}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW92}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW78}`} />
            <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW88}`} />
          </div>
        </div>
      }
    >
      <MypagePageContent />
    </Suspense>
  );
}
