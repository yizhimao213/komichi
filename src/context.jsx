import { createContext, useContext, useLayoutEffect, useState } from "react";

export const SEASON_LIST = [
  { id: "spring", label: "春" },
  { id: "summer", label: "夏" },
  { id: "autumn", label: "秋" },
  { id: "winter", label: "冬" },
];

const HeaderMetaContext = createContext({
  meta: {},
  setMeta: () => {},
  tocOpen: false,
  setTocOpen: () => {},
});

const SeasonContext = createContext({
  season: "autumn",
  setSeason: () => {},
});

export function HeaderMetaProvider({ children }) {
  const [meta, setMeta] = useState({});
  const [tocOpen, setTocOpen] = useState(false);
  return (
    <HeaderMetaContext.Provider value={{ meta, setMeta, tocOpen, setTocOpen }}>
      {children}
    </HeaderMetaContext.Provider>
  );
}

export function useHeaderMeta(next) {
  const { setMeta } = useContext(HeaderMetaContext);
  const title = next?.title || "";
  const cover = next?.hasCover ? "1" : "";
  useLayoutEffect(() => {
    setMeta(next || {});
    return () => setMeta({});
  }, [title, cover, setMeta]);
}

export function useHeaderState() {
  return useContext(HeaderMetaContext);
}

export function SeasonProvider({ value, children }) {
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason() {
  return useContext(SeasonContext);
}
