export interface LessonContentProps {
  content: string | null;
}

const articleClassName =
  "flex flex-col gap-4 text-sm leading-relaxed text-[#4B5563] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-lg [&_h3]:font-medium [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_img]:rounded-lg [&_hr]:border-border";

/** Renders a lesson's Tiptap-authored HTML body. */
export function LessonContent({ content }: LessonContentProps) {
  if (!content) {
    return <p className="text-sm text-muted-foreground">This lesson has no written content yet.</p>;
  }
  return <div className={articleClassName} dangerouslySetInnerHTML={{ __html: content }} />;
}
