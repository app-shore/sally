'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Play, X } from 'lucide-react';

/**
 * A "Watch in 60s" button that opens the SALLY launch video
 * in a dark fullscreen-ish dialog overlay.
 * Works in both light and dark themes.
 */
export function VideoLightbox() {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <Button
          variant="outline"
          size="lg"
          onClick={() => setOpen(true)}
          className="rounded-full px-8 py-6 h-auto text-sm md:text-base tracking-[0.15em] uppercase font-light gap-3 border-muted-foreground/30 hover:border-foreground/50 transition-all hover:scale-105"
        >
          <Play className="h-4 w-4" />
          Watch in 60 seconds
        </Button>
      </motion.div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl w-[95vw] p-0 border-none bg-black overflow-hidden rounded-xl">
          <DialogTitle className="sr-only">SALLY Launch Video</DialogTitle>
          {/* Close button */}
          <button
            onClick={() => handleOpenChange(false)}
            className="absolute top-3 right-3 z-50 rounded-full p-2 bg-black/60 hover:bg-black/80 text-white transition-colors"
            aria-label="Close video"
          >
            <X className="h-5 w-5" />
          </button>
          {/* Video player */}
          <video
            ref={videoRef}
            autoPlay
            controls
            playsInline
            className="w-full aspect-video"
          >
            <source src="/videos/sally-launch.webm" type="video/webm" />
            <source src="/videos/sally-launch.mp4" type="video/mp4" />
          </video>
        </DialogContent>
      </Dialog>
    </>
  );
}
