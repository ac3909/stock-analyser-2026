import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Download } from "lucide-react";
import { getProjections, deleteProjection } from "../../services/projectionApi";
import type { Projection, ProjectionData } from "../../types/stock";

interface Props {
  ticker: string;
  onLoad: (data: ProjectionData) => void;
}

/** List of saved projection scenarios with load/delete actions. */
export default function SavedScenarios({ ticker, onLoad }: Props) {
  const queryClient = useQueryClient();

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["projections", ticker],
    queryFn: () => getProjections(ticker),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProjection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projections", ticker] });
    },
  });

  if (isLoading) {
    return (
      <div className="text-sm text-gray-400 py-4">Loading saved scenarios...</div>
    );
  }

  if (!scenarios || scenarios.length === 0) {
    return (
      <div className="text-sm text-gray-400 py-4">
        No saved scenarios yet. Create a projection and save it.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scenarios.map((s: Projection) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-4 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {s.title}
            </p>
            <p className="text-xs text-gray-400">
              {s.data.model_type === "dcf" ? "DCF" : "Multiples"} &middot;{" "}
              {new Date(s.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onLoad(s.data)}
              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Load scenario"
            >
              <Download size={14} />
            </button>
            <button
              onClick={() => deleteMutation.mutate(s.id)}
              disabled={deleteMutation.isPending}
              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Delete scenario"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
