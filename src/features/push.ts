import { debug } from "@actions/core";
import type { Context } from "@actions/github/lib/context";
import type { GitHub } from "@actions/github/lib/utils";
import { execSync } from "child_process";
import frontMatter from "front-matter";
import { promises } from "fs";
import { extname, join } from "path";
import recursiveReaddir from "recursive-readdir";
import type { ApiRecord, FrontMatter } from "../interfaces";

export const onPush = async (params: {
  context: Context;
  octokit: InstanceType<typeof GitHub>;
  dirName: string;
  commitEmail: string;
  commitUsername: string;
  teamName?: string;
}) => {
  debug("Started onPush");
  const { context, octokit, dirName, commitEmail, commitUsername, teamName } = params;
  const { owner, repo } = context.repo;
  const { readFile, writeFile } = promises;

  const files = await recursiveReaddir(join(".", dirName));
  debug(`Found ${files.length} total files`);
  const markdownFiles = files.filter((i) => extname(i) === ".md");
  debug(`Found ${markdownFiles.length} markdown files`);

  const api: ApiRecord[] = [];

  for await (const file of markdownFiles) {
    debug(`Reading ${file}`);
    const content = await readFile(join(".", file), "utf8");
    const { attributes, body } = frontMatter<FrontMatter>(content);
    const title = (body.split("\n").find((i) => i.startsWith("# ")) || "").replace("# ", "").trim();
    debug(`Post title is: ${title}`);
    const createdAt = new Date(
      execSync(`git log --format=%aD ${file} | tail -1`).toString().trim()
    );
    debug(`Post created at ${createdAt}`);
    if (attributes.draft) debug("Post is a draft, skipping");
    if ((!attributes.issue || !attributes.author) && !attributes.draft) {
      debug("No attributes found, setting up");
      const commits = await octokit.repos.listCommits({
        owner,
        repo,
        path: file,
      });
      const lastCommit = commits.data[commits.data.length - 1];
      if (!lastCommit) throw new Error("No commit history found for this file");
      debug(`First commit is ${lastCommit.sha}`);
      const assignee = lastCommit.author.login;
      debug(`Assignee is ${assignee}`);
      const issue = await octokit.issues.create({
        owner,
        repo,
        title: `RFC: ${title}`,
        body:
          `Let's use this issue to discuss the proposal **${title}** by @${assignee} 👇

[**📖 Read the proposal**](https://github.com/${owner}/${repo}/blob/HEAD/${file}) · [🕒 History](https://github.com/${owner}/${repo}/commits/HEAD/${file}) · [👥 Blame](https://github.com/${owner}/${repo}/blame/HEAD/${file})

🔔 Pinging @${teamName || `${owner}/everyone`}, please give your feedback!
`.trim() + "\n",
        assignee,
        labels: ["rfc"],
      });
      attributes.issue = issue.data.number;
      debug(`Create issue #${attributes.issue}`);
      attributes.author = assignee;
      await writeFile(
        join(".", file),
        `---
${Object.keys(attributes)
  .map((i) => `${i}: ${attributes[i]}`)
  .join("\n")}
---

${body}

## Discuss

Discuss this RFC document in the issue [#${
          attributes.issue
        }](https://github.com/${owner}/${repo}/issues/${
          attributes.issue
        }): [**Discuss this document →**](https://github.com/${owner}/${repo}/issues/${
          attributes.issue
        })
`.trim() + "\n"
      );
      debug("Written file");
    }
    if (attributes.issue)
      api.push({
        title,
        file,
        author: attributes.author || "",
        issue: attributes.issue,
        createdAt: createdAt.toISOString(),
      });
  }
  await writeFile(join(".", "api.json"), JSON.stringify(api, null, 2));
  debug("Written api.json file");
  execSync(`git config --global user.email "${commitEmail}"`);
  execSync(`git config --global user.name "${commitUsername}"`);
  execSync("git pull");
  debug("Added git config user details");
  execSync("git add .");
  execSync('git commit -m ":bento: Update API and front matter [skip ci]"');
  debug("Committed to git history");
  execSync("git push");
  debug("Pushed to repository");
};
