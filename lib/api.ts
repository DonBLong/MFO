import axios, { AxiosError } from "npm:axios@1.11.0";
import type { APIConfig, Episode } from "./mfo.ts";

export default async function getEpisodeList(
  apiConfig: APIConfig,
  title: string,
  season?: number | string
): Promise<Episode[] | undefined> {
  const showId = (
    await fetchData(
      apiConfig.baseURL,
      apiConfig.endpoints.showByTitleExactMatch(title)
    )
  )?.id;
  if (showId == null) return;
  const episodeList: Episode[] = await fetchData(
    apiConfig.baseURL,
    apiConfig.endpoints.episodesByShowId(showId)
  );
  if (season == null) return episodeList;
  return episodeList?.filter((e) => e.season == season);
}

export async function fetchData(baseURL: string, endPoint: string) {
  try {
    const response = await axios.get(endPoint, { baseURL });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    if (error instanceof AxiosError) {
      console.error(error.request._header);
    }
  }
}
