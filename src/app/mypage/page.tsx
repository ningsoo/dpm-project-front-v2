'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { CreditCard, Key, User, Plus, Search, Pencil, Heart, X, Check } from 'lucide-react';
import { RootState } from '@/store';
import styles from './mypage.module.css';

const TABS = [
  { id: 'playlists', label: '플레이리스트' },
  { id: 'posts', label: '내 게시글' },
  { id: 'comments', label: '내 댓글' },
  { id: 'liked', label: '좋아요 한 게시글' },
  { id: 'payment', label: '결제 내역' },
  { id: 'creditUsage', label: '크레딧 사용 내역' },
  { id: 'settlement', label: '정산 내역' },
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

export default function MypagePage() {
  const user = useSelector((s: RootState) => s.auth.user);
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

  const [profileImage, setProfileImage] = useState<string | null>(user?.profileImage || null);

  if (!user) {
    return (
      <div className={styles.wrap}>
        <p>로그인이 필요합니다.</p>
        <Link href="/auth/login">로그인</Link>
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
              <Heart size={18} fill="#c62828" color="#c62828" />
              <span>{receivedLikes}</span>
            </div>
          </div>
          <div className={styles.email}>{user.email}</div>
          <div className={styles.phone}>{user.phone || '—'}</div>
          <div className={styles.credits}>POP {user.credits ?? 0}</div>
        </div>
        <div className={styles.profileActions}>
          <Link href="/mypage/credits" className={styles.iconLink} title="POP 충전">
            <CreditCard size={22} />
          </Link>
          <Link href="/mypage/updatepassword" className={styles.iconLink} title="비밀번호 변경">
            <Key size={22} />
          </Link>
          <Link href="/mypage/updateprofile" className={styles.iconLink} title="프로필 수정">
            <User size={22} />
          </Link>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 12px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                <Plus size={16} />
                등록
              </button>
            </div>
            <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8, textAlign: 'center', color: '#666' }}>
              내가 만든 플레이리스트가 표시됩니다.
            </div>
          </div>
        )}
        {tab === 'posts' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.posts}
                onChange={(e) => setSearchQuery({ ...searchQuery, posts: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('posts')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('posts')}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '10%' }}>게시판종류</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '50%' }}>제목</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '12%' }}>날짜</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: '8%' }}>조회</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: '8%' }}>추천</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      게시글이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'comments' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.comments}
                onChange={(e) => setSearchQuery({ ...searchQuery, comments: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('comments')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('comments')}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '10%' }}>게시판 종류</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '35%' }}>댓글내용</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '35%' }}>원문 글 제목</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '12%' }}>작성일</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      댓글이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'liked' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, width: '33.33%' }}>
              <input
                type="text"
                placeholder="검색어 입력"
                value={searchQuery.liked}
                onChange={(e) => setSearchQuery({ ...searchQuery, liked: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch('liked')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => handleSearch('liked')}
                style={{
                  padding: '8px 16px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Search size={18} />
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '10%' }}>게시판 종류</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '40%' }}>제목</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '10%' }}>작성자</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '12%' }}>날짜</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: '8%' }}>조회</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: '8%' }}>추천</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      좋아요 한 게시글이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '14.28%' }}>충전일시</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '14.28%' }}>충전수량</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '14.28%' }}>잔여수량</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '14.28%' }}>결제수단</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '14.28%' }}>결제금액</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '14.28%' }}>유효기간</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: '14.28%' }}>구매취소</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      구매 내역이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
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
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '25%' }}>사용 일시</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '15%' }}>사용 수량</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '30%' }}>사용내역(게시글 id | 사용자 id)</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '20%' }}>사용상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      구매 내역이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
        {tab === 'settlement' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <input
                type="date"
                value={dateRange.settlement.start}
                onChange={(e) => setDateRange({ ...dateRange, settlement: { ...dateRange.settlement, start: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <span>~</span>
              <input
                type="date"
                value={dateRange.settlement.end}
                onChange={(e) => setDateRange({ ...dateRange, settlement: { ...dateRange.settlement, end: e.target.value } })}
                style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14 }}
              />
              <button
                type="button"
                onClick={() => handleDateRangeSearch('settlement')}
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
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '25%' }}>정산일자</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '25%' }}>정산 요청일자</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontSize: 14, fontWeight: 600, width: '25%' }}>정산금액</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: '25%' }}>정산처리상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      정산 내역이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: 40 }}>
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
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: 'calc((100% - 40px) / 5)' }}>신고일시</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: 'calc((100% - 40px) / 5)' }}>신고사유</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: 'calc((100% - 40px) / 5)' }}>상태</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: 14, fontWeight: 600, width: 'calc((100% - 40px) / 5)' }}>글 바로가기</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: 14, fontWeight: 600, width: 'calc((100% - 40px) / 5)' }}>신고 취소</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#666' }}>
                      신고 내역이 없습니다.
                    </td>
                  </tr>
                </tbody>
              </table>
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
    </div>
  );
}
