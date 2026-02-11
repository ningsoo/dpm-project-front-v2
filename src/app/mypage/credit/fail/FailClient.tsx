'use client';

import { useRouter } from 'next/navigation';
import creditStyles from '../credit.module.css';

export default function FailClient() {
  const router = useRouter();

  return (
    <div className={creditStyles.wrap}>
      <div className={creditStyles.inner}>
        <h1 className={creditStyles.title}>결제에 실패했습니다</h1>
        <p style={{ margin: '16px 0', color: '#666' }}>
          결제가 완료되지 않았습니다. 다시 시도하거나 마이페이지에서 충전을 진행해 주세요.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={creditStyles.submitBtn}
            onClick={() => router.back()}
          >
            뒤로가기
          </button>
          <button
            type="button"
            className={creditStyles.submitBtn}
            onClick={() => router.push('/mypage')}
          >
            마이페이지로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
