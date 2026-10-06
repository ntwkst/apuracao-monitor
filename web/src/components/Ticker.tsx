import type { ReactNode } from "react";

interface Props {
  tag: string;
  text: ReactNode;
}

export function Ticker({ tag, text }: Props) {
  return (
    <footer className="ticker" role="status">
      <span className="ticker-tag">{tag}</span>
      <span className="ticker-text">{text}</span>
    </footer>
  );
}
