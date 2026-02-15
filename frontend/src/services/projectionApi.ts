import api from "./api";
import type { Projection, ProjectionData } from "../types/stock";

/** Save a new projection scenario. */
export async function saveProjection(
  ticker: string,
  title: string,
  data: ProjectionData
): Promise<Projection> {
  const { data: row } = await api.post<Projection>("/api/projections", {
    ticker,
    title,
    data,
  });
  return row;
}

/** List saved projections for a ticker. */
export async function getProjections(ticker: string): Promise<Projection[]> {
  const { data } = await api.get<Projection[]>("/api/projections", {
    params: { ticker },
  });
  return data;
}

/** Update an existing projection. */
export async function updateProjection(
  id: string,
  updates: { title?: string; data?: ProjectionData }
): Promise<Projection> {
  const { data } = await api.patch<Projection>(
    `/api/projections/${id}`,
    updates
  );
  return data;
}

/** Delete a projection by ID. */
export async function deleteProjection(id: string): Promise<void> {
  await api.delete(`/api/projections/${id}`);
}
