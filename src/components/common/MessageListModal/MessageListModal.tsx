'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { messageApi, type MessageItem, type MessageType } from '@/api/messageApi';
import { formatCreatedDateTimeFull } from '@/utils/createdDateTime';
import { ToastUtils } from '@/utils/toastUtils';
import MessageSendModal from '@/components/board/PostDetail/MessageSendModal';
import styles from './MessageListModal.module.css';

const CONTENT_MAX_LENGTH = 15;

function truncateContent(content: string): string {
  if (!content || content.length <= CONTENT_MAX_LENGTH) return content;
  return `${content.slice(0, CONTENT_MAX_LENGTH)}...`;
}

type ViewMode = 'list' | 'detail';

interface MessageListModalProps {
  open: boolean;
  onClose: () => void;
  onLoginRequired?: () => void;
}

export default function MessageListModal({
  open,
  onClose,
  onLoginRequired,
}: MessageListModalProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeTab, setActiveTab] = useState<MessageType>('RECEIVED');
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailData, setDetailData] = useState<MessageItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);

  // 모달 닫힐 때 view 초기화
  useEffect(() => {
    if (!open) {
      setViewMode('list');
      setDetailData(null);
    }
  }, [open]);

  // 모달 오픈 시 및 탭 전환 시 API 호출 (리스트 화면에서만, 뒤로가기 시에는 재호출 없음)
  useEffect(() => {
    if (!open || viewMode !== 'list') return;

    setLoading(true);
    messageApi
      .getMessageList(activeTab)
      .then(({ data }) => {
        const list = data?.data;
        setMessages(Array.isArray(list) ? list : []);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        if (e?.response?.status === 403) {
          onClose();
          if (onLoginRequired) {
            onLoginRequired();
          } else {
            router.push('/auth/login');
          }
          ToastUtils.error('로그인이 필요합니다.');
          return;
        }
        console.error('[message list]', err);
        ToastUtils.error('쪽지 목록을 불러올 수 없습니다.');
        setMessages([]);
      })
      .finally(() => setLoading(false));
    // viewMode 제외: 뒤로가기 시 API 재호출 방지
  }, [open, activeTab]);

  const handleTabClick = (type: MessageType) => {
    setActiveTab(type);
  };

  const handleListItemClick = (messageId: number) => {
    setViewMode('detail');
    setDetailData(null);
    setDetailLoading(true);

    messageApi
      .getMessageDetail(messageId)
      .then(({ data }) => {
        const msg = data?.data;
        setDetailData(msg && typeof msg === 'object' ? (msg as MessageItem) : null);
      })
      .catch((err: unknown) => {
        const e = err as { response?: { status?: number } };
        const status = e?.response?.status;

        if (status === 403) {
          setViewMode('list');
          onClose();
          if (onLoginRequired) {
            onLoginRequired();
          } else {
            router.push('/auth/login');
          }
          ToastUtils.error('로그인이 필요합니다.');
          return;
        }

        if (status === 404) {
          ToastUtils.error('메시지를 찾을 수 없습니다.');
        } else {
          ToastUtils.error('메시지를 불러올 수 없습니다.');
        }
        setViewMode('list');
      })
      .finally(() => setDetailLoading(false));
  };

  const handleBackToList = () => {
    setViewMode('list');
    setDetailData(null);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (viewMode === 'detail') {
        handleBackToList();
      } else {
        onClose();
      }
    }
  };

  const handleClose = () => {
    setViewMode('list');
    setDetailData(null);
    onClose();
  };

  const getNickname = (item: MessageItem) =>
    activeTab === 'RECEIVED' ? item.sendingUserNickname : item.receivedUserNickname;

  if (!open) return null;

  const isReceived = activeTab === 'RECEIVED';
  const detailLabel = isReceived ? '보낸 회원' : '받은 회원';
  const detailNickname = detailData
    ? (isReceived ? detailData.sendingUserNickname : detailData.receivedUserNickname)
    : '';

  const modalContent = (
    <div
      className={`${styles.overlay} ${showReplyModal ? styles.overlayReplyOpen : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={viewMode === 'list' ? 'message-list-modal-title' : 'message-detail-modal-title'}
      onClick={handleBackdropClick}
    >
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        {viewMode === 'list' ? (
          <>
            <h2 id="message-list-modal-title" className={styles.title}>
              쪽지함
            </h2>

            <div className={styles.tabs}>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'RECEIVED' ? styles.tabActive : ''}`}
                onClick={() => handleTabClick('RECEIVED')}
              >
                받은 쪽지함
              </button>
              <button
                type="button"
                className={`${styles.tab} ${activeTab === 'SENT' ? styles.tabActive : ''}`}
                onClick={() => handleTabClick('SENT')}
              >
                보낸 쪽지함
              </button>
            </div>

            <div className={styles.listArea}>
              {loading ? (
                <div className={styles.loading}>로딩 중…</div>
              ) : messages.length === 0 ? (
                <div className={styles.empty}>쪽지가 없습니다.</div>
              ) : (
                <ul className={styles.list}>
                  {messages.map((item) => (
                    <li
                      key={item.messageId}
                      role="button"
                      tabIndex={0}
                      className={`${styles.listItem} ${item.isRead ? styles.listItemRead : ''} ${styles.listItemClickable}`}
                      onClick={() => handleListItemClick(item.messageId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleListItemClick(item.messageId);
                        }
                      }}
                    >
                      <div className={styles.itemHeader}>
                        <span className={styles.itemNickname}>{getNickname(item)}</span>
                        <span className={styles.itemDate}>
                          {formatCreatedDateTimeFull(item.createdDatetime)}
                        </span>
                      </div>
                      <p className={styles.itemContent}>{truncateContent(item.content)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 id="message-detail-modal-title" className={styles.title}>
              쪽지 상세
            </h2>

            <div className={styles.detailArea}>
              {detailLoading ? (
                <div className={styles.loading}>로딩 중…</div>
              ) : detailData ? (
                <>
                  <div className={styles.detailHeader}>
                    <span className={styles.detailLabel}>{detailLabel}</span>
                    <span className={styles.detailNickname}>{detailNickname}</span>
                    <span className={styles.detailDate}>
                      {formatCreatedDateTimeFull(detailData.createdDatetime)}
                    </span>
                  </div>
                  <div className={styles.detailBody}>
                    {detailData.content}
                  </div>
                  <div className={styles.detailActions}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBackToList}
                    >
                      뒤로가기
                    </button>
                    {isReceived && (
                      <button
                        type="button"
                        className={styles.replyBtn}
                        onClick={() => setShowReplyModal(true)}
                      >
                        답장
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className={styles.empty}>메시지를 불러올 수 없습니다.</div>
              )}
            </div>
          </>
        )}
      </div>

      {showReplyModal && detailData && isReceived && (
        <MessageSendModal
          open={showReplyModal}
          onClose={() => setShowReplyModal(false)}
          targetUserId={detailData.sendingUserId}
          targetNickname={detailData.sendingUserNickname}
          onSuccess={() => setShowReplyModal(false)}
          onLoginRequired={() => {
            setShowReplyModal(false);
            if (onLoginRequired) onLoginRequired();
          }}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
