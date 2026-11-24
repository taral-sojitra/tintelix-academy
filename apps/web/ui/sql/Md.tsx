import { Fragment } from "react";

/** Lesson text: **bold** and `code`; everything else is plain text (never HTML). */
export function Md({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*.+?\*\*|`[^`]+`)/g).map((p, i) =>
        p.length > 4 && p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : p.length > 2 && p.startsWith("`") && p.endsWith("`") ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
