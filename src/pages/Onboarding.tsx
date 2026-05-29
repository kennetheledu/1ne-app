import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, Gift, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";

const slides = [
  {
    icon: Heart,
    emoji: "💕",
    title: "Welcome to 1ne",
    body: "A playful rewards app made for you and your favorite person.",
    gradient: "from-pink-200 via-rose-200 to-rose-300",
  },
  {
    icon: Gift,
    emoji: "🎁",
    title: "Link with your partner",
    body: "Share your invite code and pair up in seconds. Everything is private between you two.",
    gradient: "from-lavender-200 via-pink-200 to-rose-200",
  },
  {
    icon: Sparkles,
    emoji: "✨",
    title: "Celebrate every little win",
    body: "Earn together, cheer each other on, and make the small moments feel big.",
    gradient: "from-mint-200 via-lavender-200 to-pink-200",
  },
];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    const t = setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(t);
  }, []);

  const slide = slides[idx];
  const Icon = slide.icon;
  const isLast = idx === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Floating decorative blobs */}
      <div className="absolute -top-20 -left-16 w-64 h-64 rounded-full bg-pink-200/60 blur-3xl animate-floaty" />
      <div className="absolute top-40 -right-20 w-72 h-72 rounded-full bg-lavender-200/60 blur-3xl animate-floaty" style={{ animationDelay: "2s" }} />
      <div className="absolute bottom-20 left-10 w-56 h-56 rounded-full bg-mint-200/60 blur-3xl animate-floaty" style={{ animationDelay: "4s" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 border border-white shadow-soft text-xs font-bold text-rose-500 mb-4">
            <Heart size={12} className="fill-rose-400 text-rose-400" />
            Phase 1 — Link & Play
          </div>
        </motion.div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={idx}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -dir * 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="w-full max-w-sm"
          >
            <div
              className={`rounded-[36px] p-8 bg-gradient-to-br ${slide.gradient} shadow-soft border border-white/80`}
            >
              <motion.div
                animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="text-6xl text-center mb-4"
              >
                {slide.emoji}
              </motion.div>
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-cute">
                  <Icon className="text-rose-500" size={24} />
                </div>
              </div>
              <h1 className="font-display text-3xl font-extrabold text-center text-rose-700 mb-2">
                {slide.title}
              </h1>
              <p className="text-center text-rose-600/80 text-base leading-relaxed">
                {slide.body}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination dots */}
        <div className="flex gap-2 mt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDir(i > idx ? 1 : -1);
                setIdx(i);
              }}
              className={`h-2 rounded-full transition-all ${
                i === idx ? "w-8 bg-rose-400" : "w-2 bg-rose-200"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="px-6 pb-10 pt-4 relative z-10">
        <Button
          fullWidth
          size="lg"
          onClick={() => {
            if (isLast) {
              onFinish();
            } else {
              setDir(1);
              setIdx((i) => i + 1);
            }
          }}
        >
          {isLast ? "Let's go!" : "Next"}
          <ArrowRight size={18} />
        </Button>
        {!isLast && (
          <button
            onClick={onFinish}
            className="w-full text-center text-sm font-semibold text-rose-400 hover:text-rose-600 mt-3"
          >
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}
