import React, { useState, useRef, useEffect } from 'react';
import type { Page } from './ExtRouter';
import {
  T, ACCENT_PRESETS, getAccentColor, setAccentColor,
  getActiveTheme, cycleTheme, THEME_ORDER, THEME_LABELS, inkOnAccent,
} from '../lib/theme';
import { motion, AnimatePresence } from 'framer-motion';

// Bell icon (Announcements) — shared by the nav item + the persistent bell button.
const BELL_D = 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9';

const NAV_ITEMS: Array<{ id: Page; label: string; d: string }> = [
  {
    id: 'overview',
    label: 'Overview',
    d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    id: 'grades',
    label: 'Grades',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  },
  {
    id: 'assignments',
    label: 'Assignments',
    d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'materials',
    label: 'Materials',
    d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    d: BELL_D,
  },
  {
    id: 'nostalgia',
    label: 'Nostalgia',
    d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    id: 'game',
    label: 'Arcade',
    d: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  },
];

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

function NavBtn({ children, onClick, title, active, ariaCurrent, ariaExpanded }: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  ariaCurrent?: 'page';
  ariaExpanded?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-current={ariaCurrent}
      aria-expanded={ariaExpanded}
      className="bs-nav-btn"
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      style={{
        all: 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 34, height: 34, borderRadius: '50%', cursor: 'pointer',
        // v2: active nav item = accent fill + readable ink (not a tint)
        color: active ? inkOnAccent() : T.text,
        background: active ? T.primary : 'transparent',
        boxSizing: 'border-box', flexShrink: 0,
      }}
    >
      {children}
    </motion.button>
  );
}

interface Props {
  page: Page;
  onNavigate: (p: Page) => void;
  announcementsUnread?: number;
  /** Bell tap: opens Announcements, or leaves it (back to previous page) if there. */
  onBell?: () => void;
  /** Opens the ⌘K search palette. */
  onSearch?: () => void;
}

/**
 * Minimal floating "pop out" navigation: a pill that hovers over the
 * full-width content. Lets you jump straight back to Overview, or step
 * to the page before/after the current one — that's the whole surface.
 */
export function FloatingNav({ page, onNavigate, announcementsUnread = 0, onBell, onSearch }: Props) {
  const [showColorDrawer, setShowColorDrawer] = useState(false);
  const [expanded, setExpanded] = useState(false); // popout: collapsed handle → full bar on hover
  // Forgiving collapse — a brief mouse-out won't snap it shut (so the far-right
  // "Show Original Schoology" button stays easy to reach).
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelCollapse = () => { if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; } };
  const scheduleCollapse = () => { cancelCollapse(); collapseTimer.current = setTimeout(() => { if (!showColorDrawer) setExpanded(false); }, 300); };
  const idx = Math.max(0, NAV_ITEMS.findIndex((i) => i.id === page));
  const prev = NAV_ITEMS[(idx - 1 + NAV_ITEMS.length) % NAV_ITEMS.length];
  const next = NAV_ITEMS[(idx + 1) % NAV_ITEMS.length];
  const current = NAV_ITEMS[idx];

  // Auto-hide after inactivity: the bar slides/fades away once the mouse, keyboard, and
  // scroll have been idle for a few seconds, and snaps back on any movement. Stays put
  // while you're hovering it or the color drawer is open.
  const [idle, setIdle] = useState(false);
  const [hovering, setHovering] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const IDLE_MS = 4000;
    const wake = () => {
      setIdle(false);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    window.addEventListener('mousemove', wake, { passive: true });
    window.addEventListener('mousedown', wake);
    window.addEventListener('keydown', wake);
    window.addEventListener('scroll', wake, { passive: true, capture: true });
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('mousedown', wake);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('scroll', wake, true);
    };
  }, []);
  const hidden = idle && !hovering && !showColorDrawer;

  return (
    <nav
      aria-label="Better SGY pages"
      style={{
        position: 'fixed', bottom: 18, left: '50%',
        transform: hidden ? 'translateX(-50%) translateY(180%)' : 'translateX(-50%)',
        opacity: hidden ? 0 : 1,
        zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
        transition: 'opacity .35s ease, transform .4s cubic-bezier(.16,1,.3,1)',
      }}
    >
      <AnimatePresence>
        {showColorDrawer && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999,
              padding: '6px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', pointerEvents: 'auto',
              marginBottom: 4,
            }}
          >
            {Object.entries(ACCENT_PRESETS).map(([name, color]) => (
              <button
                key={name}
                type="button"
                onClick={() => setAccentColor(color)}
                aria-label={`Use ${name} highlight color`}
                aria-pressed={getAccentColor() === color}
                title={`Use ${name} highlight`}
                className="bs-focusable"
                style={{
                  all: 'unset',
                  padding: 5,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: color, display: 'block',
                    border: `2px solid ${getAccentColor() === color ? T.text : T.border}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    boxSizing: 'border-box',
                  }}
                />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed popout — a compact pill. The page handle expands the full bar;
          the "Show Original Schoology" eye is ALWAYS here so you can always turn the
          overlay off in one click (no hover/expand needed). */}
      {!expanded && (
        <div
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          style={{
          display: 'flex', alignItems: 'center', gap: 2, position: 'relative', pointerEvents: 'auto',
          background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999,
          padding: '4px 6px', boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        }}>
          <button
            type="button"
            onMouseEnter={() => { cancelCollapse(); setExpanded(true); }}
            onClick={() => setExpanded(true)}
            aria-label="Open navigation"
            className="bs-focusable"
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: T.text, padding: '3px 4px', borderRadius: 999 }}
          >
            <Icon d={current.d} size={15} />
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <div style={{ width: 1, height: 16, background: T.border, flexShrink: 0 }} />
          <button
            type="button"
            title="Show Original Schoology"
            aria-label="Show Original Schoology"
            className="bs-focusable bs-lift"
            onClick={() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const w = window as any;
              if (typeof w.__toggleSchoologyOverlay === 'function') w.__toggleSchoologyOverlay(false);
            }}
            style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text, width: 26, height: 26, borderRadius: '50%' }}
          >
            <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" size={15} />
          </button>
          {announcementsUnread > 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: -4, right: -4, minWidth: 15, height: 15, padding: '0 3px', boxSizing: 'border-box',
              borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, border: `1.5px solid ${T.panel}`,
            }}>{announcementsUnread > 9 ? '9+' : announcementsUnread}</span>
          )}
        </div>
      )}

      {expanded && (
      <div
        onMouseEnter={() => { cancelCollapse(); setHovering(true); }}
        onMouseLeave={() => { scheduleCollapse(); setHovering(false); }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}
      >
      <div
        key={current.id}
        className="bs-fade-in"
        style={{
          fontSize: 9.5, fontWeight: 700, color: T.muted,
          textTransform: 'uppercase', letterSpacing: '0.5px',
          background: T.panel + 'd0', border: `1px solid ${T.border}`,
          borderRadius: 999, padding: '2px 9px',
        }}
      >
        {current.label}
      </div>
      <div
        className="bs-fade-in"
        style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: T.panel, border: `1px solid ${T.border}`, borderRadius: 999,
          padding: 4, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', pointerEvents: 'auto',
        }}
      >
        <NavBtn onClick={() => onNavigate(prev.id)} title={`Previous: ${prev.label}`}>
          <Icon d="M15 19l-7-7 7-7" size={16} />
        </NavBtn>
        <NavBtn onClick={() => onNavigate('overview')} title="Overview" active={page === 'overview'} ariaCurrent={page === 'overview' ? 'page' : undefined}>
          <Icon d={NAV_ITEMS[0].d} size={18} />
        </NavBtn>
        <NavBtn onClick={() => onNavigate(next.id)} title={`Next: ${next.label}`}>
          <Icon d="M9 5l7 7-7 7" size={16} />
        </NavBtn>

        {onSearch && (
          <NavBtn onClick={onSearch} title="Search (⌘K)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </NavBtn>
        )}

        {/* Persistent Announcements bell — always visible; badge pings until the
            Announcements page is opened (which clears the seen state in storage). */}
        <button
          type="button"
          onClick={() => (onBell ? onBell() : onNavigate('announcements'))}
          title={page === 'announcements'
            ? 'Close Announcements'
            : announcementsUnread > 0 ? `${announcementsUnread} new announcement${announcementsUnread > 1 ? 's' : ''}` : 'Announcements'}
          aria-label={announcementsUnread > 0 ? `Announcements, ${announcementsUnread} new` : 'Announcements'}
          className="bs-nav-btn bs-focusable"
          style={{
            all: 'unset', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', boxSizing: 'border-box', flexShrink: 0,
            color: page === 'announcements' ? inkOnAccent() : T.text,
            background: page === 'announcements' ? T.primary : 'transparent',
          }}
          aria-current={page === 'announcements' ? 'page' : undefined}
        >
          <Icon d={BELL_D} size={18} />
          {announcementsUnread > 0 && (
            <span aria-hidden="true" style={{
              position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, padding: '0 3px', boxSizing: 'border-box',
              borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              border: `1.5px solid ${T.panel}`,
            }}>
              {announcementsUnread > 9 ? '9+' : announcementsUnread}
            </span>
          )}
        </button>

        <div style={{ width: 1, height: 20, background: T.border, margin: '0 4px', flexShrink: 0 }} />
        <NavBtn
          onClick={() => cycleTheme()}
          title={`Theme: ${THEME_LABELS[getActiveTheme()]} — switch to ${THEME_LABELS[THEME_ORDER[(THEME_ORDER.indexOf(getActiveTheme()) + 1) % THEME_ORDER.length]]}`}
        >
          {/* half-filled circle = theme toggle */}
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 010 18z" fill="currentColor" stroke="none" />
          </svg>
        </NavBtn>
        <NavBtn onClick={() => setShowColorDrawer(!showColorDrawer)} title="Change Highlight Color" active={showColorDrawer} ariaExpanded={showColorDrawer}>
          <Icon d="M12 22C17.52 22 22 17.52 22 12S17.52 2 12 2 2 6.47 2 12c0 2.76 2.24 5 5 5h1c.55 0 1 .45 1 1 0 .55-.45 1-1 1-2.76 0-5 2.24-5 5h11zm-5-14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" size={18} />
        </NavBtn>
        <NavBtn
          onClick={() => {
            if (typeof (window as any).__toggleSchoologyOverlay === 'function') {
              (window as any).__toggleSchoologyOverlay(false);
            }
          }}
          title="Show Original Schoology"
        >
          <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" size={18} />
        </NavBtn>
      </div>
      </div>
      )}
    </nav>
  );
}
