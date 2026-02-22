'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard, Users, FileText, MessageSquare, HelpCircle,
  Flag, ShieldBan, Wallet, RotateCcw, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { RootState } from '@/store';
import { adminApi } from '@/api/adminApi';
import { ToastUtils } from '@/utils/toastUtils';
import { tokenUtils } from '@/utils/tokenUtils';
import styles from './admin.module.css';

/* ============================================================ */
/* Types                                                        */
/* ============================================================ */

interface PageResponse {
  content: unknown[];
  totalPages: number;
  totalElements: number;
  number: number;
}

/* ============================================================ */
/* Constants                                                    */
/* ============================================================ */

const SECTIONS = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'users', label: '회원관리', icon: Users },
  { id: 'boards', label: '게시글관리', icon: FileText },
  { id: 'comments', label: '댓글관리', icon: MessageSquare },
  { id: 'inquiries', label: '문의관리', icon: HelpCircle },
  { id: 'reports', label: '신고관리', icon: Flag },
  { id: 'penalties', label: '제재관리', icon: ShieldBan },
  { id: 'settlements', label: '정산관리', icon: Wallet },
  { id: 'cancelRequests', label: '후원 취소요청', icon: RotateCcw },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
const SECTION_IDS = SECTIONS.map((s) => s.id);

function getValidSection(param: string | null): SectionId {
  if (param && SECTION_IDS.includes(param as SectionId)) return param as SectionId;
  return 'dashboard';
}

const FADE_MS = 150;

/* ============================================================ */
/* Helpers                                                      */
/* ============================================================ */

function formatDate(d: string | null | undefined): string {
  if (!d) return '-';
  return d.slice(0, 10);
}

/** "yyyy-MM-dd HH:mm:ss" → 날짜 / 시간 두 줄 표시용 */
function formatDateAndTime(d: string | null | undefined): { date: string; time: string } {
  const s = d ? String(d).trim() : '';
  if (!s) return { date: '-', time: '-' };
  const sp = s.split(/\s+/);
  const date = sp[0] || '-';
  const time = sp[1] || '-';
  return { date, time };
}

function safeParse(data: unknown): PageResponse {
  const d = data as Record<string, unknown> | undefined;
  return {
    content: Array.isArray(d?.content) ? d.content as unknown[] : [],
    totalPages: typeof d?.totalPages === 'number' ? d.totalPages : 0,
    totalElements: typeof d?.totalElements === 'number' ? d.totalElements : 0,
    number: typeof d?.number === 'number' ? d.number : 0,
  };
}

function get(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
  return undefined;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '-';
  return String(v);
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

/* ============================================================ */
/* Pagination Component                                         */
/* ============================================================ */

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const start = Math.max(0, page - 2);
  const end = Math.min(totalPages - 1, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className={styles.pagination}>
      <button className={styles.pageBtn} disabled={page === 0} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          className={p === page ? styles.pageBtnActive : styles.pageBtn}
          onClick={() => onPage(p)}
        >
          {p + 1}
        </button>
      ))}
      <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

/* ============================================================ */
/* Section components                                           */
/* ============================================================ */

/* ── Dashboard ── */
function DashboardSection() {
  const [stats, setStats] = useState({ users: 0, boards: 0, inquiries: 0, reports: 0 });
  const [recentBoards, setRecentBoards] = useState<unknown[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      adminApi.getUsers({ page: 0 }).then((r) => safeParse(r.data?.data)),
      adminApi.getBoards({ page: 0 }).then((r) => safeParse(r.data?.data)),
      adminApi.getInquiries({ page: 0 }).then((r) => safeParse(r.data?.data)),
      adminApi.getReports({ page: 0 }).then((r) => safeParse(r.data?.data)),
    ]).then(([u, b, i, rp]) => {
      if (cancelled) return;
      setStats({
        users: u.totalElements,
        boards: b.totalElements,
        inquiries: i.totalElements,
        reports: rp.totalElements,
      });
      setRecentBoards(b.content.slice(0, 5));
      setRecentInquiries(i.content.slice(0, 5));
    }).catch(() => {
      if (!cancelled) ToastUtils.error('대시보드 데이터를 불러오지 못했습니다.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const cards = [
    { label: '전체 회원', value: stats.users, icon: <Users size={22} /> },
    { label: '전체 게시글', value: stats.boards, icon: <FileText size={22} /> },
    { label: '문의', value: stats.inquiries, icon: <HelpCircle size={22} /> },
    { label: '신고', value: stats.reports, icon: <Flag size={22} /> },
  ];

  return (
    <div className={styles.dashContent}>
      <div className={styles.dashCardsWrap}>
        <div className={styles.statCards}>
        {cards.map((c) => (
          <div key={c.label} className={styles.statCard}>
            <div className={styles.statIconWrap}>{c.icon}</div>
            <div className={styles.statInfo}>
              <p className={styles.statValue}>{c.value.toLocaleString()}</p>
              <p className={styles.statLabel}>{c.label}</p>
            </div>
          </div>
        ))}
        </div>
      </div>

      <h3 className={styles.dashSubTitle}>최근 게시글</h3>
      <div className={`${styles.tableGrid} ${styles.boardsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>카테고리</div><div>제목</div><div>작성일</div><div>작성자</div>
        </div>
        {recentBoards.map((b, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{i + 1}</div>
            <div className={styles.tableCell}>{str(get(b, 'category'))}</div>
            <div className={styles.tableCellLeft}>{str(get(b, 'title'))}</div>
            <div className={styles.tableCell}>{formatDate(str(get(b, 'createdAt')))}</div>
            <div className={styles.tableCell}>{str(get(b, 'author') ?? get(b, 'nickname'))}</div>
          </div>
        ))}
      </div>
      {!loading && recentBoards.length === 0 && <div className={styles.emptyState}>게시글이 없습니다.</div>}

      <h3 className={styles.dashSubTitle}>최근 문의</h3>
      <div className={`${styles.tableGrid} ${styles.inquiriesGrid}`}>
        <div className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableHeader}`}>
          <div>No</div><div>유형</div><div>제목</div><div>상세</div><div>처리 상태</div>
        </div>
        {recentInquiries.map((q, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{i + 1}</div>
            <div className={styles.tableCell}>{str(get(q, 'inquiryType'))}</div>
            <div className={styles.tableCellLeft}>{str(get(q, 'title'))}</div>
            <div className={styles.tableCell}>{str(get(q, 'details') ?? get(q, 'content'))}</div>
            <div className={styles.tableCell}>
              <StatusBadge status={str(get(q, 'inquiryStatus'))} />
            </div>
          </div>
        ))}
      </div>
      {!loading && recentInquiries.length === 0 && <div className={styles.emptyState}>문의가 없습니다.</div>}
    </div>
  );
}

/* ── StatusBadge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    PENDING: { cls: styles.statusPending, label: '대기' },
    ACTIVE: { cls: styles.statusActive, label: '활성' },
    PROCESSING: { cls: styles.statusProcessing, label: '처리중' },
    COMPLETED: { cls: styles.statusCompleted, label: '완료' },
    SUSPENDED: { cls: styles.statusSuspended, label: '정지' },
    REJECTED: { cls: styles.statusRejected, label: '거절' },
    APPROVED: { cls: styles.statusCompleted, label: '승인' },
    ANSWERED: { cls: styles.statusCompleted, label: '답변완료' },
    WAITING: { cls: styles.statusPending, label: '대기' },
    BANNED: { cls: styles.statusSuspended, label: '차단' },
  };
  const upper = status.toUpperCase();
  const info = map[upper] || { cls: styles.statusPending, label: status };
  return <span className={`${styles.statusBadge} ${info.cls}`}>{info.label}</span>;
}

/* ── Users Section ── */
function UsersSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ user: Record<string, unknown> } | null>(null);
  const [manageForm, setManageForm] = useState({ grade: '', role: '', status: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, s?: string, st?: string) => {
    setLoading(true);
    const params: { page: number; search?: string; status?: string } = { page: p };
    if (s) params.search = s;
    if (st) params.status = st;
    adminApi.getUsers(params)
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('회원 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const handleSearch = () => load(0, search, statusFilter);

  const openManage = (user: unknown) => {
    const u = user as Record<string, unknown>;
    setManageForm({
      grade: str(u.grade),
      role: str(u.role),
      status: str(u.status),
    });
    setModal({ user: u });
  };

  const handleManage = () => {
    if (!modal) return;
    setSubmitting(true);
    adminApi.manageUser(str(modal.user.userId ?? modal.user.id), manageForm)
      .then(() => {
        ToastUtils.success('회원 정보가 수정되었습니다.');
        setModal(null);
        load(page, search, statusFilter);
      })
      .catch(() => ToastUtils.error('회원 정보 수정에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={styles.filterBar}>
        <input
          className={styles.searchInput}
          placeholder="이메일 / 닉네임 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="SUSPENDED">정지</option>
          <option value="BANNED">차단</option>
        </select>
        <button className={styles.filterBtn} onClick={handleSearch}>검색</button>
      </div>

      <div className={`${styles.tableGrid} ${styles.usersGrid}`}>
        <div className={`${styles.tableGrid} ${styles.usersGrid} ${styles.tableHeader}`}>
          <div>No</div><div>이메일</div><div>닉네임</div><div>등급</div><div>역할</div><div>상태</div><div>관리</div>
        </div>
        {!loading && data.map((u, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.usersGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCellLeft}>{str(get(u, 'email'))}</div>
            <div className={styles.tableCell}>{str(get(u, 'nickname'))}</div>
            <div className={styles.tableCell}>{str(get(u, 'grade'))}</div>
            <div className={styles.tableCell}>{str(get(u, 'role'))}</div>
            <div className={styles.tableCell}><StatusBadge status={str(get(u, 'status'))} /></div>
            <div className={styles.tableCell}>
              <button className={styles.manageBtn} onClick={() => openManage(u)}>관리</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>회원이 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={(p) => load(p, search, statusFilter)} />

      {modal && createPortal(
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setModal(null)}><X size={18} /></button>
            <h3 className={styles.modalTitle}>회원 관리</h3>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>이메일</span>
              <span className={styles.detailValue}>{str(modal.user.email)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>닉네임</span>
              <span className={styles.detailValue}>{str(modal.user.nickname)}</span>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>등급</label>
              <select className={styles.modalSelect} value={manageForm.grade} onChange={(e) => setManageForm((f) => ({ ...f, grade: e.target.value }))}>
                <option value="BRONZE">BRONZE</option>
                <option value="SILVER">SILVER</option>
                <option value="GOLD">GOLD</option>
                <option value="PLATINUM">PLATINUM</option>
                <option value="DIAMOND">DIAMOND</option>
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>역할</label>
              <select className={styles.modalSelect} value={manageForm.role} onChange={(e) => setManageForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className={styles.modalField}>
              <label className={styles.modalLabel}>상태</label>
              <select className={styles.modalSelect} value={manageForm.status} onChange={(e) => setManageForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">활성</option>
                <option value="SUSPENDED">정지</option>
                <option value="BANNED">차단</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setModal(null)}>취소</button>
              <button className={styles.confirmBtn} disabled={submitting} onClick={handleManage}>
                {submitting ? '처리중...' : '저장'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Boards Section ── */
function BoardsSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, cat?: string) => {
    setLoading(true);
    const params: { page: number; category?: string } = { page: p };
    if (cat) params.category = cat;
    adminApi.getBoards(params)
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('게시글 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    adminApi.deleteBoard(deleteTarget)
      .then(() => {
        ToastUtils.success('게시글이 삭제되었습니다.');
        setDeleteTarget(null);
        load(page, categoryFilter);
      })
      .catch(() => ToastUtils.error('게시글 삭제에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={styles.filterBar}>
        <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">전체 카테고리</option>
          <option value="SHOWCASE">Showcase</option>
          <option value="SPOTLIGHT">Spotlight</option>
          <option value="PLAYLIST">Playlist</option>
          <option value="COMMUNITY">Community</option>
          <option value="REVIEW">Review</option>
        </select>
        <button className={styles.filterBtn} onClick={() => load(0, categoryFilter)}>검색</button>
      </div>

      <div className={`${styles.tableGrid} ${styles.boardsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>카테고리</div><div>제목</div><div>작성일</div><div>삭제</div>
        </div>
        {!loading && data.map((b, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.boardsGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCell}>{str(get(b, 'category'))}</div>
            <div className={styles.tableCellLeft}>{str(get(b, 'title'))}</div>
            <div className={styles.tableCell}>{formatDate(str(get(b, 'createdAt')))}</div>
            <div className={styles.tableCell}>
              <button className={styles.deleteBtn} onClick={() => setDeleteTarget(str(get(b, 'boardId') ?? get(b, 'id')))}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>게시글이 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={(p) => load(p, categoryFilter)} />

      {deleteTarget && createPortal(
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            <h3 className={styles.modalTitle}>게시글 삭제</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>이 게시글을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>취소</button>
              <button className={styles.confirmBtnDanger} disabled={submitting} onClick={handleDelete}>
                {submitting ? '처리중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Comments Section ── */
function CommentsSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    adminApi.getComments({ page: p })
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('댓글 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    adminApi.deleteComment(deleteTarget)
      .then(() => {
        ToastUtils.success('댓글이 삭제되었습니다.');
        setDeleteTarget(null);
        load(page);
      })
      .catch(() => ToastUtils.error('댓글 삭제에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={`${styles.tableGrid} ${styles.commentsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.commentsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>게시글</div><div>댓글 내용</div><div>작성일</div><div>삭제</div>
        </div>
        {!loading && data.map((c, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCellLeft}>{str(get(c, 'boardTitle') ?? get(c, 'boardId'))}</div>
            <div className={styles.tableCellLeft}>{str(get(c, 'content'))}</div>
            <div className={styles.tableCell}>{formatDate(str(get(c, 'createdAt')))}</div>
            <div className={styles.tableCell}>
              <button className={styles.deleteBtn} onClick={() => setDeleteTarget(str(get(c, 'commentId') ?? get(c, 'id')))}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>댓글이 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={load} />

      {deleteTarget && createPortal(
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setDeleteTarget(null)}><X size={18} /></button>
            <h3 className={styles.modalTitle}>댓글 삭제</h3>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>이 댓글을 정말 삭제하시겠습니까?</p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>취소</button>
              <button className={styles.confirmBtnDanger} disabled={submitting} onClick={handleDelete}>
                {submitting ? '처리중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Inquiries Section ── */
function InquiriesSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    adminApi.getInquiries({ page: p, size: 20, sort: 'createdAt,desc' })
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('문의 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const openDetail = (userInquiryId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setReply('');
    adminApi.getInquiry(userInquiryId)
      .then((r) => {
        const d = r.data?.data as Record<string, unknown>;
        setDetail(d || {});
      })
      .catch(() => ToastUtils.error('문의 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handleReply = () => {
    if (!detail) return;
    setSubmitting(true);
    const id = str(detail.userInquiryId ?? detail.inquiryId ?? detail.id);
    adminApi.completeInquiry(id, { adminComment: reply })
      .then(() => {
        ToastUtils.success('답변이 등록되었습니다.');
        setDetail(null);
        load(page);
      })
      .catch(() => ToastUtils.error('답변 등록에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={`${styles.tableGrid} ${styles.inquiriesGrid}`}>
        <div className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableHeader}`}>
          <div>No</div><div>유형</div><div>제목</div><div>상세</div><div>처리 상태</div>
        </div>
        {!loading && data.map((q, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.inquiriesGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCell}>{str(get(q, 'inquiryType'))}</div>
            <div className={styles.tableCellLeft}>{str(get(q, 'title'))}</div>
            <div className={styles.tableCell}>
              <button className={styles.inquiriesDetailBtn} onClick={() => openDetail(str(get(q, 'userInquiryId') ?? get(q, 'inquiryId') ?? get(q, 'id')))}>상세</button>
            </div>
            <div className={styles.tableCell}><StatusBadge status={str(get(q, 'commentStatus') ?? get(q, 'inquiryStatus') ?? get(q, 'status'))} /></div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>문의가 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={load} />

      {(detail || detailLoading) && createPortal(
        <div className={styles.modalOverlay} onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => { setDetail(null); setDetailLoading(false); }}><X size={18} /></button>
            <h3 className={styles.modalTitle}>문의 상세</h3>
            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: '60%', height: 16 }} />
              </div>
            ) : detail ? (
              <>
                <div className={styles.detailRow}><span className={styles.detailLabel}>유형</span><span className={styles.detailValue}>{str(detail.inquiryType)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>제목</span><span className={styles.detailValue}>{str(detail.title)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>내용</span><span className={styles.detailValue}>{str(detail.content)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>처리 상태</span><span className={styles.detailValue}><StatusBadge status={str(detail.commentStatus ?? detail.inquiryStatus ?? detail.status)} /></span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>작성일</span><span className={styles.detailValue}>{formatDate(str(detail.createdAt))}</span></div>
                {detail.adminComment && (
                  <div className={styles.detailRow}><span className={styles.detailLabel}>답변</span><span className={styles.detailValue}>{str(detail.adminComment)}</span></div>
                )}
                {!detail.adminComment && str(detail.commentStatus ?? detail.inquiryStatus ?? detail.status).toUpperCase() !== 'COMPLETED' && (
                  <>
                    <div className={styles.modalField} style={{ marginTop: 16 }}>
                      <label className={styles.modalLabel}>답변 작성</label>
                      <textarea className={styles.modalTextarea} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="답변을 입력하세요..." />
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.cancelBtn} onClick={() => setDetail(null)}>취소</button>
                      <button className={styles.confirmBtn} disabled={submitting || !reply.trim()} onClick={handleReply}>
                        {submitting ? '처리중...' : '답변 등록'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Reports Section ── */
function ReportsSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [penaltyForm, setPenaltyForm] = useState({ reason: '', type: 'WARNING', until: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, st?: string) => {
    setLoading(true);
    const params: { page: number; status?: string } = { page: p };
    if (st) params.status = st;
    adminApi.getReports(params)
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('신고 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const openDetail = (reportId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setPenaltyForm({ reason: '', type: 'WARNING', until: '' });
    adminApi.getReport(reportId)
      .then((r) => {
        const d = r.data?.data as Record<string, unknown>;
        setDetail(d || {});
      })
      .catch(() => ToastUtils.error('신고 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handlePenalize = () => {
    if (!detail) return;
    const userId = str(detail.reportedUserId ?? detail.targetUserId ?? detail.userId);
    if (!userId || userId === '-') {
      ToastUtils.error('제재 대상 사용자를 확인할 수 없습니다.');
      return;
    }
    setSubmitting(true);
    const body: { reason: string; type: string; until?: string } = {
      reason: penaltyForm.reason,
      type: penaltyForm.type,
    };
    if (penaltyForm.until) body.until = penaltyForm.until;
    adminApi.penalizeUser(userId, body)
      .then(() => {
        ToastUtils.success('제재가 적용되었습니다.');
        setDetail(null);
        load(page, statusFilter);
      })
      .catch(() => ToastUtils.error('제재 적용에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={styles.filterBar}>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="PROCESSING">처리중</option>
          <option value="COMPLETED">완료</option>
        </select>
        <button className={styles.filterBtn} onClick={() => load(0, statusFilter)}>검색</button>
      </div>

      <div className={`${styles.tableGrid} ${styles.reportsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>대상자</div><div>신고 내용</div><div>상세</div><div>처리 상태</div>
        </div>
        {!loading && data.map((r, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.reportsGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCell}>{str(get(r, 'reportedNickname') ?? get(r, 'targetNickname'))}</div>
            <div className={styles.tableCellLeft}>{str(get(r, 'content') ?? get(r, 'reason'))}</div>
            <div className={styles.tableCell}>
              <button className={styles.detailBtn} onClick={() => openDetail(str(get(r, 'reportId') ?? get(r, 'id')))}>상세</button>
            </div>
            <div className={styles.tableCell}><StatusBadge status={str(get(r, 'reportStatus') ?? get(r, 'status'))} /></div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>신고가 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={(p) => load(p, statusFilter)} />

      {(detail || detailLoading) && createPortal(
        <div className={styles.modalOverlay} onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => { setDetail(null); setDetailLoading(false); }}><X size={18} /></button>
            <h3 className={styles.modalTitle}>신고 상세</h3>
            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
              </div>
            ) : detail ? (
              <>
                <div className={styles.detailRow}><span className={styles.detailLabel}>신고 내용</span><span className={styles.detailValue}>{str(detail.content ?? detail.reason)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>대상자</span><span className={styles.detailValue}>{str(detail.reportedNickname ?? detail.targetNickname)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>상태</span><span className={styles.detailValue}><StatusBadge status={str(detail.reportStatus ?? detail.status)} /></span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>작성일</span><span className={styles.detailValue}>{formatDate(str(detail.createdAt))}</span></div>

                {str(detail.reportStatus ?? detail.status).toUpperCase() !== 'COMPLETED' && (
                  <>
                    <h4 style={{ margin: '20px 0 12px', fontSize: '0.95rem', fontWeight: 600 }}>제재 적용</h4>
                    <div className={styles.modalField}>
                      <label className={styles.modalLabel}>제재 유형</label>
                      <select className={styles.modalSelect} value={penaltyForm.type} onChange={(e) => setPenaltyForm((f) => ({ ...f, type: e.target.value }))}>
                        <option value="WARNING">경고</option>
                        <option value="SUSPENSION">정지</option>
                        <option value="BAN">차단</option>
                      </select>
                    </div>
                    <div className={styles.modalField}>
                      <label className={styles.modalLabel}>사유</label>
                      <textarea className={styles.modalTextarea} value={penaltyForm.reason} onChange={(e) => setPenaltyForm((f) => ({ ...f, reason: e.target.value }))} placeholder="제재 사유를 입력하세요..." />
                    </div>
                    {penaltyForm.type === 'SUSPENSION' && (
                      <div className={styles.modalField}>
                        <label className={styles.modalLabel}>종료일</label>
                        <input type="date" className={styles.modalInput} value={penaltyForm.until} onChange={(e) => setPenaltyForm((f) => ({ ...f, until: e.target.value }))} />
                      </div>
                    )}
                    <div className={styles.modalActions}>
                      <button className={styles.cancelBtn} onClick={() => setDetail(null)}>취소</button>
                      <button className={styles.confirmBtnDanger} disabled={submitting || !penaltyForm.reason.trim()} onClick={handlePenalize}>
                        {submitting ? '처리중...' : '제재 적용'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Penalties Section ── */
function PenaltiesSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback((p: number) => {
    setLoading(true);
    adminApi.getPenalties({ page: p })
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('제재 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const openDetail = (userId: string) => {
    setDetailLoading(true);
    setDetail(null);
    adminApi.getPenalty(userId)
      .then((r) => {
        const d = r.data?.data as Record<string, unknown>;
        setDetail(d || {});
      })
      .catch(() => ToastUtils.error('제재 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  return (
    <>
      <div className={`${styles.tableGrid} ${styles.penaltiesGrid}`}>
        <div className={`${styles.tableGrid} ${styles.penaltiesGrid} ${styles.tableHeader}`}>
          <div>No</div><div>대상자</div><div>사유</div><div>유형</div><div>종료일</div>
        </div>
        {!loading && data.map((p, i) => (
          <div key={i} className={`${styles.tableGrid} ${styles.penaltiesGrid} ${styles.tableRow}`}>
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCellLeft}>{str(get(p, 'nickname') ?? get(p, 'targetNickname'))}</div>
            <div className={styles.tableCellLeft}>{str(get(p, 'reason'))}</div>
            <div className={styles.tableCell}>{str(get(p, 'penaltyType') ?? get(p, 'type'))}</div>
            <div className={styles.tableCell}>{formatDate(str(get(p, 'endDate') ?? get(p, 'until')))}</div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>제재 내역이 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={load} />

      {(detail || detailLoading) && createPortal(
        <div className={styles.modalOverlay} onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => { setDetail(null); setDetailLoading(false); }}><X size={18} /></button>
            <h3 className={styles.modalTitle}>제재 상세</h3>
            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
              </div>
            ) : detail ? (
              <>
                <div className={styles.detailRow}><span className={styles.detailLabel}>대상자</span><span className={styles.detailValue}>{str(detail.nickname ?? detail.targetNickname)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>유형</span><span className={styles.detailValue}>{str(detail.penaltyType ?? detail.type)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>사유</span><span className={styles.detailValue}>{str(detail.reason)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>시작일</span><span className={styles.detailValue}>{formatDate(str(detail.startDate ?? detail.createdAt))}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>종료일</span><span className={styles.detailValue}>{formatDate(str(detail.endDate ?? detail.until))}</span></div>
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Cancel Requests Section (후원 취소요청) ── */
function CancelRequestsSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [processedCache, setProcessedCache] = useState<Map<string, Record<string, unknown>>>(new Map());

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getCancelRequests()
      .then((r) => {
        const raw = r.data?.data;
        const list = Array.isArray(raw) ? raw : [];
        setData(list);
      })
      .catch(() => ToastUtils.error('취소 요청 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = (transactionId: string, item: Record<string, unknown>) => {
    setSubmitting(true);
    setApproveTarget(transactionId);
    adminApi.approveCancelDonation(transactionId)
      .then(() => {
        ToastUtils.success('취소가 승인되었습니다.');
        setProcessedCache((prev) => new Map(prev).set(transactionId, { ...item }));
        setApprovedIds((prev) => new Set([...prev, transactionId]));
        setApproveTarget(null);
        load();
      })
      .catch(() => {
        ToastUtils.error('취소 승인에 실패했습니다.');
        setApproveTarget(null);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={styles.cancelRequestsTableWrap}>
      <div className={`${styles.tableGrid} ${styles.cancelRequestsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.cancelRequestsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>요청자</div><div>수혜자</div><div>후원금액</div><div>요청일시</div><div>승인</div>
        </div>
        {!loading && (() => {
          const apiIds = new Set(data.map((d) => str(get(d, 'transactionId'))));
          const cachedOnly = Array.from(processedCache.values()).filter(
            (p) => !apiIds.has(str(get(p, 'transactionId')))
          );
          const displayItems = [...data, ...cachedOnly];
          return displayItems.map((item, i) => {
          const txId = str(get(item, 'transactionId'));
          const isSubmitting = submitting && approveTarget === txId;
          const isApproved = approvedIds.has(txId) || ['CANCELLED', 'COMPLETED', 'APPROVED'].includes(String(get(item, 'popStatus')).toUpperCase());
          return (
            <div key={i} className={`${styles.tableGrid} ${styles.cancelRequestsGrid} ${styles.tableRow}`}>
              <div className={styles.tableCell}>{i + 1}</div>
              <div className={styles.tableCell}>{str(get(item, 'donatorNickname'))}</div>
              <div className={styles.tableCell}>{str(get(item, 'receiverNickname'))}</div>
              <div className={styles.tableCell}>{num(get(item, 'donationAmount')).toLocaleString()}원</div>
              <div className={`${styles.tableCell} ${styles.cellDateTime}`}>
                {(() => {
                  const { date, time } = formatDateAndTime(get(item, 'cancelRequestDate'));
                  return <><span>{date}</span><span>{time}</span></>;
                })()}
              </div>
              <div className={styles.tableCell}>
                {isApproved ? (
                  <StatusBadge status="COMPLETED" />
                ) : (
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(txId, item as Record<string, unknown>)}
                    disabled={isSubmitting || !txId || txId === '-'}
                  >
                    {isSubmitting ? '처리중...' : '승인'}
                  </button>
                )}
              </div>
            </div>
          );
        });
        })()}
      </div>
      </div>
      {!loading && data.length === 0 && processedCache.size === 0 && <div className={styles.emptyState}>취소 요청 내역이 없습니다.</div>}
    </>
  );
}

/* ── Settlements Section ── */
function SettlementsSection() {
  const [data, setData] = useState<unknown[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback((p: number, st?: string) => {
    setLoading(true);
    const params: { page: number; status?: string } = { page: p };
    if (st) params.status = st;
    adminApi.getSettlements(params)
      .then((r) => {
        const parsed = safeParse(r.data?.data);
        setData(parsed.content);
        setTotalPages(parsed.totalPages);
        setPage(parsed.number);
      })
      .catch(() => ToastUtils.error('정산 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(0); }, [load]);

  const openDetail = (boardId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setMemo('');
    adminApi.getSettlement(boardId)
      .then((r) => {
        const d = r.data?.data as Record<string, unknown>;
        setDetail(d || {});
      })
      .catch(() => ToastUtils.error('정산 상세를 불러오지 못했습니다.'))
      .finally(() => setDetailLoading(false));
  };

  const handleApprove = () => {
    if (!detail) return;
    const boardId = str(detail.boardId ?? detail.id);
    setSubmitting(true);
    adminApi.approveSettlement(boardId, memo ? { memo } : undefined)
      .then(() => {
        ToastUtils.success('정산이 승인되었습니다.');
        setDetail(null);
        load(page, statusFilter);
      })
      .catch(() => ToastUtils.error('정산 승인에 실패했습니다.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <>
      <div className={styles.filterBar}>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="PENDING">대기</option>
          <option value="APPROVED">승인</option>
          <option value="REJECTED">거절</option>
        </select>
        <button className={styles.filterBtn} onClick={() => load(0, statusFilter)}>검색</button>
      </div>

      <div className={`${styles.tableGrid} ${styles.settlementsGrid}`}>
        <div className={`${styles.tableGrid} ${styles.settlementsGrid} ${styles.tableHeader}`}>
          <div>No</div><div>사용자</div><div>금액</div><div>승인날짜</div><div>처리 상태</div>
        </div>
        {!loading && data.map((s, i) => (
          <div
            key={i}
            className={`${styles.tableGrid} ${styles.settlementsGrid} ${styles.tableRow}`}
            role="button"
            tabIndex={0}
            aria-label={`정산 상세 보기: ${str(get(s, 'boardTitle') ?? get(s, 'title'))}`}
            onClick={() => openDetail(str(get(s, 'boardId') ?? get(s, 'id')))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(str(get(s, 'boardId') ?? get(s, 'id'))); } }}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.tableCell}>{page * 10 + i + 1}</div>
            <div className={styles.tableCell}>{str(get(s, 'nickname') ?? get(s, 'authorNickname') ?? get(s, 'boardTitle') ?? get(s, 'title'))}</div>
            <div className={styles.tableCell}>{num(get(s, 'amount')).toLocaleString()}원</div>
            <div className={styles.tableCell}>{formatDate(str(get(s, 'approvedAt') ?? get(s, 'settlementApprovedAt') ?? get(s, 'updatedAt')))}</div>
            <div className={styles.tableCell}><StatusBadge status={str(get(s, 'settlementStatus') ?? get(s, 'status'))} /></div>
          </div>
        ))}
      </div>
      {!loading && data.length === 0 && <div className={styles.emptyState}>정산 내역이 없습니다.</div>}
      <Pagination page={page} totalPages={totalPages} onPage={(p) => load(p, statusFilter)} />

      {(detail || detailLoading) && createPortal(
        <div className={styles.modalOverlay} onClick={() => { setDetail(null); setDetailLoading(false); }}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => { setDetail(null); setDetailLoading(false); }}><X size={18} /></button>
            <h3 className={styles.modalTitle}>정산 상세</h3>
            {detailLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.skeletonBar} style={{ width: '100%', height: 16 }} />
                <div className={styles.skeletonBar} style={{ width: '80%', height: 16 }} />
              </div>
            ) : detail ? (
              <>
                <div className={styles.detailRow}><span className={styles.detailLabel}>게시글</span><span className={styles.detailValue}>{str(detail.boardTitle ?? detail.title)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>작성자</span><span className={styles.detailValue}>{str(detail.nickname ?? detail.authorNickname)}</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>금액</span><span className={styles.detailValue}>{num(detail.amount).toLocaleString()}원</span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>상태</span><span className={styles.detailValue}><StatusBadge status={str(detail.settlementStatus ?? detail.status)} /></span></div>
                <div className={styles.detailRow}><span className={styles.detailLabel}>요청일</span><span className={styles.detailValue}>{formatDate(str(detail.requestedAt ?? detail.createdAt))}</span></div>

                {str(detail.settlementStatus ?? detail.status).toUpperCase() === 'PENDING' && (
                  <>
                    <div className={styles.modalField} style={{ marginTop: 16 }}>
                      <label className={styles.modalLabel}>메모 (선택)</label>
                      <textarea className={styles.modalTextarea} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="승인 메모를 입력하세요..." />
                    </div>
                    <div className={styles.modalActions}>
                      <button className={styles.cancelBtn} onClick={() => setDetail(null)}>취소</button>
                      <button className={styles.confirmBtnApprove} disabled={submitting} onClick={handleApprove}>
                        {submitting ? '처리중...' : '승인'}
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/* ============================================================ */
/* Main Admin Page Content                                      */
/* ============================================================ */

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);

  const [section, setSection] = useState<SectionId>(() => getValidSection(sectionParam));
  const [displayedSection, setDisplayedSection] = useState<SectionId>(section);
  const [sectionVisible, setSectionVisible] = useState(true);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [pageReady, setPageReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  /* ── Auth guard ── */
  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.replace('/auth/adm1n/login');
      return;
    }
    const role = tokenUtils.getRoleFromAccessToken();
    if (role !== 'ADMIN') {
      ToastUtils.error('관리자 권한이 필요합니다.');
      router.replace('/');
      return;
    }
    setAuthChecked(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPageReady(true);
      });
    });
  }, [initialized, isAuthenticated, router]);

  /* ── URL sync ── */
  useEffect(() => {
    const next = getValidSection(searchParams.get('section'));
    setSection(next);
  }, [searchParams]);

  /* ── Fade section switch ── */
  const switchSection = useCallback((next: SectionId) => {
    if (next === displayedSection) return;
    setSectionVisible(false);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setDisplayedSection(next);
      requestAnimationFrame(() => setSectionVisible(true));
    }, FADE_MS);
  }, [displayedSection]);

  useEffect(() => {
    switchSection(section);
  }, [section, switchSection]);

  useEffect(() => {
    return () => { if (fadeRef.current) clearTimeout(fadeRef.current); };
  }, []);

  const handleNav = (id: SectionId) => {
    setSection(id);
    router.replace(`/adm1n?section=${id}`, { scroll: false });
  };

  /* ── Auth 미완료 시 빈 화면 ── */
  if (!initialized || !authChecked) {
    return null;
  }

  const sectionTitle: Record<SectionId, string> = {
    dashboard: '대시보드',
    users: '회원관리',
    boards: '게시글관리',
    comments: '댓글관리',
    inquiries: '문의관리',
    reports: '신고관리',
    penalties: '제재관리',
    settlements: '정산관리',
    cancelRequests: '후원 취소요청',
  };

  const renderSection = () => {
    switch (displayedSection) {
      case 'dashboard': return <DashboardSection />;
      case 'users': return <UsersSection />;
      case 'boards': return <BoardsSection />;
      case 'comments': return <CommentsSection />;
      case 'inquiries': return <InquiriesSection />;
      case 'reports': return <ReportsSection />;
      case 'penalties': return <PenaltiesSection />;
      case 'settlements': return <SettlementsSection />;
      case 'cancelRequests': return <CancelRequestsSection />;
      default: return <DashboardSection />;
    }
  };

  return (
    <div className={styles.adminWrap} style={{ opacity: pageReady ? 1 : 0, transition: 'opacity 0.3s ease' }}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 className={styles.sidebarTitle}>관리자</h2>
        <nav className={styles.sidebarNav}>
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                className={section === s.id ? styles.navItemActive : styles.navItem}
                onClick={() => handleNav(s.id)}
              >
                <Icon size={16} />
                {s.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Content */}
      <main className={styles.contentArea}>
        <h1 className={styles.sectionTitle}>{sectionTitle[displayedSection]}</h1>
        <div className={`${styles.sectionContent} ${sectionVisible ? styles.contentVisible : styles.contentHidden}`}>
          {renderSection()}
        </div>
      </main>
    </div>
  );
}

/* ============================================================ */
/* Export with Suspense boundary                                */
/* ============================================================ */

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <AdminPageContent />
    </Suspense>
  );
}
