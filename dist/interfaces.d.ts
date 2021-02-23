export interface ApiRecord {
    title: string;
    file: string;
    author: string;
    createdAt: Date | string;
    issue: number;
}
export declare type FrontMatter = Record<string, string> & {
    author?: string;
    issue?: number;
    draft?: boolean;
};
