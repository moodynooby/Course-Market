/**
 * Deep linking for the native app.
 *
 * Registered schemes (in capacitor.config.ts app/appUrlSchemes):
 *   auraishub://trading?tradeId=42      -> open Trading Board, highlight trade 42
 *   auraishub://courses?courseCode=CSE201 -> open Courses with that code prefilled
 *   auraishub://professors?id=7          -> open ProfessorDetailsPage
 *   auraishub://schedule                 -> open home (My Schedule)
 *
 * On the web, equivalent behaviour is achieved with query parameters
 * (?tradeId=42 etc.) parsed by the same resolver so shared links work
 * everywhere.
 */

import { App as CapacitorApp, URLOpenListenerEvent } from '@capacitor/app';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativePlatform } from './capacitor';

export interface ParsedDeepLink {
  /** react-router path to navigate to */
  path: string;
  /** query string (without leading ?) */
  search: string;
}

export function parseDeepLink(url: string): ParsedDeepLink | null {
  try {
    // Auth0 native callbacks (auraishub://{domain}/capacitor/app.aurais/callback)
    // carry an authorization `code` + `state` and are consumed by the native
    // auth bridge (src/native/auth.ts) — they are not app routes.
    if (/^auraishub:\/\/.*\/capacitor\/app\.aurais\/callback/.test(url)) {
      return null;
    }

    const parsed = new URL(url);

    // Native scheme links: auraishub://... (protocol is 'auraishub:').
    if (parsed.protocol === 'auraishub:') {
      return resolvePath(parsed.pathname.replace(/^\/+/, ''), parsed.search);
    }

    // Web fallback: use query parameters on any origin.
    return resolveWebQuery(parsed.searchParams);
  } catch {
    return null;
  }
}

function resolvePath(pathname: string, search: string): ParsedDeepLink | null {
  switch (pathname) {
    case 'trading':
      return { path: '/trading', search };
    case 'courses':
      return { path: '/courses', search };
    case 'professors':
      return { path: '/professors', search };
    case 'schedule':
      return { path: '/', search: '' };
    default:
      return null;
  }
}

function resolveWebQuery(params: URLSearchParams): ParsedDeepLink | null {
  const tradeId = params.get('tradeId');
  if (tradeId) return { path: '/trading', search: `tradeId=${encodeURIComponent(tradeId)}` };
  const courseId = params.get('courseId') ?? params.get('courseCode');
  if (courseId) return { path: '/courses', search: `code=${encodeURIComponent(courseId)}` };
  const professorId = params.get('professorId');
  if (professorId) return { path: `/professors/${professorId}`, search: '' };
  return null;
}

/**
 * Hook that listens for native app URL open events and navigates accordingly.
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  const handleUrl = useCallback(
    (url: string) => {
      const resolved = parseDeepLink(url);
      if (resolved) {
        navigate(`${resolved.path}${resolved.search ? `?${resolved.search}` : ''}`);
      }
    },
    [navigate],
  );

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Handle links that arrive while the app is running.
    let removeUrlOpen: () => void;
    void CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      handleUrl(event.url);
    }).then((handle) => {
      removeUrlOpen = () => handle.remove();
    });

    // Handle links that launched the app (cold start).
    void CapacitorApp.getLaunchUrl().then((result) => {
      if (result?.url) handleUrl(result.url);
    });

    return () => {
      removeUrlOpen?.();
    };
  }, [handleUrl]);
}

/**
 * Build a shareable deep link for a trade / course / professor.
 */
export function buildDeepLink(params: {
  tradeId?: number | string;
  courseCode?: string;
  professorId?: string | number;
}): string {
  const base = window.location.origin;
  if (params.tradeId !== undefined) {
    return `${base}/trading?tradeId=${encodeURIComponent(String(params.tradeId))}`;
  }
  if (params.courseCode) {
    return `${base}/courses?code=${encodeURIComponent(params.courseCode)}`;
  }
  if (params.professorId !== undefined) {
    return `${base}/professors/${params.professorId}`;
  }
  return base;
}
