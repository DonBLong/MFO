import { defineConfig } from "./lib/mfo.ts";

export default defineConfig({
  apiConfig: {
    baseURL: "https://api.tvmaze.com",
    endpoints: {
      showByTitle(title) {
        return `/search/shows?q=${title}`;
      },
      showByTitleExactMatch(title) {
        return `/singlesearch/shows?q=${title}`;
      },
      showById(id) {
        return `/shows/${id}`;
      },
      seasonsByShowId(id) {
        return `/shows/${id}/seasons`;
      },
      episodesByShowId(id) {
        return `/shows/${id}/episodes`;
      },
      episodesBySeasonId(id) {
        return `/seasons/${id}/episodes`;
      },
      imagesByShowId(id) {
        return `/shows/${id}/images`;
      },
    },
  },
  fileExtensions: [".avi", ".flv", ".mkv", ".mp4", ".mov", ".txt"],
  cliConfig: {
    alias: {
      dir: "d",
      title: "t",
      season: "s",
      group: "g",
    },
    boolean: ["group"],
  },
});
