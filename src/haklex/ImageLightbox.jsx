import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ImageLightboxContext = createContext({
  open: () => {},
  close: () => {},
});

export function useImageLightbox() {
  return useContext(ImageLightboxContext);
}

export function openImageSrc(open, src, alt = "") {
  if (!src || typeof open !== "function") return;
  const current = { src, alt };
  open({ current, images: [current], index: 0 });
}

export function ImageLightboxProvider({ children }) {
  const [view, setView] = useState(null);
  const open = useCallback((payload) => {
    const current = payload?.current;
    if (!current?.src) return;
    const images = Array.isArray(payload.images) && payload.images.length ? payload.images : [current];
    const index = Math.min(Math.max(payload.index ?? 0, 0), images.length - 1);
    setView({ images, index });
  }, []);
  const close = useCallback(() => setView(null), []);

  return (
    <ImageLightboxContext.Provider value={{ open, close }}>
      {children}
      {view ? <Lightbox view={view} setView={setView} onClose={close} /> : null}
    </ImageLightboxContext.Provider>
  );
}

function Lightbox({ view, setView, onClose }) {
  const total = view.images.length;
  const current = view.images[view.index] || view.images[0];

  const go = useCallback(
    (delta) => {
      if (total < 2) return;
      setView((prev) => {
        if (!prev) return prev;
        const next = (prev.index + delta + prev.images.length) % prev.images.length;
        return { ...prev, index: next };
      });
    },
    [setView, total]
  );

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  if (!current?.src) return null;

  return createPortal(
    <div className="image-lightbox" onClick={onClose} role="dialog" aria-modal="true" aria-label="查看图片">
      {total > 1 ? (
        <button
          type="button"
          className="image-lightbox-nav is-prev"
          aria-label="上一张"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
        >
          ‹
        </button>
      ) : null}
      <img
        src={current.src}
        alt={current.alt || current.caption || ""}
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
      />
      {total > 1 ? (
        <button
          type="button"
          className="image-lightbox-nav is-next"
          aria-label="下一张"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
        >
          ›
        </button>
      ) : null}
      {current.caption || total > 1 ? (
        <p className="image-lightbox-cap" onClick={(e) => e.stopPropagation()}>
          {current.caption || current.alt || ""}
          {total > 1 ? <span>{view.index + 1} / {total}</span> : null}
        </p>
      ) : null}
    </div>,
    document.body
  );
}
