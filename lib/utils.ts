import { extname } from "jsr:@std/path@1.1.2/extname";

export interface APIConfig {
  baseURL: string;
  endpoints: {
    [x: string]: ((p: string) => string) | ((p: number) => string);
  };
}

export type FileExtension = `.${string}`;

export function filterFileTypes(dir: string, fileExtensions?: FileExtension[]) {
  return Deno.readDirSync(dir).reduce((valid: string[], file) => {
    if (file.isFile) {
      const fileExt = extname(file.name) as FileExtension;
      if (isValidExt(fileExt, fileExtensions)) valid.push(file.name);
    }
    return valid;
  }, []);
}

export function isValidExt(
  fileExt: FileExtension,
  extensionList?: FileExtension[]
) {
  return extensionList?.includes(fileExt);
}

export function iterableMatch<T1, T2>(
  iter1: Iterable<T1>,
  iter2: Iterable<T2>,
  iter1ElementAs: T1 extends string ? undefined : (e1: T1) => string,
  iter2ElementAs: T2 extends Parameters<string["match"]>[0]
    ? undefined
    : (e2: T2) => Parameters<string["match"]>[0]
): Map<T1, T2> {
  iter1ElementAs ? true : Array.from(iter1);
  return [...iter1].reduce((map, e1) => {
    [...iter2].forEach((e2) => {
      const preparedE1 = iter1ElementAs ? iter1ElementAs(e1) : String(e1);
      const preparedE2 = iter2ElementAs
        ? iter2ElementAs(e2)
        : new RegExp(String(e2));
      if (preparedE1.match(preparedE2)) map.set(e1, e2);
    });
    return map;
  }, new Map());
}

export function compareString(string1: string, string2: string) {
  const wordSetOne = new Set(string1.split(/\b/));
  const wordSetTwo = new Set(string2.split(/\b/));
  return wordSetOne.intersection(wordSetTwo).size;
}

export function toSortedStrings(array: string[]) {
  const digits = array.join().match(/\d+/g);
  if (!digits?.length) return array;
  const longestDigit = digits.reduce((ld, d) =>
    ld.length < d.length ? d : ld
  );
  const digitsPaddingLength = longestDigit.length;
  return array.toSorted((a, b) => {
    const [aFixed, bFixed] = [a, b].map((s) =>
      padStartDigits(s, digitsPaddingLength)
    );
    return aFixed > bFixed ? 1 : -1;
  });
}

export function padStartDigits(
  content: string | number,
  paddingLength: number
) {
  return content
    .toString()
    .replace(/\d+/g, (m) => m.padStart(paddingLength, "0"));
}
