'use client';

import React from 'react';
import { LagosWorld } from '@/components/ThreeWorld/LagosWorld';
import { TopLeftHud, TopRightHud, Dock, PanelDrawer } from '@/components/GameHud';
import { ActivityModal } from '@/components/Activities';
import { AuthGate } from '@/components/AuthGate';

export default function Home() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-kw-ink">
      <LagosWorld />
      <TopLeftHud />
      <TopRightHud />
      <Dock />
      <PanelDrawer />
      <ActivityModal />
      <AuthGate />
    </main>
  );
}
