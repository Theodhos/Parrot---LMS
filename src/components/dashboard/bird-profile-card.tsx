import { Flame, Star, Target, ChevronRight } from "lucide-react";
import Link from "next/link";

interface BirdProfileCardProps {
  name: string;
  species: string;
  streakDays: number;
  favoriteReward: string;
  nextGoal: string;
  imageUrl: string;
}

export function BirdProfileCard({ name, species, streakDays, favoriteReward, nextGoal, imageUrl }: BirdProfileCardProps) {
  return (
    <div className="flex flex-col bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold tracking-widest text-[#FF5757] uppercase">
          Bird Profile
        </span>
        <Link href="/profile" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronRight className="size-5" />
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
        <img src={imageUrl} alt={name} className="size-14 rounded-full object-cover border-2 border-gray-100" />
        <div className="flex flex-col">
          <span className="font-heading text-lg font-bold text-[#1F2937]">{name}</span>
          <span className="text-sm text-muted-foreground">{species}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#FFE4E4] text-[#FF5757] mb-1">
            <Flame className="size-4" />
          </div>
          <span className="font-bold text-[#1F2937] text-sm">{streakDays}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Day Streak</span>
        </div>

        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#FFF4E5] text-[#F59E0B] mb-1">
            <Star className="size-4" />
          </div>
          <span className="font-bold text-[#1F2937] text-sm leading-tight">{favoriteReward}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Favorite Reward</span>
        </div>

        <div className="flex flex-col items-center text-center gap-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#E6F3FB] text-[#3B82F6] mb-1">
            <Target className="size-4" />
          </div>
          <span className="font-bold text-[#1F2937] text-sm leading-tight">{nextGoal}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Next Goal</span>
        </div>
      </div>
    </div>
  );
}
