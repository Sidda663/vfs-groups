import { useQuery } from '@tanstack/react-query';
import { api } from './api.js';

export function useSiteSettings() {
  return useQuery({ queryKey: ['content', 'settings'], queryFn: async () => (await api.get('/content/settings')).data.data, staleTime: 5 * 60_000 });
}
