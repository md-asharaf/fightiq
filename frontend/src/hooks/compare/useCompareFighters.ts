import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface FighterBasic {
  id: string;
  name: string;
  weight_class: string | null;
  record: string | null;
  height_cm: number | null;
  reach_cm: number | null;
  stance: string | null;
  is_champion: boolean;
  current_ranking: number | null;
  str_acc: number | null;
  str_def: number | null;
  td_acc: number | null;
  td_def: number | null;
  slpm: number | null;
}

export interface ComparisonResponse {
  fighter1: FighterBasic;
  fighter2: FighterBasic;
}

export function useFightersList() {
  return useQuery<FighterBasic[]>({
    queryKey: ["fighters", "list"],
    queryFn: async () => {
      const res = await fetchApi("/fighters?limit=200");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCompareFighters(f1Id: string, f2Id: string) {
  return useQuery<ComparisonResponse>({
    queryKey: ["fighters", "compare", f1Id, f2Id],
    queryFn: async () => {
      const res = await fetchApi(`/fighters/compare?f1_id=${f1Id}&f2_id=${f2Id}`);
      return res.data;
    },
    enabled: Boolean(f1Id && f2Id),
    staleTime: 60 * 60 * 1000
  });
}
