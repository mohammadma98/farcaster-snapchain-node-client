'use client';

import React from 'react';
import { FarcasterClient } from '@/components/FarcasterClient';

export default function CatchAllPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  return <FarcasterClient initialSlug={params.slug} />;
}
