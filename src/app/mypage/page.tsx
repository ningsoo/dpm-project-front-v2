'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { Key, User, Plus, Search, Pencil, Heart, X, Check, Unplug } from 'lucide-react';
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
import styles from './mypage.module.css';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  profileImage?: string;
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
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const [tab, setTab] = useState<string>(() => getValidTab(tabParam));

  /* ── 탭 전환 페이드 애니메이션 ── */
  const [displayedTab, setDisplayedTab] = useState<string>(tab);
  const [tabVisible, setTabVisible] = useState(true);
  const tabTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const [profileImage, setProfileImage] = useState<string | null>(null);

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
      router.push('/auth/login');
      return;
    }

    const startTime = Date.now();

    // 사용자 정보 가져오기
    mypageApi.getMypage()
      .then(({ data }) => {
        console.log('[MyPage] getMyInfo raw response:', data);
        console.log('[MyPage] data.data:', data?.data);
        const userData = data?.data as UserInfo | undefined;
        console.log('[MyPage] youtubeConnected:', userData?.youtubeConnected);
        if (userData) {
          setUser(userData);
          setProfileImage(userData.profileImage || null);
        } else {
          ToastUtils.error('사용자 정보를 불러올 수 없습니다.');
          router.push('/auth/login');
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          router.push('/auth/login');
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

  if (!user) {
    if (!initialized || loading) {
      const t = getValidTab(tabParam);
      if (tabParam) {
        const skeletonTableRow = (gridClass: string, cols: number, widths: string[]) => (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tableGrid} ${gridClass} ${styles.tableRow}`}>
              {Array.from({ length: cols }).map((__, c) => (
                <div key={c} className={styles.tableCell}>
                  <div className={styles.skeletonBar} style={{ width: widths[c] || '60%' }} />
                </div>
              ))}
            </div>
          ))
        );
        const searchBarEl = (
          <div style={{ position: 'relative', marginBottom: 16, width: '33.33%' }}>
            <input
              type="text"
              placeholder="검색어 입력"
              disabled
              style={{
                width: '100%',
                padding: '8px 40px 8px 12px',
                border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`,
                borderRadius: 8,
                fontSize: 14,
                background: darkMode ? '#242422' : '#fff',
                color: darkMode ? '#B5B3A7' : '#333',
              }}
            />
            <span style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              color: '#666',
            }}>
              <Search size={18} />
            </span>
          </div>
        );

        const dateRowEl = (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
            <input
              type="date"
              defaultValue={getDate30DaysAgo()}
              disabled
              max={getTodayDateString()}
              style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
            />
            <span style={{ color: darkMode ? '#8A877D' : undefined }}>~</span>
            <input
              type="date"
              defaultValue={getTodayDateString()}
              disabled
              max={getTodayDateString()}
              style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
            />
            <button
              type="button"
              disabled
              style={{
                padding: '8px 16px',
                background: darkMode ? '#3A3934' : '#111',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'not-allowed',
                fontSize: 14,
              }}
            >
              조회
            </button>
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
              <div className={styles.popTableWrap}><div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableHeader}`}>
                  <div>날짜</div><div>게시판</div><div>제목</div><div>조회</div><div>추천</div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '80%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '45%' }} /></div>
                  </div>
                ))}
              </div></div>
            </div>
          );
        } else if (t === 'comments') {
          tabSkeleton = (
            <div>
              {searchBarEl}
              <div className={styles.popTableWrap}><div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
                  <div>날짜</div><div>게시판</div><div>댓글</div><div>원문 글 제목</div><div>추천</div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '75%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '80%' }} /></div>
                    <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '45%' }} /></div>
                  </div>
                ))}
              </div></div>
            </div>
          );
        } else if (t === 'liked') {
          tabSkeleton = (
            <div>
              {searchBarEl}
              <div className={styles.popTableWrap}><div style={{ overflowX: 'auto' }}>
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
              <div style={{ overflowX: 'auto' }}>
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
              <div style={{ overflowX: 'auto' }}>
                <div className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableHeader}`}>
                  <div>문의일시</div><div>문의유형</div><div>제목</div><div>상태</div>
                </div>
                {skeletonTableRow(styles.inquiryGrid, 4, ['75%', '60%', '70%', '55%'])}
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
                    <div className={styles.skeletonBar} style={{ width: 80, height: 16, display: 'inline-block' }} />
                  </span>
                </div>
                <button type="button" className={styles.submitBtn} disabled>충전하기</button>
              </div>
              <div className={styles.settlementSubTabs}>
                <button type="button" className={popSub === 'purchase' ? styles.settlementSubTabActive : styles.settlementSubTab}>구매내역{popSub === 'purchase' && <span className={styles.settlementSubTabIndicator} />}</button>
                <button type="button" className={popSub === 'usage' ? styles.settlementSubTabActive : styles.settlementSubTab}>사용내역{popSub === 'usage' && <span className={styles.settlementSubTabIndicator} />}</button>
              </div>
              {settlementDateRowEl}
              <div className={styles.popTableWrap}><div style={{ overflowX: 'auto' }}>
                {isUsage ? (
                  <>
                    <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
                      <div>사용일시</div><div>사용수량</div><div>사용대상</div><div>사용내용</div><div>사용상태</div><div>사용취소</div>
                    </div>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
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
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
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
                <div style={{ overflowX: 'auto' }}>
                  {donSub === 'sent' ? (
                    <>
                      <div className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableHeader}`}>
                        <div>후원일</div><div>요청일</div><div>승인일</div><div>취소일</div><div>금액</div><div>상태</div><div>취소</div><div>수혜자</div>
                      </div>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableRow}`}>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
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
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '90%' }} /><div className={styles.skeletonBar} style={{ width: '70%' }} /></div></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                          <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
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
                <div style={{ overflowX: 'auto' }}>
                  <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
                    <div>정산요청일</div><div>정산승인일</div><div>변동 수량</div><div>정산금액</div><div>정산처리상태</div>
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '65%' }} /></div></div>
                      <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '85%' }} /><div className={styles.skeletonBar} style={{ width: '65%' }} /></div></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '65%' }} /></div>
                      <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
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
                      <div className={styles.skeletonBar} style={{ width: '100%', height: 40, borderRadius: 8 }} />
                    </div>
                  ))}
                  <div className={styles.skeletonBar} style={{ width: 80, height: 40, borderRadius: 8 }} />
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
                      <div className={styles.skeletonBar} style={{ width: 80, height: 16, display: 'inline-block' }} />
                    </span>
                  </div>
                  <button type="button" className={styles.submitBtn} disabled>정산요청</button>
                </div>
                <div className={styles.settlementRequestTableWrap}><div style={{ overflowX: 'auto' }}>
                  <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableHeader}`}>
                    <div style={{ textAlign: 'center' }}>후원금액</div>
                    <div style={{ textAlign: 'center' }}>후원승인일</div>
                  </div>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                      <div className={styles.tableCell} style={{ textAlign: 'center' }}><div className={styles.skeletonBar} style={{ width: '40%' }} /></div>
                      <div className={styles.tableCell} style={{ textAlign: 'center' }}><div className={styles.skeletonDateCell}><div className={styles.skeletonBar} style={{ width: '50%' }} /><div className={styles.skeletonBar} style={{ width: '40%' }} /></div></div>
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
            <div style={{ display: 'flex', gap: 24, padding: '4px 4px 8px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} style={{ flex: '0 0 calc((100% - 48px) / 3)' }}>
                  <div className={styles.skeletonCardThumb} style={{ height: 180, paddingTop: 0 }} />
                  <div className={styles.skeletonCardBody} style={{ minHeight: 80 }}>
                    <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
                    <div className={styles.skeletonBar} style={{ width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          );
        } else {
          tabSkeleton = (
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonContentRow} style={{ width: '100%' }} />
              <div className={styles.skeletonContentRow} style={{ width: '85%' }} />
              <div className={styles.skeletonContentRow} style={{ width: '92%' }} />
            </div>
          );
        }
        return (
          <div className={styles.wrap}>
            <div className={styles.skeletonProfile}>
              <div className={styles.skeletonAvatar} />
              <div className={styles.skeletonProfileText}>
                <div className={styles.skeletonBar} style={{ width: 120, height: 26 }} />
                <div className={styles.skeletonBar} style={{ width: 200, height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: 140, height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: 110, height: 16 }} />
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
      return (
        <div className={styles.wrap}>
          <div className={styles.skeletonProfile}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonProfileText}>
              <div className={styles.skeletonBar} style={{ width: 120, height: 26 }} />
              <div className={styles.skeletonBar} style={{ width: 200, height: 16 }} />
              <div className={styles.skeletonBar} style={{ width: 140, height: 16 }} />
              <div className={styles.skeletonBar} style={{ width: 110, height: 16 }} />
            </div>
          </div>
          <div className={styles.skeletonTabs}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={styles.skeletonTab} style={{ width: i % 3 === 0 ? 80 : i % 3 === 1 ? 64 : 56 }} />
            ))}
          </div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonContentRow} style={{ width: '100%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '85%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '92%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '78%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '88%' }} />
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
      router.push('/');
    } catch (err) {
      const message = err instanceof Error ? err.message : '패스워드리스 해지에 실패했습니다.';
      ToastUtils.error(message);
      setShowPwlsWithdrawalModal(false);
      setPwlsWithdrawalLoading(false);
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
    if (!selectedImage || !imageRef.current) return;

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
      setProfileImage(croppedImageUrl);
      setShowCropModal(false);
      setSelectedImage(null);
      setCropArea({ x: 0, y: 0, size: 0 });
      // TODO: API 호출하여 프로필 이미지 업데이트
    };
    img.src = selectedImage;
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setSelectedImage(null);
    setCropArea({ x: 0, y: 0, size: 0 });
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
    }, 500);
  };

  const handleCreditPurchase = async () => {
    // 1) 입력 검증
    const error = validateCreditAmount(creditAmount);
    if (error) {
      setCreditError(error);
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
        router.push(`/mypage/credit?orderId=${encodeURIComponent(orderId)}&changeAmount=${changeAmount}&amount=${amount}`);
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

  return (
    <div className={styles.wrap} style={{ opacity: pageReady ? 1 : 0, transition: 'opacity 0.45s ease' }}>
      <section className={styles.profile}>
        <div
          className={styles.avatarWrap}
          onMouseEnter={() => setShowPencilIcon(true)}
          onMouseLeave={() => setShowPencilIcon(false)}
          style={{ position: 'relative' }}
        >
          <div
            className={styles.avatar}
            style={{
              backgroundImage: `url(${profileImage || defaultProfileImg.src})`,
              backgroundSize: profileImage ? 'cover' : 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          {showPencilIcon && (
            <button
              type="button"
              onClick={() => {
                setShowImageUpload(true);
                fileInputRef.current?.click();
              }}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                color: '#fff',
              }}
            >
              <Pencil size={24} />
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageSelect}
          />
        </div>
        <div className={styles.profileText}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 className={styles.nickname}>{user.nickname}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '1rem', color: '#666', marginLeft: 12 }}>
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
            <Key size={22} />
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
            <User size={22} />
          </button>
          {user?.passwordless === true && (
            <button
              type="button"
              className={styles.iconLink}
              title="패스워드리스 해지"
              disabled={pwlsWithdrawalLoading}
              onClick={() => setShowPwlsWithdrawalModal(true)}
            >
              <Unplug size={22} />
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.reports.start}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, start: e.target.value } })}
                max={getTodayDateString()}
                style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
              />
              <span style={{ color: darkMode ? '#8A877D' : undefined }}>~</span>
              <input
                type="date"
                value={dateRange.reports.end}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, end: e.target.value } })}
                max={getTodayDateString()}
                style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
              />
              <button
                type="button"
                onClick={() => handleDateRangeSearch('reports')}
                style={{
                  padding: '8px 16px',
                  background: darkMode ? '#3A3934' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                조회
              </button>
              {selectedReports.length > 0 && (
                <button
                  type="button"
                  onClick={handleReportCancel}
                  style={{
                    padding: '8px 16px',
                    background: '#A6534F',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    marginLeft: 'auto',
                  }}
                >
                  신고 취소
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
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
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: 16, height: 16 }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '75%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className={`${styles.fadeLayer} ${!reportsLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {reportsList.length === 0 && !reportsLoading ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
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
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.inquiries.start}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, start: e.target.value } })}
                max={getTodayDateString()}
                style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
              />
              <span style={{ color: darkMode ? '#8A877D' : undefined }}>~</span>
              <input
                type="date"
                value={dateRange.inquiries.end}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, end: e.target.value } })}
                max={getTodayDateString()}
                style={{ padding: '8px 12px', border: `1px solid ${darkMode ? '#3A3A38' : '#ddd'}`, borderRadius: 8, fontSize: 14, background: darkMode ? '#242422' : '#fff', color: darkMode ? '#B5B3A7' : '#333' }}
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
                style={{
                  padding: '8px 16px',
                  background: (inquiryLoading || (!!dateRange.inquiries.start !== !!dateRange.inquiries.end))
                    ? '#b0b0b0'
                    : darkMode ? '#3A3934' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: (inquiryLoading || (!!dateRange.inquiries.start !== !!dateRange.inquiries.end)) ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                조회
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableHeader}>
                  <div style={{ textAlign: 'left' }}>문의일시</div>
                  <div style={{ textAlign: 'center' }}>문의유형</div>
                  <div style={{ textAlign: 'center' }}>제목</div>
                  <div style={{ textAlign: 'center' }}>상태</div>
                </div>
                <div className={styles.fadeWrap}>
                  <div className={`${styles.fadeLayer} ${inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow} style={{ padding: '12px 0' }}>
                        <div className={styles.tableCell} style={{ textAlign: 'left' }}><div className={styles.skeletonBar} style={{ width: '75%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '60%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '70%' }} /></div>
                        <div className={styles.tableCell}><div className={styles.skeletonBar} style={{ width: '55%' }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className={`${styles.fadeLayer} ${!inquiryLoading ? styles.fadeLayerVisible : styles.fadeLayerHidden}`}>
                    {inquiries.length === 0 ? (
                      <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                        문의 내역이 없습니다.
                      </div>
                    ) : (
                      inquiries.map((item) => (
                        <div
                          key={item.inquiryId}
                          className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableRow}
                          style={{ padding: '12px 0' }}
                        >
                          <div className={styles.tableCell} style={{ textAlign: 'left' }}>
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
                          <div className={styles.tableCell} style={{ textAlign: 'center' }}>
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
                          <div className={styles.tableCell} style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.inquiryTitleLink}
                              onClick={() => {
                                setInquiryDetailLoading(true);
                                setShowInquiryDetailModal(true);
                                setInquiryDetail(null);
                                mypageApi.getInquiryDetail(item.inquiryId)
                                  .then(({ data }) => {
                                    console.log('[InquiryDetail] raw API response:', data);
                                    console.log('[InquiryDetail] data.data:', data?.data);
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
                                    console.log('[InquiryDetail] fileUrl:', detail?.fileUrl);
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
                          <div className={styles.tableCell} style={{ textAlign: 'center' }}>
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
                    setProfileImage(userData.profileImage || null);
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 24,
              background: darkMode ? '#2E2E2C' : '#fff',
              borderRadius: 12,
              maxWidth: 360,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 16px', color: darkMode ? '#B5B3A7' : undefined }}>이 신고를 취소하시겠어요?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowReportCancelModal(false)}
                style={{
                  padding: '8px 16px',
                  background: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleReportCancelConfirm}
                style={{
                  padding: '8px 16px',
                  background: darkMode ? '#3A3934' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
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

      {showCropModal && selectedImage && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.8)',
          }}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 24,
              background: darkMode ? '#2E2E2C' : '#fff',
              borderRadius: 12,
              maxWidth: 500,
              width: '90%',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18, color: darkMode ? '#B5B3A7' : undefined }}>프로필 사진 영역 선택</h2>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: 400,
                marginBottom: 16,
                overflow: 'hidden',
                borderRadius: 8,
                background: darkMode ? '#2E2E2C' : '#e5e5e5',
              }}
            >
              <img
                ref={imageRef}
                src={selectedImage}
                alt="Crop preview"
                onLoad={handleImageLoad}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />
              {/* 어둡게 처리할 전체 오버레이 (크롭 영역만 투명 구멍) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.6)',
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% ${cropArea.y}px,
                    ${cropArea.x}px ${cropArea.y}px,
                    ${cropArea.x}px ${cropArea.y + cropArea.size}px,
                    ${cropArea.x + cropArea.size}px ${cropArea.y + cropArea.size}px,
                    ${cropArea.x + cropArea.size}px ${cropArea.y}px,
                    0% ${cropArea.y}px
                  )`,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.size,
                  height: cropArea.size,
                  border: `2px solid rgba(255, 255, 255, 0.7)`,
                  borderRadius: '50%',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  boxSizing: 'border-box',
                }}
                onMouseDown={handleCropAreaMouseDown}
              >
                <div
                  data-resize-handle="true"
                  role="button"
                  tabIndex={0}
                  aria-label="크롭 영역 크기 조절"
                  onMouseDown={handleResizeHandleMouseDown}
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 12,
                    height: 12,
                    borderRight: '2px solid rgba(255,255,255,0.9)',
                    borderBottom: '2px solid rgba(255,255,255,0.9)',
                    borderRadius: '0 0 4px 0',
                    cursor: 'nwse-resize',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCropCancel}
                style={{
                  padding: '8px 16px',
                  background: '#999',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <X size={18} />
                취소
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                style={{
                  padding: '8px 16px',
                  background: darkMode ? '#3A3934' : '#111',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Check size={18} />
                확인
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
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className={styles.skeletonBar} style={{ width: '40%', height: 18 }} />
                <div className={styles.skeletonBar} style={{ width: '60%' }} />
                <div className={styles.skeletonBar} style={{ width: '80%' }} />
                <div className={styles.skeletonBar} style={{ width: '50%' }} />
                <div style={{ marginTop: 12 }}>
                  <div className={styles.skeletonBar} style={{ width: '40%', height: 18 }} />
                </div>
                <div className={styles.skeletonBar} style={{ width: '30%' }} />
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
                  <div className={styles.inquiryDetailRow} style={{ alignItems: 'flex-start' }}>
                    <span className={styles.inquiryDetailLabel}>내용</span>
                    <span className={styles.inquiryDetailValue} style={{ whiteSpace: 'pre-wrap' }}>{inquiryDetail.content}</span>
                  </div>
                  {inquiryDetail.fileUrl && (
                    <div className={styles.inquiryDetailRow} style={{ alignItems: 'flex-start' }}>
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
                            첨부파일 다운로드
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
                      <div className={styles.inquiryDetailRow} style={{ alignItems: 'flex-start' }}>
                        <span className={styles.inquiryDetailLabel}>답변</span>
                        <span className={styles.inquiryDetailValue} style={{ whiteSpace: 'pre-wrap' }}>{inquiryDetail.adminComment}</span>
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
              <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
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

            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.95rem', fontWeight: 500, color: '#333' }}>
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
              <div className={styles.skeletonBar} style={{ width: 120, height: 20 }} />
              <div className={styles.skeletonBar} style={{ width: 180 }} />
              <div className={styles.skeletonBar} style={{ width: 140 }} />
            </div>
          </div>
          <div className={styles.skeletonTabs}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={styles.skeletonTab} style={{ width: i % 3 === 0 ? 80 : i % 3 === 1 ? 64 : 56 }} />
            ))}
          </div>
          <div className={styles.skeletonContent}>
            <div className={styles.skeletonContentRow} style={{ width: '100%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '85%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '92%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '78%' }} />
            <div className={styles.skeletonContentRow} style={{ width: '88%' }} />
          </div>
        </div>
      }
    >
      <MypagePageContent />
    </Suspense>
  );
}
