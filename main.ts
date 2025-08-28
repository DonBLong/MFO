import { parseArgs } from "jsr:@std/cli@1.0.21/parse-args";
import { Spinner } from "jsr:@std/cli@1.0.21/unstable-spinner";
import config from "./mfo.config.ts";
import organize, { renameFiles } from "./lib/mfo.ts";

const { dir, title, season, group } = parseArgs(Deno.args, config.cliConfig);
const spinner = new Spinner();

console.log("Directory:", dir);
console.log("Title:", title);
console.log("Season:", season);
console.log("Group seasons:", group);

spinner.message = "Generating rename map...";
spinner.start();
const renameMap = await organize(config, dir, title, season, group, true);
spinner.stop();

if (!renameMap) {
  console.error(
    `Directory ${dir} does not contain any (${config.fileExtensions.join(
      " | "
    )}) files`
  );
  Deno.exit();
}
console.log("Rename map:");
if (group) console.table(renameMap);
else console.table(renameMap, ["oldName", "newName"]);

const answer = prompt("Would you like to proceed? (y/n): ");

if (answer == null || answer === "n") Deno.exit();
spinner.message = "Renaming files...";
spinner.start();
const filesRenamedCount = await renameFiles(dir, renameMap, group);
spinner.stop();
console.log("Files-renamed count:", filesRenamedCount);
console.log("*** Done ***");
