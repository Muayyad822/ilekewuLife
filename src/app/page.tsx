'use client';

import React from 'react';
import { LagosWorld } from '@/components/ThreeWorld/LagosWorld';
import { TopHud, Dock, PanelDrawer } from '@/components/GameHud';
import { ActivityModal } from '@/components/Activities';
import { AuthGate } from '@/components/AuthGate';
import { PrivateChatModal } from '@/components/PrivateChatModal';

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-kw-ink">
      <LagosWorld />
      <TopHud />
      <Dock />
      <PanelDrawer />
      <ActivityModal />
      <PrivateChatModal />
      <AuthGate />
    </main>
  );
}
