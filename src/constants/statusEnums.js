// src/constants/statusEnums.js

/** Canonical status values for the `generations` table */
export const GENERATION_STATUS = {
  PROCESSING: 'processing',
  COMPLETED:  'completed',
  FAILED:     'failed',
};

/** Canonical status values for the `posts` table */
export const POST_STATUS = {
  DRAFT:      'draft',
  SCHEDULED:  'scheduled',
  PUBLISHING: 'publishing',
  PUBLISHED:  'published',
  FAILED:     'failed',
  ARCHIVED:   'archived',
};

/** Canonical status for `brand_kit` */
export const BRAND_KIT_STATUS = {
  CONFIGURED: 'configured',
  PARTIAL:    'partial',
  MISSING:    'missing',
};

/** Canonical status for `brand_assets` */
export const ASSET_STATUS = {
  UPLOADING:  'uploading',
  PROCESSING: 'processing',
  READY:      'ready',
  FAILED:     'failed',
};
