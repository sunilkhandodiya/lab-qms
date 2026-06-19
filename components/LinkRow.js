'use client';
// components/LinkRow.js — a table row that navigates to `href` on click
import { useRouter } from 'next/navigation';

export default function LinkRow({ href, children, title }) {
  const router = useRouter();
  return (
    <tr
      onClick={() => router.push(href)}
      title={title || 'Open record'}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </tr>
  );
}
