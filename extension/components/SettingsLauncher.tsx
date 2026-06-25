import React from 'react';
import { motion } from 'framer-motion';
import { T } from '../lib/theme';

interface Props {
  /** Whether the Settings page is currently open (highlights the gear). */
  active?: boolean;
  /** Unread announcements — shown as a small badge so it still pings. */
  announcementsUnread?: number;
  /** Open (or, if already on Settings, leave) the Settings page. */
  onOpenSettings: () => void;
}

const GEAR_D =
  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z';

/**
 * Minimal persistent launcher — a single small gear pinned bottom-right. It is the
 * ONLY always-on control: tapping it opens Settings, where every page (and the
 * "Show original Schoology" toggle) is reachable. Replaces the old FloatingNav pill.
 */
export function SettingsLauncher({ active, announcementsUnread = 0, onOpenSettings }: Props) {
  return (
    <motion.button
      type="button"
      onClick={onOpenSettings}
      title={active ? 'Close Settings' : 'Settings & navigation'}
      aria-label={
        announcementsUnread > 0
          ? `Settings — ${announcementsUnread} new announcement${announcementsUnread > 1 ? 's' : ''}`
          : 'Settings & navigation'
      }
      aria-pressed={active}
      className="bs-focusable"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      style={{
        all: 'unset',
        position: 'fixed',
        bottom: 18,
        right: 18,
        zIndex: 50,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 38,
        height: 38,
        borderRadius: '50%',
        cursor: 'pointer',
        color: active ? T.primary : T.text,
        background: T.panel,
        border: `1px solid ${active ? T.primary : T.border}`,
        boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
      }}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path d={GEAR_D} />
      </svg>
      {announcementsUnread > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 15,
            height: 15,
            padding: '0 3px',
            boxSizing: 'border-box',
            borderRadius: 999,
            background: '#ef4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            border: `1.5px solid ${T.panel}`,
          }}
        >
          {announcementsUnread > 9 ? '9+' : announcementsUnread}
        </span>
      )}
    </motion.button>
  );
}
