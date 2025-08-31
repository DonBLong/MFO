import type { ParseOptions } from "jsr:@std/cli@1.0.21/parse-args";
import { extname, format, join } from "jsr:@std/path@1.1.2";
import { existsSync } from "jsr:@std/fs@1.0.19/exists";
import getEpisodeList from "./api.ts";
import {
  filterFileTypes,
  iterableMatch,
  padStartDigits,
  toSortedStrings,
  type APIConfig,
  type FileExtension,
} from "./utils.ts";

export interface TVAPIConfig extends APIConfig {
  baseURL: string;
  endpoints: {
    showByTitle: (title: string) => string;
    showByTitleExactMatch: (title: string) => string;
    showById: (id: string | number) => string;
    seasonsByShowId: (id: string | number) => string;
    episodesByShowId: (id: string | number) => string;
    episodesBySeasonId: (id: string | number) => string;
    imagesByShowId: (id: string | number) => string;
  };
}

export type CLIConfig = ParseOptions;

export interface Config {
  apiConfig: TVAPIConfig;
  fileExtensions: FileExtension[];
  cliConfig: CLIConfig;
}

export function defineConfig(config: Config) {
  return config;
}

export interface Episode {
  name: string;
  season: number;
  number: number;
  airdate: string;
  image: {
    medium: string;
    original: string;
  };
}

export interface RenameMapEntry {
  seasonDir: string | false;
  oldPath: string;
  newPath: string;
}

export type RenameMap = RenameMapEntry[];

export default async function organize(
  config: Config,
  dir: string,
  title: string,
  season?: number,
  groupSeaons = false,
  mapOnly = false
) {
  const episodeList = await getEpisodeList(config.apiConfig, title, season);
  if (!episodeList?.length) return;
  const renameMap = generateRenameMap(
    episodeList,
    dir,
    config.fileExtensions,
    groupSeaons
  );
  if (mapOnly) return renameMap;
  if (renameMap?.length) renameFiles(renameMap);
}

export function renameFiles(renameMap: RenameMap) {
  let filesRenamedCount = 0;
  for (const { seasonDir, oldPath, newPath } of renameMap) {
    if (seasonDir && !existsSync(seasonDir)) Deno.mkdirSync(seasonDir);
    if (oldPath === newPath) continue;
    Deno.rename(oldPath, newPath);
    filesRenamedCount++;
  }
  return filesRenamedCount;
}

export function generateRenameMap(
  episodeList: Episode[],
  showDir: string,
  fileExtensions?: FileExtension[],
  groupSeaons = false
) {
  const filenames = toSortedStrings(filterFileTypes(showDir, fileExtensions));
  const fileToEpisodeMap = mapFilesToEpisodes(filenames, episodeList);
  const filenamesFiltered = [...fileToEpisodeMap.keys()];
  const episodesFiltered = [...fileToEpisodeMap.values()];
  const episodesFilteredNames = generateEpisodeNames(episodesFiltered);
  const seasonNames = generateSeasonNames(episodesFiltered);
  return filenamesFiltered.reduce((map: RenameMap, filename, i) => {
    const seasonDir = groupSeaons && join(showDir, seasonNames[i]);
    const oldPath = join(showDir, filename);
    const newPath = episodesFilteredNames[i];
    format({
      dir: seasonDir || showDir,
      name: episodesFilteredNames[i],
      ext: extname(filename),
    });
    if (oldPath !== newPath && !existsSync(newPath))
      map.push({ seasonDir, oldPath, newPath });
    return map;
  }, []);
}

export function mapFilesToEpisodes(
  filenames: string[],
  episodeList: Episode[]
) {
  const episodeMatcher = (episode: Episode) =>
    new RegExp(
      `(s${padStartDigits(episode.season, 2)})|(e${padStartDigits(
        episode.number,
        2
      )})|(${episode.name})`
    );
  return iterableMatch(filenames, episodeList, undefined, episodeMatcher);
}

export function generateEpisodeNames(episodeList: Episode[]) {
  return episodeList.map((e) => generateEpisodeName(e));
}

export function generateSeasonNames(episodeList: Episode[]) {
  return episodeList.map(({ season }) =>
    generateSeasonName(
      season,
      episodeList.filter((e) => e.season === season)
    )
  );
}

export function generateEpisodeName(episode: Episode) {
  return `S${padStartDigits(episode.season, 2)} E${padStartDigits(
    episode.number,
    2
  )} - ${episode.name.replace(/[\\/:*?"<>|]/g, "")}`;
}

export function generateSeasonName(season: number, seasonEpisodes: Episode[]) {
  const seaonNumber = `Season ${padStartDigits(season, 2)}`;
  const firstEpisodeYear = new Date(seasonEpisodes[0].airdate).getFullYear();
  const lastEpisodeYear = new Date(
    seasonEpisodes.slice(-1)[0].airdate
  ).getFullYear();
  if (firstEpisodeYear === lastEpisodeYear)
    return [seaonNumber, `(${firstEpisodeYear})`].join(" ");
  return [seaonNumber, `(${firstEpisodeYear}-${lastEpisodeYear})`].join(" ");
}
