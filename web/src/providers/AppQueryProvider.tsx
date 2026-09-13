import React, { useEffect, useMemo, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export default function AppQueryProvider({ identity, children }: PropsWithChildren<{ identity: string | null }>) {
  // Account transitions receive a new cache before their children render.
  const client = useMemo(() => new QueryClient(), [identity]);
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider key={JSON.stringify(identity)} client={client}>{children}</QueryClientProvider>;
}
