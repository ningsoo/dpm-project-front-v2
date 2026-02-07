'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { CircleDollarSign, CreditCard, Key, User, Plus, Search, Pencil, Heart, X, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import { checkAuth } from '@/store/slices/authSlice';
import { PasswordVerifyModal } from './PasswordVerifyModal';
import { SettlementSection } from './components/SettlementSection';
import { YouTubePlaylistModal } from './YouTubePlaylistModal';
import { PlaylistDetailModal } from './PlaylistDetailModal';
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

interface PlaylistItem {
  playlistId: number;
  youtubeListId: string;
  title: string;
  thumbnailUrl: string;
  thumbnails?: string[];
  itemCount: number;
}

const TABS = [
  { id: 'playlists', label: '플레이리스트' },
  { id: 'posts', label: '내 게시글' },
  { id: 'comments', label: '내 댓글' },
  { id: 'liked', label: '좋아요 한 게시글' },
  { id: 'payment', label: '결제 내역' },
  { id: 'creditUsage', label: '크레딧 사용 내역' },
  { id: 'reports', label: '신고 내역' },
] as const;

function formatDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}.${month}.${day} ${hours}:${minutes}:${seconds}`;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/** 11자리 연락처를 3-4-4 형식(예: 010-1234-5678)으로 변환해 프로필 렌더링용으로 반환 */
function formatPhone11(phoneNumber: string | undefined): string {
  console.log('phoneNumber', phoneNumber);
  if (phoneNumber == null || phoneNumber === '') return '';
  const digits = phoneNumber.replace(/\D/g, '');
  if (digits.length !== 11) return phoneNumber;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
}

export default function MypagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>('playlists');
  const [searchQuery, setSearchQuery] = useState({ posts: '', comments: '', liked: '' });
  const [dateRange, setDateRange] = useState({
    payment: { start: '', end: '' },
    creditUsage: { start: '', end: '' },
    settlement: { start: '', end: '' },
    reports: { start: '', end: '' },
  });
  const [creditFilters, setCreditFilters] = useState({ donation: false, advertisement: false });
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
  const [showYouTubePlaylistModal, setShowYouTubePlaylistModal] = useState(false);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<PlaylistItem | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistItem | null>(null);
  const [sliderIndex, setSliderIndex] = useState(0);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [oauthResultModal, setOauthResultModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // OAuth 리다이렉트 처리 (토큰 저장 + URL 정리 + 결과 알림)
  useEffect(() => {
    const token = searchParams.get('token');
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (!token && !success && !error) return;

    // 토큰이 있으면 저장 후 Redux 인증 상태 갱신
    if (token) {
      tokenUtils.setAccessToken(token);
      dispatch(checkAuth());
      console.log('[MyPage] OAuth token saved');
    }

    // URL에서 파라미터 제거 (보안 + URL 정돈)
    window.history.replaceState({}, '', '/mypage');

    // 결과 모달 표시
    if (success === 'true') {
      setOauthResultModal({ type: 'success', message: '유튜브 연동 성공!\n이제 나만의 플레이리스트를 공유할 수 있습니다!' });
    } else if (error) {
      setOauthResultModal({ type: 'error', message: `유튜브 연동에 실패했습니다: ${decodeURIComponent(error)}` });
    } else if (success === 'false') {
      setOauthResultModal({ type: 'error', message: '유튜브 연동에 실패했습니다. 다시 시도해주세요.' });
    }
  }, [searchParams, dispatch]);

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

  // unmount 시 크레딧 검증 타이머 정리
  useEffect(() => {
    return () => {
      if (creditValidationTimerRef.current) {
        clearTimeout(creditValidationTimerRef.current);
      }
    };
  }, []);

  // 플레이리스트 탭 활성화 시 데이터 로드 (유튜브 연동된 경우에만)
  useEffect(() => {
    if (tab === 'playlists' && isAuthenticated && user?.youtubeConnected) {
      fetchPlaylists();
    }
  }, [tab, isAuthenticated, user?.youtubeConnected]);

  const fetchPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const response = await mypageApi.getMyPlaylists();
      const playlistArray = response.data?.data;

      if (Array.isArray(playlistArray)) {
        setPlaylists(playlistArray);
      } else {
        setPlaylists([]);
      }
    } catch (error) {
      console.error('플레이리스트 로드 실패:', error);
      ToastUtils.error('플레이리스트를 불러올 수 없습니다.');
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const CARDS_PER_VIEW = 3;
  const CARD_GAP = 24;
  const maxSliderIndex = Math.max(0, playlists.length - CARDS_PER_VIEW);

  const slideNext = () => setSliderIndex((prev) => Math.min(prev + 1, maxSliderIndex));
  const slidePrev = () => setSliderIndex((prev) => Math.max(prev - 1, 0));

  const handleDeletePlaylist = async () => {
    if (!playlistToDelete) return;

    try {
      await mypageApi.deleteYouTubePlaylist(playlistToDelete.playlistId);
      ToastUtils.success('플레이리스트가 목록에서 삭제되었습니다.');
      setPlaylistToDelete(null);
      fetchPlaylists();
    } catch (error) {
      console.error('플레이리스트 삭제 실패:', error);
      ToastUtils.error('플레이리스트 삭제에 실패했습니다.');
    }
  };

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

  const handleDateRangeSearch = (type: 'payment' | 'creditUsage' | 'settlement' | 'reports') => {
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
            className={tab === 'settlement' ? `${styles.iconLink} ${styles.iconLinkActive}` : styles.iconLink}
            title="정산"
            onClick={() => setTab('settlement')}
          >
            <CircleDollarSign size={22} />
          </button>
          <button
            type="button"
            className={styles.iconLink}
            title="POP 충전"
            onClick={() => setShowCreditChargeModal(true)}
          >
            <CreditCard size={22} />
          </button>
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
          <div>
            {!user?.youtubeConnected ? (
              /* 유튜브 미연동 상태 플레이스홀더 */
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 20,
                }}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z" fill="#ccc"/>
                    <polygon points="9.75,15.02 15.5,11.75 9.75,8.48" fill="#fff"/>
                  </svg>
                </div>
                <p style={{
                  fontSize: 16,
                  color: '#666',
                  marginBottom: 24,
                  lineHeight: 1.6,
                }}>
                  유튜브를 연동하고 나만의 플레이리스트를 관리해보세요!
                </p>
                <button
                  type="button"
                  disabled={!user?.email}
                  onClick={() => {
                    if (!user?.email) return;
                    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api';
                    const baseUrl = apiBase.replace(/\/api\/?$/, '');
                    const encodedEmail = encodeURIComponent(user.email);
                    window.location.href = `${baseUrl}/oauth2/authorization/google?email=${encodedEmail}`;
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    background: '#fff',
                    color: !user?.email ? '#aaa' : '#333',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    cursor: !user?.email ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    opacity: !user?.email ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!user?.email) return;
                    e.currentTarget.style.background = '#f8f8f8';
                    e.currentTarget.style.borderColor = '#999';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    if (!user?.email) return;
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google 연동하기
                </button>
              </div>
            ) : (
            <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowYouTubePlaylistModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '8px 16px',
                    background: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  <Plus size={18} />
                  등록
                </button>
                {playlists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteMode(!isDeleteMode);
                      if (isDeleteMode) {
                        setPlaylistToDelete(null);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 16px',
                      background: isDeleteMode ? '#c62828' : '#666',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'background 0.2s',
                    }}
                  >
                    <Trash2 size={18} />
                    {isDeleteMode ? '완료' : '관리'}
                  </button>
                )}
              </div>
              {playlists.length > CARDS_PER_VIEW && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={slidePrev}
                    disabled={sliderIndex === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '50%',
                      cursor: sliderIndex === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: sliderIndex === 0 ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (sliderIndex === 0) return;
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#999';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={slideNext}
                    disabled={sliderIndex >= maxSliderIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '50%',
                      cursor: sliderIndex >= maxSliderIndex ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: sliderIndex >= maxSliderIndex ? 0.4 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (sliderIndex >= maxSliderIndex) return;
                      e.currentTarget.style.background = '#f5f5f5';
                      e.currentTarget.style.borderColor = '#999';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fff';
                      e.currentTarget.style.borderColor = '#ddd';
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </div>
            {playlistsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 60 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: '4px solid #f0f0f0',
                    borderTop: '4px solid #1976d2',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : playlists.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666', padding: 60 }}>
                등록된 플레이리스트가 없습니다.
              </div>
            ) : (
              <div style={{ overflow: 'hidden', padding: '4px 4px 8px' }}>
                <div
                  style={{
                    display: 'flex',
                    gap: CARD_GAP,
                    transition: 'transform 0.4s ease-out',
                    transform: `translateX(calc(${-sliderIndex * 100 / CARDS_PER_VIEW}% - ${sliderIndex * CARD_GAP / CARDS_PER_VIEW}px))`,
                  }}
                >
                {playlists.map((playlist) => (
                  <div
                    key={playlist.youtubeListId}
                    style={{
                      position: 'relative',
                      background: 'white',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: isDeleteMode ? 'default' : 'pointer',
                      width: `calc((100% - ${CARD_GAP * (CARDS_PER_VIEW - 1)}px) / ${CARDS_PER_VIEW})`,
                      minWidth: `calc((100% - ${CARD_GAP * (CARDS_PER_VIEW - 1)}px) / ${CARDS_PER_VIEW})`,
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      if (!isDeleteMode) {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDeleteMode) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }
                    }}
                    onClick={() => {
                      if (!isDeleteMode) {
                        setSelectedPlaylist(playlist);
                      }
                    }}
                  >
                    {isDeleteMode && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistToDelete(playlist);
                        }}
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: '#c62828',
                          border: '2px solid #fff',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#b71c1c';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#c62828';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <X size={18} strokeWidth={3} />
                      </button>
                    )}
                    {/* Thumbnail */}
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: 180,
                        borderRadius: '12px 12px 0 0',
                        overflow: 'hidden',
                        background: '#f0f0f0',
                      }}
                    >
                      {playlist.thumbnailUrl ? (
                        <img
                          src={playlist.thumbnailUrl}
                          alt={playlist.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#999',
                          fontSize: 14,
                        }}>
                          썸네일 없음
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleteMode) e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      />
                    </div>
                    <div style={{ padding: 16, minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#333',
                          marginBottom: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                          minHeight: '2.8em',
                        }}
                      >
                        {playlist.title}
                      </div>
                      <div style={{ fontSize: 14, color: '#666', marginTop: 'auto' }}>
                        {playlist.itemCount}곡
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
            </>
            )}
          </div>
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
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1976d2'; }}
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
                  <div style={{ textAlign: 'left' }}>게시판 종류</div>
                  <div style={{ textAlign: 'center' }}>제목</div>
                  <div style={{ textAlign: 'center' }}>날짜</div>
                  <div style={{ textAlign: 'center' }}>조회</div>
                  <div style={{ textAlign: 'center' }}>추천</div>
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
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1976d2'; }}
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
                  <div style={{ textAlign: 'left' }}>게시판 종류</div>
                  <div style={{ textAlign: 'center' }}>댓글내용</div>
                  <div style={{ textAlign: 'center' }}>원문 글 제목</div>
                  <div style={{ textAlign: 'center' }}>작성일</div>
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
                onMouseEnter={(e) => { e.currentTarget.style.color = '#1976d2'; }}
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
                  <div style={{ textAlign: 'left' }}>게시판 종류</div>
                  <div style={{ textAlign: 'center' }}>제목</div>
                  <div style={{ textAlign: 'center' }}>작성자</div>
                  <div style={{ textAlign: 'center' }}>날짜</div>
                  <div style={{ textAlign: 'center' }}>조회</div>
                  <div style={{ textAlign: 'center' }}>추천</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  좋아요 한 게시글이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'payment' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.payment.start}
                onChange={(e) => setDateRange({ ...dateRange, payment: { ...dateRange.payment, start: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <span>~</span>
              <input
                type="date"
                value={dateRange.payment.end}
                onChange={(e) => setDateRange({ ...dateRange, payment: { ...dateRange.payment, end: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => handleDateRangeSearch('payment')}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                조회
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.paymentGrid + ' ' + styles.tableHeader}>
                  <div style={{ textAlign: 'left' }}>충전일시</div>
                  <div style={{ textAlign: 'center' }}>충전수량</div>
                  <div style={{ textAlign: 'center' }}>잔여수량</div>
                  <div style={{ textAlign: 'center' }}>결제수단</div>
                  <div style={{ textAlign: 'center' }}>결제금액</div>
                  <div style={{ textAlign: 'center' }}>유효기간</div>
                  <div style={{ textAlign: 'center' }}>구매취소</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  구매 내역이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'creditUsage' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={dateRange.creditUsage.start}
                onChange={(e) => setDateRange({ ...dateRange, creditUsage: { ...dateRange.creditUsage, start: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <span>~</span>
              <input
                type="date"
                value={dateRange.creditUsage.end}
                onChange={(e) => setDateRange({ ...dateRange, creditUsage: { ...dateRange.creditUsage, end: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => handleDateRangeSearch('creditUsage')}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                조회
              </button>
              <div style={{ display: 'flex', gap: 16, marginLeft: 'auto' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={creditFilters.donation}
                    onChange={(e) => setCreditFilters({ ...creditFilters, donation: e.target.checked })}
                  />
                  <span style={{ fontSize: 14 }}>후원</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={creditFilters.advertisement}
                    onChange={(e) => setCreditFilters({ ...creditFilters, advertisement: e.target.checked })}
                  />
                  <span style={{ fontSize: 14 }}>광고</span>
                </label>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div>
                <div className={styles.tableGrid + ' ' + styles.creditUsageGrid + ' ' + styles.tableHeader}>
                  <div style={{ textAlign: 'left' }}>사용 일시</div>
                  <div style={{ textAlign: 'center' }}>사용 수량</div>
                  <div style={{ textAlign: 'center' }}>사용 내역</div>
                  <div style={{ textAlign: 'center' }}>사용 상태</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  구매 내역이 없습니다.
                </div>
              </div>
            </div>
          </div>
        )}
        {tab === 'settlement' && (
          <SettlementSection
            settlementStart={dateRange.settlement.start}
            settlementEnd={dateRange.settlement.end}
            onChangeStart={(value) => setDateRange({ ...dateRange, settlement: { ...dateRange.settlement, start: value } })}
            onChangeEnd={(value) => setDateRange({ ...dateRange, settlement: { ...dateRange.settlement, end: value } })}
            onSearch={() => handleDateRangeSearch('settlement')}
          />
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
                  background: '#1976d2',
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
                  <div style={{ textAlign: 'center' }}>
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
                  <div style={{ textAlign: 'left' }}>신고일시</div>
                  <div style={{ textAlign: 'center' }}>신고사유</div>
                  <div style={{ textAlign: 'center' }}>상태</div>
                  <div style={{ textAlign: 'center' }}>글 바로가기</div>
                  <div style={{ textAlign: 'center' }}>신고 취소</div>
                </div>
                <div style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                  신고 내역이 없습니다.
                </div>
              </div>
            </div>
          </div>
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
                  background: '#1976d2',
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
                  border: '3px solid #1976d2',
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
                  background: '#1976d2',
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

      <YouTubePlaylistModal
        isOpen={showYouTubePlaylistModal}
        onClose={() => setShowYouTubePlaylistModal(false)}
        onSuccess={() => {
          fetchPlaylists();
        }}
      />

      {selectedPlaylist && (
        <PlaylistDetailModal
          isOpen={!!selectedPlaylist}
          onClose={() => setSelectedPlaylist(null)}
          playlistId={selectedPlaylist.playlistId}
          playlistTitle={selectedPlaylist.title}
        />
      )}

      {playlistToDelete && (
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
          onClick={() => setPlaylistToDelete(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 32,
              background: '#fff',
              borderRadius: 12,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: 20, fontWeight: 600, color: '#333', textAlign: 'center' }}>
              플레이리스트 삭제
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 15, color: '#666', lineHeight: 1.6, textAlign: 'center' }}>
              <strong>{playlistToDelete.title}</strong>
              <br />
              정말로 삭제하시겠습니까?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleDeletePlaylist}
                style={{
                  padding: '10px 24px',
                  background: '#c62828',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#b71c1c';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#c62828';
                }}
              >
                삭제
              </button>
              <button
                type="button"
                onClick={() => setPlaylistToDelete(null)}
                style={{
                  padding: '10px 24px',
                  background: '#fff',
                  color: '#666',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f5f5f5';
                  e.currentTarget.style.borderColor = '#999';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#ddd';
                }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OAuth 결과 모달 */}
      {oauthResultModal && (
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
          onClick={() => setOauthResultModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            style={{
              padding: 32,
              background: '#fff',
              borderRadius: 12,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: oauthResultModal.type === 'success' ? '#e8f5e9' : '#fbe9e7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              {oauthResultModal.type === 'success' ? (
                <Check size={28} color="#2e7d32" />
              ) : (
                <X size={28} color="#c62828" />
              )}
            </div>
            <p style={{
              margin: '0 0 24px',
              fontSize: 16,
              color: '#333',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {oauthResultModal.message}
            </p>
            <button
              type="button"
              onClick={() => {
                setOauthResultModal(null);
                if (oauthResultModal.type === 'success') {
                  window.location.reload();
                }
              }}
              style={{
                padding: '10px 32px',
                background: oauthResultModal.type === 'success' ? '#1976d2' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
