/**
 * GET /api/profiles
 *
 * Thin HTTP wrapper around the shared getProfiles() function.
 * All data logic lives in src/lib/api/profiles.ts so both
 * this route and server-component Dashboard share the same code.
 */

import { NextResponse } from 'next/server';
import { getProfiles } from '@/lib/api/profiles';

export async function GET() {
  const result = await getProfiles();
  return NextResponse.json(result);
}
