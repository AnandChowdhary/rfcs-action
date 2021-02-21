export interface ApiRecord {
  title: string;
  file: string;
  author: string;
  createdAt: Date | string;
  issue: number;
}

export interface FrontMatter {
  author?: string;
  issue?: number;
}
