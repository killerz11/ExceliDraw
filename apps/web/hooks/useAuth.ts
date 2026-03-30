// apps/web/hooks/useAuth.ts
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '../lib/api';

export function useAuth() {
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
    }
  }, [router]);

  return { token: getToken() };
}