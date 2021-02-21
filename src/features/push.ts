import { debug } from "@actions/core";
import type { Context } from "@actions/github/lib/context";
import type { GitHub } from "@actions/github/lib/utils";

export const onPush = async (params: {
  context: Context;
  octokit: InstanceType<typeof GitHub>;
  dirName: string;
}) => {
  debug("Started onPush");
  const { context, octokit, dirName } = params;
};
