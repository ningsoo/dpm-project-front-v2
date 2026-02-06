'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { CircleDollarSign, CreditCard, Key, User, Plus, Search, Pencil, Heart, X, Check, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { RootState } from '@/store';
import { mypageApi } from '@/api/mypageApi';
import { ToastUtils } from '@/utils/toastUtils';
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
}

interface PlaylistItem {
  playlistId: number;
  youtubeListId: string;
  title: string;
  thumbnailUrl: string;
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
  const carouselRef = useRef<HTMLDivElement>(null);

  const [profileImage, setProfileImage] = useState<string | null>(null);

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
        const userData = data?.data as UserInfo | undefined;
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

  // 플레이리스트 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (tab === 'playlists' && isAuthenticated) {
      fetchPlaylists();
    }
  }, [tab, isAuthenticated]);

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

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 340; // Card width (320px) + gap (20px)
    const newScrollLeft = carouselRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
    });
  };

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
              {playlists.length > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => scrollCarousel('left')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '50%',
                      cursor: 'pointer',
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
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollCarousel('right')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: '50%',
                      cursor: 'pointer',
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
              <>
                <style>{`
                  .playlist-carousel::-webkit-scrollbar {
                    height: 8px;
                  }
                  .playlist-carousel::-webkit-scrollbar-track {
                    background: #f0f0f0;
                    border-radius: 4px;
                  }
                  .playlist-carousel::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 4px;
                  }
                  .playlist-carousel::-webkit-scrollbar-thumb:hover {
                    background: #999;
                  }
                  .playlist-thumbnail-stack {
                    position: relative;
                  }
                  .playlist-thumbnail-stack::before,
                  .playlist-thumbnail-stack::after {
                    content: '';
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: #fff;
                    border-radius: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                  }
                  .playlist-thumbnail-stack::before {
                    top: -6px;
                    left: -4px;
                    transform: rotate(-2deg);
                    z-index: -2;
                  }
                  .playlist-thumbnail-stack::after {
                    top: -3px;
                    left: -2px;
                    transform: rotate(-1deg);
                    z-index: -1;
                  }
                `}</style>
                <div
                  ref={carouselRef}
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: 20,
                    padding: '4px 4px 12px',
                    scrollSnapType: 'x mandatory',
                  }}
                  className="playlist-carousel"
                >
                {playlists.map((playlist) => (
                  <div
                    key={playlist.youtubeListId}
                    style={{
                      position: 'relative',
                      background: 'white',
                      borderRadius: 12,
                      overflow: 'visible',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: isDeleteMode ? 'default' : 'pointer',
                      minWidth: '320px',
                      maxWidth: '320px',
                      flexShrink: 0,
                      scrollSnapAlign: 'start',
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
                          top: -8,
                          right: -8,
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
                    <div
                      className="playlist-thumbnail-stack"
                      style={{
                        borderRadius: 12,
                        overflow: 'hidden',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          paddingBottom: '56.25%',
                          background: '#000',
                          overflow: 'hidden',
                          borderRadius: 8,
                        }}
                      >
                      <img
                        src={playlist.thumbnailUrl || ''}
                        alt={playlist.title}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0,0,0,0.1)',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isDeleteMode) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.3)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDeleteMode) {
                            e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                          }
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
                  </div>
                ))}
                </div>
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
    </div>
  );
}
