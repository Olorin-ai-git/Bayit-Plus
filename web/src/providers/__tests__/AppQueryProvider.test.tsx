import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import AppQueryProvider from '../AppQueryProvider';

afterEach(cleanup);

test('query consumers load through the application provider', async () => {
  function Consumer() {
    const result = useQuery({ queryKey: ['provider-contract'], queryFn: async () => 'Loaded from the real query client' });
    return <p>{result.data}</p>;
  }
  render(<AppQueryProvider identity={null}><Consumer /></AppQueryProvider>);
  expect(await screen.findByText('Loaded from the real query client')).toBeInTheDocument();
});

test('the same account retains its cache while account changes dispose private data', () => {
  let observed!: QueryClient;
  function Consumer() {
    observed = useQueryClient();
    return <p>{observed.getQueryData<string>(['private-history']) || 'Empty history'}</p>;
  }
  const view = render(<AppQueryProvider identity="account-a"><Consumer /></AppQueryProvider>);
  const first = observed;
  first.setQueryData(['private-history'], 'First account history');
  view.rerender(<AppQueryProvider identity="account-a"><Consumer /></AppQueryProvider>);
  expect(observed).toBe(first);
  expect(screen.getByText('First account history')).toBeInTheDocument();
  view.rerender(<AppQueryProvider identity="account-b"><Consumer /></AppQueryProvider>);
  expect(observed).not.toBe(first);
  expect(screen.getByText('Empty history')).toBeInTheDocument();
  expect(first.getQueryData(['private-history'])).toBeUndefined();
  const second = observed;
  second.setQueryData(['private-history'], 'Second account history');
  view.rerender(<AppQueryProvider identity={null}><Consumer /></AppQueryProvider>);
  expect(screen.getByText('Empty history')).toBeInTheDocument();
  expect(second.getQueryData(['private-history'])).toBeUndefined();
});
