import { useEffect } from 'react';

import { useAuthStore } from '@core/auth/auth.store';

import { useMeQuery } from '../queries/auth.queries';

export interface IUseSessionBootstrap {
  isBootstrapping: boolean;
}

export function useSessionBootstrap(): IUseSessionBootstrap {
  const status = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);

  const meQuery = useMeQuery(status === 'idle');

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    } else if (meQuery.isError) {
      clear();
    }
  }, [meQuery.data, meQuery.isError, setUser, clear]);

  return { isBootstrapping: status === 'idle' };
}
