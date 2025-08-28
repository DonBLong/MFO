import type { ParseOptions } from "jsr:@std/cli@1.0.21/parse-args";
import { extname, format, join, resolve } from "jsr:@std/path@1.1.2";
import { exists } from "jsr:@std/fs@1.0.19/exists";
import getEpisodeList from "./api.ts";

export interface APIConfig {
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

export type FileExtension = `.${string}`;

export type CLIConfig = ParseOptions;

export interface Config {
  apiConfig: APIConfig;
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
  seasonDir: string;
  oldName: string;
  newName: string;
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
  const filesToRename = filterFiles(dir, config.fileExtensions);
  if (!filesToRename.length) return;
  const renameMap = generateRenameMap(
    episodeList.slice(0, filesToRename.length),
    filesToRename.slice(0, episodeList.length),
    dir
  );
  if (mapOnly) return renameMap;
  renameFiles(dir, renameMap, groupSeaons);
}

export async function renameFiles(
  dir: string,
  renameMap: RenameMap,
  groupSeaons = false
) {
  let filesRenamedCount = 0;
  for (const { seasonDir, oldName, newName } of renameMap) {
    if (groupSeaons && !(await exists(seasonDir))) Deno.mkdirSync(seasonDir);
    const oldPath = resolve(join(dir, oldName));
    const newPath = resolve(
      format({
        dir: groupSeaons ? seasonDir : dir,
        name: newName,
        ext: extname(oldName),
      })
    );
    if (oldPath === newPath) continue;
    Deno.rename(oldPath, newPath);
    filesRenamedCount++;
  }
  return filesRenamedCount;
}

export function filterFiles(dir: string, extensionList?: FileExtension[]) {
  return toSortedDirEntries(Deno.readDirSync(dir)).reduce(
    (valid: Deno.DirEntry[], f) => {
      if (f.isFile) {
        const fileExt = extname(f.name) as FileExtension;
        if (isValidExt(fileExt, extensionList)) valid.push(f);
      }
      return valid;
    },
    []
  );
}

export function isValidExt(
  fileExt: FileExtension,
  extensionList?: FileExtension[]
) {
  return extensionList?.includes(fileExt);
}

export function generateRenameMap(
  episodeList: Episode[],
  filesToRename: Deno.DirEntry[],
  showDir: string
): RenameMap {
  const episodeNames = episodeList.map((e) => generateEpisodeName(e));
  const seasonNames = episodeList.map(({ season }) =>
    generateSeasonName(
      season,
      episodeList.filter((e) => e.season === season)
    )
  );
  const fileNames = filesToRename.map((f) => f.name);
  return fileNames.map((filename, i) => {
    return {
      seasonDir: join(showDir, seasonNames[i]),
      oldName: filename,
      newName: episodeNames[i],
    };
  });
}

export function generateEpisodeName(episode: Episode) {
  return `S${pad(episode.season)} E${pad(
    episode.number
  )} - ${episode.name.replace(/[\\/:*?"<>|]/g, "")}`;
}

export function generateSeasonName(season: number, seasonEpisodes: Episode[]) {
  const seaonNumber = `Season ${pad(season)}`;
  const firstEpisodeYear = new Date(seasonEpisodes[0].airdate).getFullYear();
  const lastEpisodeYear = new Date(
    seasonEpisodes.slice(-1)[0].airdate
  ).getFullYear();
  if (firstEpisodeYear === lastEpisodeYear)
    return [seaonNumber, `(${firstEpisodeYear})`].join(" ");
  return [seaonNumber, `(${firstEpisodeYear}-${lastEpisodeYear})`].join(" ");
}

export function toSortedDirEntries(entries: IteratorObject<Deno.DirEntry>) {
  return [...entries].toSorted((a, b) => {
    const [aFixed, bFixed] = [a.name, b.name].map((n) => padNumberInString(n));
    return aFixed > bFixed ? 1 : -1;
  });
}

export function toSortedStrings(array: string[]) {
  return array.toSorted((a, b) => {
    const [aFixed, bFixed] = [a, b].map((s) => padNumberInString(s));
    return aFixed > bFixed ? 1 : -1;
  });
}

export function padNumberInString(string: string) {
  return string.replace(/\d+/, (m) => pad(parseInt(m)));
}

export function pad(number: number) {
  return number < 10 ? `0${number}` : number.toString();
}
