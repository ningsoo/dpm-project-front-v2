'use client';

import React from 'react';
import { Search } from 'lucide-react';
import styles from './mypage.module.css';

export interface MypageSkeletonTab {
  id: string;
  label: string;
}

export interface MypageSkeletonProps {
  activeTab: string;
  tabs: ReadonlyArray<MypageSkeletonTab>;
  dateInputMax: string;
  dateInputDefaultStart: string;
  popSubTab: 'usage' | 'purchase';
  donationSubTab: 'sent' | 'received';
  settlementSubTab: 'history' | 'register' | 'request';
}

function getSkeletonBarWidthClass(stylesObj: Record<string, string>, w: string): string {
  const key = `skeletonBarW${(w || '60%').replace('%', '')}`;
  return stylesObj[key] || stylesObj.skeletonBarW60 || '';
}

/** 표시 전용: 마이페이지 로딩 시 스켈레톤 UI. state/effect/router/클릭 없음. */
export function MypageSkeleton({
  activeTab,
  tabs,
  dateInputMax,
  dateInputDefaultStart,
  popSubTab,
  donationSubTab,
  settlementSubTab,
}: MypageSkeletonProps) {
  const t = activeTab;

  const skeletonTableRow = (gridClass: string, cols: number, widths: string[]) =>
    Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className={`${styles.tableGrid} ${gridClass} ${styles.tableRow}`}>
        {Array.from({ length: cols }).map((__, c) => (
          <div key={c} className={styles.tableCell}>
            <div className={`${styles.skeletonBar} ${getSkeletonBarWidthClass(styles as Record<string, string>, widths[c])}`} />
          </div>
        ))}
      </div>
    ));

  const searchBarEl = (
    <div className={styles.searchBarWrap}>
      <input type="text" placeholder="검색어 입력" disabled className={styles.searchInput} />
      <span className={styles.searchInputIcon}><Search size={18} /></span>
    </div>
  );

  const dateRowEl = (
    <div className={styles.dateRow}>
      <input type="date" defaultValue={dateInputDefaultStart} disabled max={dateInputMax} className={styles.dateInput} />
      <span className={styles.dateTilde}>~</span>
      <input type="date" defaultValue={dateInputMax} disabled max={dateInputMax} className={styles.dateInput} />
      <button type="button" disabled className={styles.filterBtn}>조회</button>
    </div>
  );

  const settlementDateRowEl = (
    <div className={styles.settlementDateRow}>
      <input type="date" defaultValue={dateInputDefaultStart} disabled max={dateInputMax} className={styles.settlementDateInput} />
      <span>~</span>
      <input type="date" defaultValue={dateInputMax} disabled max={dateInputMax} className={styles.settlementDateInput} />
      <button type="button" className={styles.settlementSearchBtn} disabled>조회</button>
    </div>
  );

  let tabSkeleton: React.ReactNode = null;
  if (t === 'playlists') {
    tabSkeleton = (
      <div>
        <div className={styles.flexBetweenMb16}>
          <div className={styles.flexGap8}><div className={styles.skeletonPlaylistActionBtn} /><div className={styles.skeletonPlaylistActionBtn} /></div>
          <div className={styles.flexGap8Min88}>
            <div className={styles.skeletonCircle} />
            <div className={styles.skeletonCircle} />
          </div>
        </div>
        <div className={styles.flexGap24Padding}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${styles.skeletonCard} ${styles.skeletonCardThird}`}>
              <div className={`${styles.skeletonCardThumb} ${styles.skeletonCardThumbH180}`} />
              <div className={`${styles.skeletonCardBody} ${styles.skeletonCardBodyMin80}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80H16}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (t === 'posts') {
    tabSkeleton = (
      <div>
        {searchBarEl}
        <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
          <div className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableHeader}`}>
            <div>날짜</div><div>게시판</div><div>제목</div><div>조회</div><div>추천</div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tableGrid} ${styles.postsGrid5} ${styles.tableRow}`}>
              <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
            </div>
          ))}
        </div></div>
      </div>
    );
  } else if (t === 'comments') {
    tabSkeleton = (
      <div>
        {searchBarEl}
        <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
          <div className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableHeader}`}>
            <div>날짜</div><div>게시판</div><div>댓글</div><div>원문 글 제목</div><div>추천</div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tableGrid} ${styles.commentsGrid5} ${styles.tableRow}`}>
              <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW80}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW45}`} /></div>
            </div>
          ))}
        </div></div>
      </div>
    );
  } else if (t === 'liked') {
    tabSkeleton = (
      <div>
        {searchBarEl}
        <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
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
        <div className={styles.overflowXAuto}>
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
        <div className={styles.overflowXAuto}>
          <div className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableHeader}`}>
            <div className={styles.tableHeaderCell}>문의일시</div><div>문의유형</div><div>제목</div><div>상태</div>
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.tableGrid} ${styles.inquiryGrid} ${styles.tableRow}`}>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW75}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
              <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
            </div>
          ))}
        </div>
      </div>
    );
  } else if (t === 'pop') {
    const isUsage = popSubTab === 'usage';
    tabSkeleton = (
      <div className={styles.popSection}>
        <div className={styles.settlementRequestSummaryBox}>
          <div className={styles.settlementSummaryRow}>
            <span>보유 POP</span>
            <span className={styles.settlementTotalAmount}>
              <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
            </span>
          </div>
          <button type="button" className={styles.submitBtn} disabled>충전하기</button>
        </div>
        <div className={styles.settlementSubTabs}>
          <button type="button" className={popSubTab === 'purchase' ? styles.settlementSubTabActive : styles.settlementSubTab}>구매내역{popSubTab === 'purchase' && <span className={styles.settlementSubTabIndicator} />}</button>
          <button type="button" className={popSubTab === 'usage' ? styles.settlementSubTabActive : styles.settlementSubTab}>사용내역{popSubTab === 'usage' && <span className={styles.settlementSubTabIndicator} />}</button>
        </div>
        {settlementDateRowEl}
        <div className={styles.popTableWrap}><div className={styles.overflowXAuto}>
          {isUsage ? (
            <>
              <div className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableHeader}`}>
                <div>사용일시</div><div>사용수량</div><div>사용대상</div><div>사용내용</div><div>사용상태</div><div>사용취소</div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.tableGrid} ${styles.popUsageGrid6} ${styles.tableRow}`}>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
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
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW55}`} /></div>
                  <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                  <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                </div>
              ))}
            </>
          )}
        </div></div>
      </div>
    );
  } else if (t === 'donation') {
    tabSkeleton = (
      <div className={styles.donationSection}>
        <div className={styles.settlementSubTabs}>
          <button type="button" className={donationSubTab === 'sent' ? styles.settlementSubTabActive : styles.settlementSubTab}>보낸내역{donationSubTab === 'sent' && <span className={styles.settlementSubTabIndicator} />}</button>
          <button type="button" className={donationSubTab === 'received' ? styles.settlementSubTabActive : styles.settlementSubTab}>받은내역{donationSubTab === 'received' && <span className={styles.settlementSubTabIndicator} />}</button>
        </div>
        <div className={styles.settlementInnerContent}>
          {settlementDateRowEl}
          <div className={styles.overflowXAuto}>
            {donationSubTab === 'sent' ? (
              <>
                <div className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableHeader}`}>
                  <div>후원일</div><div>요청일</div><div>승인일</div><div>취소일</div><div>금액</div><div>상태</div><div>취소</div><div>수혜자</div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.tableGrid} ${styles.donationSentGrid8} ${styles.tableRow}`}>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
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
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW90}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW70}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                    <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  } else if (t === 'settlement') {
    const stSub = settlementSubTab;
    let settlementContent: React.ReactNode = null;
    if (stSub === 'history') {
      settlementContent = (
        <div className={styles.settlementInnerContent}>
          {settlementDateRowEl}
          <div className={styles.overflowXAuto}>
            <div className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableHeader}`}>
              <div>정산요청일</div><div>정산승인일</div><div>변동 수량</div><div>정산금액</div><div>정산처리상태</div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.settlementGrid5} ${styles.tableRow}`}>
                <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                <div className={styles.tableCell}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW85}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div></div>
                <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW65}`} /></div>
                <div className={styles.tableCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW60}`} /></div>
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
                <div className={`${styles.skeletonBar} ${styles.skeletonBarPx100H40}`} />
              </div>
            ))}
            <div className={`${styles.skeletonBar} ${styles.skeletonBarPx80H40}`} />
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
                <div className={`${styles.skeletonBar} ${styles.skeletonBarInline80}`} />
              </span>
            </div>
            <button type="button" className={styles.submitBtn} disabled>정산요청</button>
          </div>
          <div className={styles.settlementRequestTableWrap}><div className={styles.overflowXAuto}>
            <div className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableHeader}`}>
              <div className={styles.settlementTableHeaderCell}>후원금액</div>
              <div className={styles.settlementTableHeaderCell}>후원승인일</div>
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${styles.tableGrid} ${styles.settlementRequestGrid2} ${styles.tableRow}`}>
                <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div>
                <div className={`${styles.tableCell} ${styles.tableCellCenter}`}><div className={styles.skeletonDateCell}><div className={`${styles.skeletonBar} ${styles.skeletonBarW50}`} /><div className={`${styles.skeletonBar} ${styles.skeletonBarW40}`} /></div></div>
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
  } else {
    tabSkeleton = (
      <div className={styles.skeletonContent}>
        <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW100}`} />
        <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW85}`} />
        <div className={`${styles.skeletonContentRow} ${styles.skeletonContentRowW92}`} />
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.skeletonProfile}>
        <div className={styles.skeletonAvatar} />
        <div className={styles.skeletonProfileText}>
          <div className={`${styles.skeletonBar} ${styles.skeletonBarPx120H26}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarPx200H16}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarPx140H16}`} />
          <div className={`${styles.skeletonBar} ${styles.skeletonBarPx110H16}`} />
        </div>
      </div>
      <div className={styles.tabs}>
        {tabs.map((tb) => (
          <button key={tb.id} type="button" className={t === tb.id ? styles.tabActive : styles.tab}>
            {tb.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>{tabSkeleton}</div>
    </div>
  );
}
