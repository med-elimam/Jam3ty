import React from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { EmptyState } from './EmptyState';

/**
 * Failure state for a screen whose query errored — distinct from "no data".
 * Shows a localized message and a retry action. Never surfaces raw backend errors.
 */
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = usePreferences();
  return (
    <EmptyState
      icon="alert-circle"
      title={t('common.errorTitle')}
      body={t('common.errorBody')}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}
