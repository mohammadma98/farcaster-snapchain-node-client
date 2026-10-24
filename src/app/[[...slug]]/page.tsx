'use client';

import React, { useState, useEffect } from 'react';
import { FarcasterClient } from '@/components/FarcasterClient';
import { Microsite } from '@/components/Microsite';

export default function CatchAllPage({
  params,
}: {
  params: { slug?: string[] };
}) {
  const isClientPath = params.slug?.[0] === 'client';
  const [view, setView] = useState<'microsite' | 'client'>(isClientPath ? 'client' : 'microsite');

  useEffect(() => {
    if (params.slug?.[0] === 'client') {
      setView('client');
    } else {
      setView('microsite');
    }
  }, [params.slug]);

  if (view === 'client') {
    return <FarcasterClient initialSlug={params.slug?.slice(1)} />;
  }

  return <Microsite onOpenClient={() => setView('client')} />;
}
