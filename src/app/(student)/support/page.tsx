import Link from "next/link";
import { TabletSmartphone, Wifi, Volume2, RotateCcw, MessageCircleQuestion } from "lucide-react";
import { requireCurrentUser } from "@/lib/auth/session";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const GUIDES = [
  {
    icon: TabletSmartphone,
    question: "Which tablets work with Parrot Kindergarten?",
    answer:
      "Any tablet running iOS 15+ or Android 10+ with a 7\" screen or larger works well. We recommend mounting it at your bird's eye level for lessons.",
  },
  {
    icon: Wifi,
    question: "Lessons won't load or keep buffering",
    answer:
      "Move the tablet closer to your router, or switch to a 5GHz network if available. If it still buffers, try closing other apps running in the background.",
  },
  {
    icon: Volume2,
    question: "My bird can't hear the lesson audio clearly",
    answer:
      "Turn the tablet volume all the way up first, then adjust in-lesson volume from the player controls. For flighted or nervous birds, an external Bluetooth speaker placed near their perch helps a lot.",
  },
  {
    icon: RotateCcw,
    question: "Progress isn't saving between sessions",
    answer:
      "Make sure you're signed in with the same account every time, and avoid closing the tab mid-lesson -- progress saves automatically as you go, a few seconds after each step.",
  },
];

export default async function SupportPage() {
  await requireCurrentUser();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="rounded-[2.5rem] border border-[#f3ecd7] bg-[#FCF6ED] p-8 shadow-sm md:p-12">
        <h1 className="font-heading mb-2 text-3xl font-bold text-[#1f1737] md:text-4xl">Tablet Setup Help</h1>
        <p className="text-base font-medium text-[#6D5D3B]">
          Guides and troubleshooting to get your lessons running smoothly.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <Accordion multiple>
          {GUIDES.map((guide, i) => {
            const Icon = guide.icon;
            return (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger>
                  <span className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8F5E9] text-[#10B981]">
                      <Icon className="size-4" />
                    </span>
                    <span className="font-heading font-semibold text-[#1F2937]">{guide.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pl-12 text-sm leading-relaxed text-[#4B5563]">{guide.answer}</p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <span className="flex size-12 items-center justify-center rounded-full bg-[#FFE4E4] text-[#FF5757]">
          <MessageCircleQuestion className="size-6" />
        </span>
        <p className="font-heading font-semibold text-[#1F2937]">Still stuck?</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          The community is full of people who&apos;ve solved the same setup hiccups.
        </p>
        <Link
          href="/community?compose=question"
          className="mt-1 rounded-full bg-[#FF6B6B] px-6 py-2.5 font-bold text-white transition-colors hover:bg-[#ff5555]"
        >
          Ask the Community
        </Link>
      </div>
    </div>
  );
}
