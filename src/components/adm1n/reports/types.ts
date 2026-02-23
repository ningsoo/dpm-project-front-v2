import type { PageResponse } from '../common/types';

export type { PageResponse };

export interface PenaltyForm {
  reason: string;
  type: string;
  until: string;
}
