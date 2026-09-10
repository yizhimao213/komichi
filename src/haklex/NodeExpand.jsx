import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const NodeExpandContext = createContext({
  expandNested: () => {},
  expandDraw: () => {},
  close: () => {},
});

export function useNodeExpand() {
  return useContext(NodeExpandContext);
}

export function NodeExpandProvider({ children }) {
  const [view, setView] = useState(null);
  const expandNested = useCallback((payload) => {
    if (!payload?.content) return;
    setView({ kind: "nested", title: payload.title || "嵌套文档", content: payload.content });
  }, []);
  const expandDraw = useCallback((payload) => {
    if (!payload?.content) return;
    setView({ kind: "draw", title: "白板", content: payload.content });
  }, []);
  const close = useCallback(() => setView(null), []);

  return (
    <NodeExpandContext.Provider value={{ expandNested, expandDraw, close }}>
      {children}
      {view ? <ExpandOverlay view={view} onClose={close} /> : null}
    </NodeExpandContext.Provider>
  );
}

function ExpandOverlay({ view, onClose }) {
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={["node-expand", view.kind === "draw" ? "is-draw" : ""].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
    >
      <div className="node-expand-bar">
        <p>{view.title}</p>
        <button type="button" onClick={onClose} aria-label="关闭">
          关闭
        </button>
      </div>
      <div className="node-expand-body">{view.content}</div>
    </div>,
    document.body
  );
}
