import type { Context } from "@actions/github/lib/context";
import type { GitHub } from "@actions/github/lib/utils";
export declare const onPush: (params: {
    context: Context;
    octokit: InstanceType<typeof GitHub>;
    dirName: string;
    commitEmail: string;
    commitUsername: string;
}) => Promise<void>;
