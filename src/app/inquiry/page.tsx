'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { X } from 'lucide-react';
import { RootState } from '@/store';
import { inquiryApi, type InquiryType } from '@/api/inquiryApi';
import { ToastUtils } from '@/utils/toastUtils';
import styles from './inquiry.module.css';

const INQUIRY_TYPE_OPTIONS: { value: InquiryType; label: string }[] = [
  { value: 'USER', label: '계정/제재' },
  { value: 'PAYMENT', label: '결제/재화' },
  { value: 'DONATION', label: '후원' },
  { value: 'POST', label: '게시물/작업물' },
  { value: 'API', label: '외부 서비스 연동' },
  { value: 'ETC', label: '기타' },
];

const FILENAME_REGEX = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ._-]+$/;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function countCharsNoWhitespace(str: string): number {
  return str.replace(/\s/g, '').length;
}

export default function InquiryPage() {
  const router = useRouter();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const initialized = useSelector((s: RootState) => s.auth.initialized);
  const darkMode = useSelector((s: RootState) => s.ui.darkMode);

  const [inquiryType, setInquiryType] = useState<InquiryType | ''>('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!initialized) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [initialized, isAuthenticated, router]);

  if (!initialized) {
    return <div className={styles.loadingWrap}>로딩 중...</div>;
  }

  const validateTitle = (): string => {
    const trimmedLen = countCharsNoWhitespace(title);
    if (trimmedLen === 0) return '';
    if (trimmedLen < 2) return '제목은 공백을 제외하고 최소 2자 이상 입력해주세요.';
    return '';
  };

  const validateContent = (): string => {
    const trimmedLen = countCharsNoWhitespace(content);
    if (trimmedLen === 0) return '';
    if (trimmedLen < 10) return '내용은 공백을 제외하고 최소 10자 이상 입력해주세요.';
    return '';
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};

    if (!inquiryType) {
      errs.inquiryType = '문의 항목을 선택해주세요.';
    }

    if (countCharsNoWhitespace(title) < 2) {
      errs.title = '제목은 공백을 제외하고 최소 2자 이상 입력해주세요.';
    }

    if (countCharsNoWhitespace(content) < 10) {
      errs.content = '내용은 공백을 제외하고 최소 10자 이상 입력해주세요.';
    }

    if (attachment) {
      const normalizedName = attachment.name.normalize('NFC').trim();
      if (!FILENAME_REGEX.test(normalizedName)) {
        errs.attachment = '파일명에 특수문자나 공백이 포함되어 있습니다.';
      }
      if (attachment.size > MAX_FILE_SIZE) {
        errs.attachment = '파일 크기가 20MB를 초과합니다.';
      }
    }

    return errs;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      // 파일 탐색기에서 취소 → 기존 첨부 파일 상태 유지
      return;
    }

    const normalizedName = file.name.normalize('NFC').trim();
    if (!FILENAME_REGEX.test(normalizedName)) {
      setErrors((prev) => ({ ...prev, attachment: '파일명에 특수문자나 공백이 포함되어 있습니다.' }));
      e.target.value = '';
      setAttachment(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, attachment: '파일 크기가 20MB를 초과합니다.' }));
      e.target.value = '';
      setAttachment(null);
      return;
    }

    setAttachment(file);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });
  };

  const handleRemoveFile = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrors((prev) => {
      const next = { ...prev };
      delete next.attachment;
      return next;
    });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    const trimmedLen = countCharsNoWhitespace(e.target.value);
    if (trimmedLen >= 2) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.title;
        return next;
      });
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const trimmedLen = countCharsNoWhitespace(e.target.value);
    if (trimmedLen >= 10) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.content;
        return next;
      });
    }
  };

  const handleTitleBlur = () => {
    const err = validateTitle();
    if (err) {
      setErrors((prev) => ({ ...prev, title: err }));
    }
  };

  const handleContentBlur = () => {
    const err = validateContent();
    if (err) {
      setErrors((prev) => ({ ...prev, content: err }));
    }
  };

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setShowConfirmModal(true);
  };

  const handleConfirm = async () => {
    if (!inquiryType) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      // Step 1: 파일이 있으면 S3에 업로드
      let fileUrl: string | null = null;
      let fileKey: string | null = null;
      let isImage: boolean | null = null;

      if (attachment) {
        try {
          const uploadRes = await inquiryApi.uploadFile(attachment);
          const uploadData = uploadRes.data?.data;
          fileUrl = uploadData?.fileUrl ?? null;
          fileKey = uploadData?.fileKey ?? null;
          isImage = uploadData?.isImage ?? null;
        } catch {
          ToastUtils.error('파일 업로드에 실패했습니다.');
          setSubmitting(false);
          return;
        }
      }

      // Step 2: 문의 등록 (JSON)
      await inquiryApi.createInquiry({
        inquiryType,
        title,
        content,
        fileUrl,
        fileKey,
        isImage,
      });
      ToastUtils.success('1대1 문의가 등록되었습니다.');
      router.push('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || '문의 등록에 실패했습니다.';
      ToastUtils.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title || content || attachment) {
      if (!window.confirm('작성 중인 내용이 삭제됩니다. 취소하시겠습니까?')) return;
    }
    router.back();
  };

  const rootClass = `${styles.container} ${darkMode ? styles.dark : ''}`;

  return (
    <div className={rootClass}>
      <div className={styles.inquiryWrapper}>
        <h1 className={styles.pageTitle}>1대1 문의하기</h1>
        <p className={styles.pageDescription}>
          문의하실 내용을 작성해주세요. 빠른 시일 내에 답변 드리겠습니다.
        </p>

        <form onSubmit={handleSubmitClick}>
          {/* 문의 항목 */}
          <div className={styles.formGroup}>
            <label htmlFor="inquiryType">
              문의 항목 <span className={styles.required}>*</span>
            </label>
            <select
              id="inquiryType"
              className={`${styles.select} ${errors.inquiryType ? styles.inputError : ''}`}
              value={inquiryType}
              onChange={(e) => {
                setInquiryType(e.target.value as InquiryType);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.inquiryType;
                  return next;
                });
              }}
            >
              <option value="">문의 항목을 선택해주세요</option>
              {INQUIRY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.inquiryType && (
              <span className={styles.errorMessage}>{errors.inquiryType}</span>
            )}
          </div>

          {/* 문의 제목 */}
          <div className={styles.formGroup}>
            <label htmlFor="inquiryTitle">
              문의 제목 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              id="inquiryTitle"
              className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
              placeholder="문의 제목을 입력해주세요 (최소 2자 이상)"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
            />
            {errors.title && (
              <span className={styles.errorMessage}>{errors.title}</span>
            )}
            <span className={styles.charCount}>
              {countCharsNoWhitespace(title)}자
            </span>
          </div>

          {/* 문의 내용 */}
          <div className={styles.formGroup}>
            <label htmlFor="inquiryContent">
              문의 내용 <span className={styles.required}>*</span>
            </label>
            <textarea
              id="inquiryContent"
              className={`${styles.textarea} ${errors.content ? styles.inputError : ''}`}
              rows={10}
              placeholder="문의 내용을 상세히 입력해주세요 (최소 10자 이상)"
              value={content}
              onChange={handleContentChange}
              onBlur={handleContentBlur}
            />
            {errors.content && (
              <span className={styles.errorMessage}>{errors.content}</span>
            )}
            <span className={styles.charCount}>
              {countCharsNoWhitespace(content)}자
            </span>
          </div>

          {/* 첨부파일 */}
          <div className={styles.formGroup}>
            <label>
              첨부파일 <span className={styles.optional}>(선택사항, 최대 20MB)</span>
            </label>
            <div className={styles.fileUploadWrapper}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.doc,.docx"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className={styles.fileSelectBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                파일 선택
              </button>
              <span className={styles.fileName}>
                {attachment ? attachment.name : '선택된 파일 없음'}
              </span>
              {attachment && (
                <button
                  type="button"
                  className={styles.fileRemoveBtn}
                  onClick={handleRemoveFile}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {errors.attachment && (
              <span className={styles.errorMessage}>{errors.attachment}</span>
            )}
            <p className={styles.fileInfo}>
              ※ 파일명에 특수문자, 공백이 포함되거나 20MB를 초과하는 파일은 업로드할 수 없습니다.
            </p>
          </div>

          {/* 버튼 영역 */}
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCancel}`}
              onClick={handleCancel}
            >
              취소
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnSubmit}`}
              disabled={submitting}
            >
              {submitting ? '등록 중...' : '등록'}
            </button>
          </div>
        </form>
      </div>

      {/* 확인 모달 */}
      {showConfirmModal && (
        <div
          className={styles.modal}
          onClick={() => setShowConfirmModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>문의 등록 확인</h3>
            </div>
            <div className={styles.modalBody}>
              <p>문의 작성을 완료하시겠습니까?</p>
              <p className={styles.modalWarning}>등록 후 수정이 불가합니다.</p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnModalCancel}
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.btnModalConfirm}
                onClick={handleConfirm}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
