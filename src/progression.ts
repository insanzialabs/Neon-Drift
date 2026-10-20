import type { Run } from "./game";
export type RecordBook = { score: number; medal: string; badges: string[] };
export const targets = [6000, 10000, 14000];
export const badgeDescriptions = [
  "3 surges in one run",
  "10 near misses in one run",
  "Gold in Midnight Sprint",
];
export function medal(value: number) {
  return value >= targets[2]
    ? "GOLD"
    : value >= targets[1]
      ? "SILVER"
      : value >= targets[0]
        ? "BRONZE"
        : "UNRANKED";
}
export function readBook(raw: string): RecordBook {
  try {
    const value = JSON.parse(raw);
    return {
      score: Number.isFinite(value.score) ? Math.max(0, value.score) : 0,
      medal: ["UNRANKED", "BRONZE", "SILVER", "GOLD"].includes(value.medal)
        ? value.medal
        : "UNRANKED",
      badges: Array.isArray(value.badges)
        ? value.badges
            .filter(
              (b: unknown) =>
                typeof b === "string" &&
                ["Wake rider", "Close-call artist", "Midnight gold"].includes(
                  b as string,
                ),
            )
            .slice(0, 3)
        : [],
    };
  } catch {
    return { score: 0, medal: "UNRANKED", badges: [] };
  }
}
export function earned(run: Run) {
  if (run.demo || !["crashed", "finished"].includes(run.phase)) return [];
  return [
    ...(run.surges >= 3 ? ["Wake rider"] : []),
    ...(run.near >= 10 ? ["Close-call artist"] : []),
    ...(run.phase === "finished" && medal(run.score) === "GOLD"
      ? ["Midnight gold"]
      : []),
  ];
}
export function challengeResult(run: Run, old: RecordBook) {
  if (run.demo || run.phase !== "finished") return old;
  const score = Math.max(old.score, Math.floor(run.score));
  return { score, medal: medal(score), badges: old.badges };
}
