'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { weatherApi, type WeatherResponse } from '@/api/weatherApi';
import styles from './WeatherModal.module.css';

const ANIM_DURATION = 280;

const CITY_ORDER = [
  '서울',
  '인천',
  '경기북부',
  '경기남부',
  '대전',
  '대구',
  '부산',
  '광주',
  '강원',
  '제주',
] as const;

type CityName = (typeof CITY_ORDER)[number];

function getIconForValue(obsrValue: number): { outer: string; inner: string; symbol: string } {
  if (obsrValue <= 30) return { outer: '#FEF3C7', inner: '#B45309', symbol: '!' };
  if (obsrValue <= 50) return { outer: '#FEF9C3', inner: '#A16207', symbol: '!' };
  if (obsrValue <= 65) return { outer: '#DCFCE7', inner: '#15803D', symbol: '✓' };
  if (obsrValue <= 75) return { outer: '#FEF3C7', inner: '#B45309', symbol: '!' };
  return { outer: '#FEE2E2', inner: '#DC2626', symbol: '✕' };
}

interface WeatherModalProps {
  open: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function WeatherModal({ open, onClose, anchorRef }: WeatherModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [origin, setOrigin] = useState<{ x: string; y: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [selectedCity, setSelectedCity] = useState<CityName | null>(null);
  const [result, setResult] = useState<WeatherResponse | null>(null);

  useEffect(() => {
    if (open) {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setOrigin({ x: `${rect.left + rect.width / 2}px`, y: `${rect.top + rect.height / 2}px` });
      } else {
        setOrigin(null);
      }

      setStatus('idle');
      setSelectedCity(null);
      setResult(null);

      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
      setOrigin(null);
      const t = window.setTimeout(() => setMounted(false), ANIM_DURATION);
      return () => window.clearTimeout(t);
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const fetchWeather = async (city: CityName) => {
    if (status === 'loading') return;

    setSelectedCity(city);
    setStatus('loading');
    setResult(null);

    try {
      const { data } = await weatherApi.getWeatherInfo(city);
      const payload = data?.data;
      if (!payload) throw new Error('No weather payload');
      setResult(payload);
      setStatus('success');
    } catch (err) {
      console.error('[weather info]', err);
      setStatus('error');
      setResult(null);
    }
  };

  const icon = result ? getIconForValue(result.obsrValue) : null;

  if (!mounted) return null;

  const modalContent = (
    <div
      className={`${styles.overlay} ${animateIn ? styles.overlayOpen : styles.overlayClosed}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="weather-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        ref={cardRef}
        className={`${styles.card} ${animateIn ? styles.cardOpen : styles.cardClosed}`}
        style={origin ? { transformOrigin: `${origin.x} ${origin.y}` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="닫기">
          <X size={20} />
        </button>

        <h2 id="weather-modal-title" className={styles.title}>
          내 악기 관리 가이드
        </h2>

        <div className={styles.cityGrid}>
          {CITY_ORDER.map((city) => {
            const active = selectedCity === city;
            return (
              <button
                key={city}
                type="button"
                className={`${styles.cityBtn} ${active ? styles.cityBtnActive : ''}`}
                onClick={() => fetchWeather(city)}
              >
                {city}
              </button>
            );
          })}
        </div>

        <div className={styles.cityDivider} />

        <div className={styles.resultArea}>
          {status === 'idle' && (
            <div className={styles.resultCentered}>도시를 선택하면 현재 습도를 확인할 수 있어요</div>
          )}

          {status === 'loading' && (
            <div className={`${styles.resultCentered} ${styles.resultLoading}`}>습도 조회 중...</div>
          )}

          {status === 'error' && (
            <div className={`${styles.resultCentered} ${styles.resultError}`}>
              습도 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
            </div>
          )}

          {status === 'success' && result && (
            <div className={styles.resultSuccess}>
              <div className={styles.resultTop}>
                <span className={styles.resultCity}>{selectedCity ?? ''}</span>
                <span className={styles.resultLabel}>현재 습도</span>
                <span className={styles.resultValue}>{result.obsrValue}%</span>
              </div>

              <div className={styles.resultBottom}>
                <div
                  className={styles.humidityIconOuter}
                  style={icon ? { backgroundColor: icon.outer } : undefined}
                >
                  <div
                    className={styles.humidityIconInner}
                    style={icon ? { backgroundColor: icon.inner } : undefined}
                  >
                    <span className={styles.humidityIconSymbol}>{icon?.symbol ?? ''}</span>
                  </div>
                </div>
                <div className={styles.messageText}>{result.humidityMsg}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

