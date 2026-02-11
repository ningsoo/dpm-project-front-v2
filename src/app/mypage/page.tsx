'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { Key, User, Plus, Search, Pencil, Heart, X, Check, Unplug } from 'lucide-react';
import { AppDispatch, RootState } from '@/store';
import { authApi } from '@/api/authApi';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { clearAuth } from '@/store/slices/authSlice';
import { PasswordVerifyModal } from './PasswordVerifyModal';
import { SettlementSection } from './components/SettlementSection';
import { DonationSection } from './components/DonationSection';
import { PopSection } from './components/PopSection';
import { MyPageYouTubeSection } from './components/MyPageYouTubeSection';
import styles from './mypage.module.css';

interface UserInfo {
  id: string;
  email: string;
  nickname: string;
  phoneNumber: string;
  profileImage?: string;
  credits?: number;
  youtubeConnected?: boolean;
}

const TABS = [
  { id: 'playlists', label: '플레이리스트' },
  { id: 'posts', label: '내 게시글' },
  { id: 'comments', label: '내 댓글' },
  { id: 'liked', label: '좋아요 한 게시글' },
  { id: 'reports', label: '신고 내역' },
  { id: 'settlement', label: '정산' },
  { id: 'donation', label: '후원' },
  { id: 'inquiries', label: '문의내역' },
  { id: 'pop', label: 'POP' },
] as const;

/** 11자리 연락처를 3-4-4 형식(예: 010-1234-5678)으로 변환해 프로필 렌더링용으로 반환 */
function formatPhone11(phoneNumber: string | undefined): string {
  if (phoneNumber == null || phoneNumber === '') return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length !== 11) return phoneNumber;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

const PWLS_WITHDRAWAL_GUIDE =
  '패스워드리스 해지가 완료되었습니다.';

export default function MypagePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('playlists');
  const [searchQuery, setSearchQuery] = useState({ posts: '', comments: '', liked: '' });
  const [dateRange, setDateRange] = useState({
    settlement: { start: '', end: '' },
    reports: { start: '', end: '' },
    inquiries: { start: '', end: '' },
  });
  const [selectedReports, setSelectedReports] = useState<number[]>([]);
  const [showReportCancelModal, setShowReportCancelModal] = useState(false);
  const [showPencilIcon, setShowPencilIcon] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
  const [inquiryLoading, setInquiryLoading] = useState(false);

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

  // 초기화 완료 후 사용자 정보 로드
  useEffect(() => {
    if (!initialized) return;
    
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

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
        setLoading(false);
      });
  }, [initialized, isAuthenticated, router]);

  // 게시글 상세 등에서 "충전하기"로 진입 시 충전 모달 자동 오픈
  useEffect(() => {
    if (searchParams.get('openCharge') === '1') {
      setShowCreditChargeModal(true);
      router.replace('/mypage', { scroll: false });
    }
  }, [searchParams, router]);

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

  if (!initialized || loading) {
    return (
      <div className={styles.wrap}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
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

  const handleDateRangeSearch = (type: 'settlement' | 'reports') => {
    const range = dateRange[type];
    if (range.start && range.end) {
      // TODO: 실제 API 호출
      console.log(`Searching ${type} from ${range.start} to ${range.end}`);
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
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setSelectedImage(imageUrl);
        setShowImageUpload(false);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropConfirm = () => {
    if (!selectedImage || !imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const imgSize = Math.min(img.width, img.height);
      const scale = imgSize / (cropArea.size || 200);
      canvas.width = 200;
      canvas.height = 200;
      
      const sourceX = (img.width - imgSize) / 2 + cropArea.x * scale;
      const sourceY = (img.height - imgSize) / 2 + cropArea.y * scale;
      const sourceSize = (cropArea.size || 200) * scale;
      
      ctx.beginPath();
      ctx.arc(100, 100, 100, 0, 2 * Math.PI);
      ctx.clip();
      
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceSize, sourceSize,
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
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height) * 0.6;
      setCropArea({
        x: (rect.width - size) / 2,
        y: (rect.height - size) / 2,
        size,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    setIsDragging(true);
    const rect = imageRef.current.getBoundingClientRect();
    setDragStart({
      x: e.clientX - rect.left - cropArea.x,
      y: e.clientY - rect.top - cropArea.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragStart.x;
    const newY = e.clientY - rect.top - dragStart.y;
    const maxX = rect.width - cropArea.size;
    const maxY = rect.height - cropArea.size;
    
    setCropArea((prev) => ({
      ...prev,
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
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

  const handleCreditPurchase = () => {
    // 최종 검증 1번 더 실행
    const error = validateCreditAmount(creditAmount);
    if (error) {
      setCreditError(error);
      return;
    }

    const amount = parseInt(creditAmount, 10);
    setShowCreditChargeModal(false);
    setCreditError('');
    router.push(`/mypage/credit?amount=${amount}`);
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
    <div className={styles.wrap}>
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
              backgroundImage: profileImage ? `url(${profileImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
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
          <div className={styles.credits}>POP {user.credits ?? 0}</div>
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
          <button
            type="button"
            className={styles.iconLink}
            title="패스워드리스 해지"
            disabled={pwlsWithdrawalLoading}
            onClick={() => setShowPwlsWithdrawalModal(true)}
          >
            <Unplug size={22} />
          </button>
        </div>
      </section>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {tab === 'playlists' && (
          <MyPageYouTubeSection user={user} isAuthenticated={isAuthenticated} />
        )}
        {tab === 'posts' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.posts}
                onChange={(e) => setSearchQuery({ ...searchQuery, posts: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('posts')}
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('posts')}
                onMouseEnter={(e) => { e.currentTarget.style.color = darkMode ? '#3A3934' : '#1976d2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  color: '#666',
                  transition: 'color 0.2s',
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.postsGrid + ' ' + styles.tableHeader}>
                  <div>게시판 종류</div>
                  <div>제목</div>
                  <div>날짜</div>
                  <div>조회</div>
                  <div>추천</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  게시글이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'comments' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.comments}
                onChange={(e) => setSearchQuery({ ...searchQuery, comments: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('comments')}
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('comments')}
                onMouseEnter={(e) => { e.currentTarget.style.color = darkMode ? '#3A3934' : '#1976d2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  color: '#666',
                  transition: 'color 0.2s',
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.commentsGrid + ' ' + styles.tableHeader}>
                  <div>게시판 종류</div>
                  <div>댓글내용</div>
                  <div>원문 글 제목</div>
                  <div>작성일</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  댓글이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'liked' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.liked}
                onChange={(e) => setSearchQuery({ ...searchQuery, liked: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('liked')}
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('liked')}
                onMouseEnter={(e) => { e.currentTarget.style.color = darkMode ? '#3A3934' : '#1976d2'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  color: '#666',
                  transition: 'color 0.2s',
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.likedGrid + ' ' + styles.tableHeader}>
                  <div>게시판 종류</div>
                  <div>제목</div>
                  <div>작성자</div>
                  <div>날짜</div>
                  <div>조회</div>
                  <div>추천</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  좋아요 한 게시글이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.reports.start}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, start: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <span>~</span>
              <input
                type="date"
                value={dateRange.reports.end}
                onChange={(e) => setDateRange({ ...dateRange, reports: { ...dateRange.reports, end: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => handleDateRangeSearch('reports')}
                style={{
                  padding: '8px 16px',
                  background: darkMode ? '#6B7080' : '#1976d2',
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
                    background: '#c62828',
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
                          // TODO: 모든 신고 ID 선택
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
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  신고 내역이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'settlement' && (
          <SettlementSection user={user} />
        )}
        {tab === 'donation' && (
          <DonationSection />
        )}
        {tab === 'inquiries' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.inquiries.start}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, start: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <span>~</span>
              <input
                type="date"
                value={dateRange.inquiries.end}
                onChange={(e) => setDateRange({ ...dateRange, inquiries: { ...dateRange.inquiries, end: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
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
                    : darkMode ? '#6B7080' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: (inquiryLoading || (!!dateRange.inquiries.start !== !!dateRange.inquiries.end)) ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                }}
              >
                {inquiryLoading ? '조회 중…' : '조회'}
              </button>
            </div>
            {inquiryLoading ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                불러오는 중...
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <div>
                    <div className={styles.tableGrid + ' ' + styles.inquiryGrid + ' ' + styles.tableHeader}>
                      <div style={{ textAlign: 'left' }}>문의일시</div>
                      <div style={{ textAlign: 'center' }}>문의유형</div>
                      <div style={{ textAlign: 'center' }}>제목</div>
                      <div style={{ textAlign: 'center' }}>상태</div>
                    </div>
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
              </>
            )}
          </div>
        )}
        {tab === 'pop' && (
          <PopSection user={user} onChargeClick={() => setShowCreditChargeModal(true)} />
        )}
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
              background: '#fff',
              borderRadius: 12,
              maxWidth: 360,
              textAlign: 'center',
            }}
          >
            <p style={{ margin: '0 0 16px' }}>이 신고를 취소하시겠어요?</p>
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
                  background: darkMode ? '#6B7080' : '#1976d2',
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

      {showCropModal && selectedImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
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
              background: '#fff',
              borderRadius: 12,
              maxWidth: 500,
              width: '90%',
            }}
          >
            <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>프로필 사진 영역 선택</h2>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxHeight: 400,
                marginBottom: 16,
                overflow: 'hidden',
                borderRadius: 8,
                background: '#000',
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
              {/* 오버레이 - 위쪽 */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: cropArea.y,
                  background: 'rgba(0,0,0,0.6)',
                }}
              />
              {/* 오버레이 - 아래쪽 */}
              {imageRef.current && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: imageRef.current.clientHeight - cropArea.y - cropArea.size,
                    background: 'rgba(0,0,0,0.6)',
                  }}
                />
              )}
              {/* 오버레이 - 왼쪽 */}
              <div
                style={{
                  position: 'absolute',
                  top: cropArea.y,
                  left: 0,
                  width: cropArea.x,
                  height: cropArea.size,
                  background: 'rgba(0,0,0,0.6)',
                }}
              />
              {/* 오버레이 - 오른쪽 */}
              {imageRef.current && (
                <div
                  style={{
                    position: 'absolute',
                    top: cropArea.y,
                    right: 0,
                    width: imageRef.current.clientWidth - cropArea.x - cropArea.size,
                    height: cropArea.size,
                    background: 'rgba(0,0,0,0.6)',
                  }}
                />
              )}
              <div
                style={{
                  position: 'absolute',
                  left: cropArea.x,
                  top: cropArea.y,
                  width: cropArea.size,
                  height: cropArea.size,
                  border: `3px solid ${darkMode ? '#3A3934' : '#1976d2'}`,
                  borderRadius: '50%',
                  cursor: isDragging ? 'grabbing' : 'grab',
                  boxSizing: 'border-box',
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
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
                  background: darkMode ? '#6B7080' : '#1976d2',
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
        </div>
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
              <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                불러오는 중...
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
