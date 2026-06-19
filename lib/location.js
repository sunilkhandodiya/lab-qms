// lib/location.js — server-side helpers for the active centre (location) selection
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export const LOCATION_COOKIE = 'qms_loc';

// Returns { states, locations, current } where current is the active Location (or null = All Centres).
export async function getLocationContext() {
  const [states, locations] = await Promise.all([
    prisma.state.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ include: { state: true }, orderBy: { name: 'asc' } }),
  ]);

  const cookieStore = await cookies();
  const selectedId = cookieStore.get(LOCATION_COOKIE)?.value || null;
  const current = selectedId ? locations.find(l => l.id === selectedId) || null : null;

  return { states, locations, current, selectedId };
}

// Build a prisma `where` filter for the active centre (no filter when "All Centres").
export async function locationWhere() {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get(LOCATION_COOKIE)?.value || null;
  return selectedId ? { locationId: selectedId } : {};
}
