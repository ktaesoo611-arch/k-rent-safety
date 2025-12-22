'use client';

import { useState } from 'react';
import LandingPageV2 from '../page-v2';
import LandingPageV3 from '../page-v3';
import LandingPageV4 from '../page-v4';

/**
 * Preview route for new landing page designs
 * Access at: /preview
 *
 * Switch between:
 * - V2 (Glassmorphism) - Dark, tech-forward
 * - V3 (Minimalist) - Dark, cosmic, futuristic
 * - V4 (Warm) - Light, trustworthy, neighborly
 */
export default function PreviewPage() {
  const [version, setVersion] = useState<'v2' | 'v3' | 'v4'>('v4');

  return (
    <div>
      {/* Version Switcher */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 backdrop-blur-xl border rounded-full shadow-2xl ${
        version === 'v4'
          ? 'bg-white/90 border-amber-200'
          : 'bg-black/80 border-white/20'
      }`}>
        <button
          onClick={() => setVersion('v2')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            version === 'v2'
              ? 'bg-emerald-500 text-white'
              : version === 'v4'
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-white/60 hover:text-white'
          }`}
        >
          V2 Glass
        </button>
        <button
          onClick={() => setVersion('v3')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            version === 'v3'
              ? 'bg-purple-500 text-white'
              : version === 'v4'
              ? 'text-gray-500 hover:text-gray-700'
              : 'text-white/60 hover:text-white'
          }`}
        >
          V3 Cosmic
        </button>
        <button
          onClick={() => setVersion('v4')}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
            version === 'v4'
              ? 'bg-amber-500 text-white'
              : 'text-white/60 hover:text-white'
          }`}
        >
          V4 Warm
        </button>
      </div>

      {/* Page Content */}
      {version === 'v2' && <LandingPageV2 />}
      {version === 'v3' && <LandingPageV3 />}
      {version === 'v4' && <LandingPageV4 />}
    </div>
  );
}
