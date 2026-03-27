'use client';

import { sileo, type SileoOptions, type SileoState } from 'sileo';

type NotificationTone = Extract<SileoState, 'success' | 'error' | 'warning' | 'info'>;

type NotificationAction = {
  label: string;
  onClick?: () => void;
};

type NotificationOptions = {
  title: string;
  description: string;
  tone?: NotificationTone;
  duration?: number | null;
  requireConfirmation?: boolean;
  action?: NotificationAction;
};

const DEFAULT_DURATION = 9000;
const TONE_FILLS: Record<NotificationTone, string> = {
  success: '#0b1712',
  warning: '#2b1d08',
  error: '#231014',
  info: '#0b1220',
};

const TOAST_TEXT_STYLES = {
  title: 'color:#fff8eb !important;',
  description: 'color:rgba(255,248,235,0.92) !important;',
  badge: 'color:#fff8eb !important;',
  button: 'color:#fff8eb !important;border:1px solid rgba(255,248,235,0.14);background:rgba(255,248,235,0.08);',
} as const;

function emitNotification({
  title,
  description,
  tone = 'info',
  duration,
  requireConfirmation = false,
  action,
}: NotificationOptions) {
  const notify:
    | ((options: SileoOptions) => string)
    | undefined =
    tone === 'success'
      ? sileo.success
      : tone === 'error'
        ? sileo.error
        : tone === 'warning'
          ? sileo.warning
          : sileo.info;

  if (!notify) return;

  const toastId = notify({
    title,
    description,
    fill: TONE_FILLS[tone],
    styles: TOAST_TEXT_STYLES,
    duration: requireConfirmation ? null : duration ?? DEFAULT_DURATION,
    button: {
      title: action?.label || 'Leido',
      onClick: () => {
        action?.onClick?.();
        sileo.dismiss(toastId);
      },
    },
  });
}

export const notifications = {
  success(title: string, description: string, action?: NotificationAction) {
    emitNotification({ title, description, tone: 'success', action });
  },
  error(title: string, description: string, action?: NotificationAction) {
    emitNotification({ title, description, tone: 'error', duration: 12000, action });
  },
  warning(title: string, description: string, action?: NotificationAction) {
    emitNotification({ title, description, tone: 'warning', duration: 12000, action });
  },
  needsHuman(title: string, description: string, action: NotificationAction) {
    emitNotification({
      title,
      description,
      tone: 'warning',
      requireConfirmation: true,
      action,
    });
  },
};
