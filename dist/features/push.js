"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onPush = void 0;
const core_1 = require("@actions/core");
const child_process_1 = require("child_process");
const front_matter_1 = __importDefault(require("front-matter"));
const prettier_1 = require("prettier");
const fs_1 = require("fs");
const path_1 = require("path");
const recursive_readdir_1 = __importDefault(require("recursive-readdir"));
const markdown_toc_1 = __importDefault(require("markdown-toc"));
const onPush = async (params) => {
    core_1.debug("Started onPush");
    const { context, octokit, dirName, commitEmail, commitUsername, teamName } = params;
    const { owner, repo } = context.repo;
    const { readFile, writeFile } = fs_1.promises;
    const files = await recursive_readdir_1.default(path_1.join(".", dirName));
    core_1.debug(`Found ${files.length} total files`);
    const markdownFiles = files.filter((i) => path_1.extname(i) === ".md");
    core_1.debug(`Found ${markdownFiles.length} markdown files`);
    const api = [];
    for await (const file of markdownFiles) {
        core_1.debug(`Reading ${file}`);
        const content = await readFile(path_1.join(".", file), "utf8");
        const { attributes, body } = front_matter_1.default(content);
        const title = (body.split("\n").find((i) => i.startsWith("# ")) || "").replace("# ", "").trim();
        core_1.debug(`Post title is: ${title}`);
        const createdAt = new Date(child_process_1.execSync(`git log --format=%aD ${file} | tail -1`).toString().trim());
        core_1.debug(`Post created at ${createdAt}`);
        if (attributes.draft)
            core_1.debug("Post is a draft, skipping");
        if ((!attributes.issue || !attributes.author) && !attributes.draft) {
            core_1.debug("No attributes found, setting up");
            const commits = await octokit.repos.listCommits({
                owner,
                repo,
                path: file,
            });
            const lastCommit = commits.data[commits.data.length - 1];
            if (!lastCommit)
                throw new Error("No commit history found for this file");
            core_1.debug(`First commit is ${lastCommit.sha}`);
            const assignee = lastCommit.author.login;
            core_1.debug(`Assignee is ${assignee}`);
            const issue = await octokit.issues.create({
                owner,
                repo,
                title: `RFC: ${title}`,
                body: `Let's use this issue to discuss the proposal **${title}** by @${assignee} 👇

[**📖 Read the proposal**](https://github.com/${owner}/${repo}/blob/HEAD/${file}) · [🕒 History](https://github.com/${owner}/${repo}/commits/HEAD/${file}) · [👥 Blame](https://github.com/${owner}/${repo}/blame/HEAD/${file})

🔔 Pinging @${teamName || `${owner}/everyone`}, please give your feedback!
`.trim() + "\n",
                assignee,
                labels: ["rfc"],
            });
            attributes.issue = issue.data.number;
            core_1.debug(`Create issue #${attributes.issue}`);
            attributes.author = assignee;
            await writeFile(path_1.join(".", file), `---
${Object.keys(attributes)
                .map((i) => `${i}: ${attributes[i]}`)
                .join("\n")}
---

${body}

## Discuss

Discuss this RFC document in the issue [#${attributes.issue}](https://github.com/${owner}/${repo}/issues/${attributes.issue}): [**Discuss this document →**](https://github.com/${owner}/${repo}/issues/${attributes.issue})
`.trim() + "\n");
            core_1.debug("Written file");
        }
        const oldBody = await readFile(path_1.join(".", file), "utf8");
        if (!oldBody.includes("Table of contents")) {
            let newBody = oldBody;
            newBody = newBody.replace("## ", `## Table of contents\n\n${markdown_toc_1.default(oldBody).content}\n\n## `);
            await writeFile(path_1.join(".", file), prettier_1.format(newBody, { parser: "markdown" }));
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
    await writeFile(path_1.join(".", "api.json"), JSON.stringify(api, null, 2));
    core_1.debug("Written api.json file");
    child_process_1.execSync(`git config --global user.email "${commitEmail}"`);
    child_process_1.execSync(`git config --global user.name "${commitUsername}"`);
    child_process_1.execSync("git pull");
    core_1.debug("Added git config user details");
    child_process_1.execSync("git add .");
    child_process_1.execSync('git commit -m ":bento: Update API and front matter [skip ci]"');
    core_1.debug("Committed to git history");
    child_process_1.execSync("git push");
    core_1.debug("Pushed to repository");
};
exports.onPush = onPush;
//# sourceMappingURL=push.js.map