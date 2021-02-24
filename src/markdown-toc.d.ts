declare module "markdown-toc" {
  const markdownToc: (
    md: string
  ) => {
    content: string;
    highest: number;
    tokens: any[];
  };
  export default markdownToc;
}
