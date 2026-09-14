import type { LearnLessonViewDTO } from "@/features/lessons/types/lesson.types";
import { LessonType } from "@/generated/prisma";

export interface LessonContentProps {
  lesson: LearnLessonViewDTO["lesson"];
}

/** Rewrites a youtube.com/youtu.be watch URL into its embeddable form; returns null for anything else. */
function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

const articleClassName =
  "flex flex-col gap-4 text-sm leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:text-lg [&_h3]:font-medium [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-3 [&_img]:rounded-lg [&_hr]:border-border";

/** Renders the main lesson body per lesson.type: embedded video, or the Tiptap-authored HTML for articles/documents. */
export function LessonContent({ lesson }: LessonContentProps) {
  if (lesson.type === LessonType.VIDEO) {
    if (!lesson.videoUrl) {
      return <p className="text-sm text-muted-foreground">This lesson does not have a video attached yet.</p>;
    }
    const embedUrl = getYouTubeEmbedUrl(lesson.videoUrl);
    return (
      <div className="flex flex-col gap-4">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={lesson.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          ) : (
            <video src={lesson.videoUrl} controls className="size-full" />
          )}
        </div>
        {lesson.content && <div className={articleClassName} dangerouslySetInnerHTML={{ __html: lesson.content }} />}
      </div>
    );
  }

  if (lesson.content) {
    return <div className={articleClassName} dangerouslySetInnerHTML={{ __html: lesson.content }} />;
  }

  return <p className="text-sm text-muted-foreground">This lesson has no content yet.</p>;
}
