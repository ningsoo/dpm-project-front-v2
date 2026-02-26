'use client';

import { useState, type RefObject } from 'react';
import { Pencil, Heart, KeyRound, UserCog, Unplug, Fingerprint } from 'lucide-react';
import defaultProfileImg from '@/assets/site/profile.png';
import styles from './mypage.module.css';

export interface ProfileCardProps {
  profileUrl: string | null;
  nickname: string;
  email: string;
  phoneDisplay: string;
  popBalance: number;
  receivedLikes: number;
  passwordless: boolean;
  pwlsRegisterLoading: boolean;
  pwlsWithdrawalLoading: boolean;
  onPencilClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: () => void;
  onProfileEdit: () => void;
  onPwlsWithdraw: () => void;
  onPwlsRegister: (email: string) => void;
  fileInputRef: RefObject<HTMLInputElement>;
}

/** 마이페이지 전용 프로필 카드. 연필 hover는 내부 state, 나머지는 props/콜백으로 처리. */
export function ProfileCard({
  profileUrl,
  nickname,
  email,
  phoneDisplay,
  popBalance,
  receivedLikes,
  passwordless,
  pwlsRegisterLoading,
  pwlsWithdrawalLoading,
  onPencilClick,
  onFileChange,
  onPasswordChange,
  onProfileEdit,
  onPwlsWithdraw,
  onPwlsRegister,
  fileInputRef,
}: ProfileCardProps) {
  const [showPencilIcon, setShowPencilIcon] = useState(false);

  return (
    <section className={styles.profile}>
      <div
        className={`${styles.avatarWrap} ${styles.positionRelative}`}
        onMouseEnter={() => setShowPencilIcon(true)}
        onMouseLeave={() => setShowPencilIcon(false)}
      >
        <div className={styles.avatar}>
          <img
            src={profileUrl ? profileUrl : defaultProfileImg.src}
            alt=""
            className={`${styles.avatarImg} ${!profileUrl ? styles.avatarImgContain : ''}`}
          />
        </div>
        {showPencilIcon && (
          <button
            type="button"
            className={styles.avatarPencilBtn}
            onClick={onPencilClick}
          >
            <Pencil size={24} />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.inputHidden}
          onChange={onFileChange}
        />
      </div>
      <div className={styles.profileText}>
        <div className={styles.flexAlignCenterGap8}>
          <h1 className={styles.nickname}>{nickname}</h1>
          <div className={styles.profileLikesRow}>
            <Heart size={18} />
            <span>{receivedLikes}</span>
          </div>
        </div>
        <div className={styles.email}>{email}</div>
        <div className={styles.phone}>{phoneDisplay}</div>
        <div className={styles.credits}>POP {popBalance.toLocaleString('ko-KR')}</div>
      </div>
      <div className={styles.profileActions}>
        <button
          type="button"
          className={styles.iconLink}
          title="비밀번호 변경"
          onClick={onPasswordChange}
        >
          <KeyRound size={22} />
        </button>
        <button
          type="button"
          className={styles.iconLink}
          title="정보수정"
          onClick={onProfileEdit}
        >
          <UserCog size={22} />
        </button>
        {passwordless ? (
          <button
            type="button"
            className={styles.iconLink}
            title="패스워드리스 해지"
            disabled={pwlsWithdrawalLoading}
            onClick={onPwlsWithdraw}
          >
            <Unplug size={22} />
          </button>
        ) : (
          <button
            type="button"
            className={styles.iconLink}
            title="패스워드리스 등록"
            disabled={pwlsRegisterLoading}
            onClick={() => onPwlsRegister(email)}
          >
            <Fingerprint size={22} />
          </button>
        )}
      </div>
    </section>
  );
}
