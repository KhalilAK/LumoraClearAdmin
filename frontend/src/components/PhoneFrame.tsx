import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { LoadingIndicator } from "./LoadingIndicator";

export interface PhoneFrameHandle {
  // Forwards to the embedded iframe's contentWindow.postMessage, so the page
  // holding a ref doesn't need to know the iframe exists underneath.
  postMessage: (message: unknown, targetOrigin?: string) => void;
}

interface PhoneFrameProps {
  src: string;
  width?: number;
  height?: number;
  title?: string;
  onLoad?: () => void;
}

// Renders an iframe inside an iPhone-shaped chrome (notch, home indicator,
// rounded-corner clipping) — used by the Color Scheme page's "Live App
// Simulator" to preview the real Expo web app, not just the static mockup.
// Chrome proportions (notch, radii, bezel) scale off `width` so the frame
// still looks like a phone at sizes other than the default.
export const PhoneFrame = forwardRef<PhoneFrameHandle, PhoneFrameProps>(function PhoneFrame(
  { src, width = 375, height = 812, title = "App preview", onLoad },
  ref
) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useImperativeHandle(ref, () => ({
    postMessage: (message, targetOrigin = "*") => {
      iframeRef.current?.contentWindow?.postMessage(message, targetOrigin);
    },
  }));

  function handleLoad() {
    setLoaded(true);
    onLoad?.();
  }

  const bezel = Math.round(width * 0.037);
  const outerRadius = Math.round(width * 0.117);
  const innerRadius = Math.round(width * 0.085);
  const notchWidth = Math.round(width * 0.32);
  const notchHeight = Math.round(width * 0.069);
  const indicatorWidth = Math.round(width * 0.32);
  const indicatorHeight = Math.max(3, Math.round(width * 0.011));

  return (
    <div className="phone-frame" style={{ width, height, padding: bezel, borderRadius: outerRadius }}>
      <div
        className="phone-frame-notch"
        style={{ top: bezel, width: notchWidth, height: notchHeight, borderRadius: `0 0 ${Math.round(notchHeight * 0.6)}px ${Math.round(notchHeight * 0.6)}px` }}
      />

      <div className="phone-frame-screen" style={{ borderRadius: innerRadius }}>
        <iframe ref={iframeRef} src={src} title={title} className="phone-frame-iframe" onLoad={handleLoad} />

        {!loaded && (
          <div className="phone-frame-loading">
            <LoadingIndicator size="sm" label="Loading app…" />
          </div>
        )}
      </div>

      <div
        className="phone-frame-home-indicator"
        style={{ bottom: Math.round(bezel * 0.6), width: indicatorWidth, height: indicatorHeight, borderRadius: indicatorHeight }}
      />
    </div>
  );
});
