import { useEffect, useRef, useState } from 'react';

// A console-style boot video that plays once per browser tab session before
// the arcade itself is reachable - no controls, no skip, can't be paused.
//
// Browsers block autoplay-with-sound until the page has seen a user
// gesture, so a cold open (typing the URL, a fresh tab) will reject the
// initial play() call. Rather than silently fall back to muted (which
// would quietly break the "plays with audio" requirement) this shows a
// single unavoidable tap prompt that both satisfies the gesture
// requirement and starts the video - after that tap there's still no way
// to pause/skip/replay it.
export default function BootScreen({ onDone }) {
  const videoRef = useRef(null);
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setNeedsTap(true));
  }, []);

  function handleTap() {
    const video = videoRef.current;
    if (!video) return;
    video.play().then(() => setNeedsTap(false)).catch(onDone);
  }

  return (
    <div className="np-boot" onClick={needsTap ? handleTap : undefined}>
      <video
        ref={videoRef}
        className="np-boot-video"
        src="/boot.mp4"
        onEnded={onDone}
        playsInline
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload noplaybackrate nofullscreen"
        onContextMenu={(e) => e.preventDefault()}
      />
      {needsTap && <p className="np-boot-tap">Tap to start</p>}
    </div>
  );
}
