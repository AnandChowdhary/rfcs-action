import { getInput, setFailed } from "@actions/core";
import { getOctokit } from "@actions/github";
import { context } from "@actions/github/lib/utils";
import { onPush } from "./features/push";

const token = getInput("token") || process.env.GH_PAT || process.env.GITHUB_TOKEN;

export const run = async () => {
  if (!token) throw new Error("GitHub token not found");
  const octokit = getOctokit(token);

  const dirName = getInput("dirName") || "rfcs";
  const command = getInput("command") || "on-push";
  const commitEmail =
    getInput("commitEmail") || "41898282+github-actions[bot]@users.noreply.github.com";
  const commitUsername = getInput("commitUsername") || "github-actions[bot]";
  const teamName = getInput("teamName");

  if (command === "on-push")
    return onPush({ context, octokit, dirName, commitEmail, commitUsername, teamName });
};

run()
  .then(() => {})
  .catch((error) => {
    console.error("ERROR", error);
    setFailed(error.message);
  });
