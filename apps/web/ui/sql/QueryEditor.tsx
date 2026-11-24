"use client";

import { useEffect, useRef, useState } from "react";
import type { EditorView } from "@codemirror/view";

interface Props {
  value: string;
  onChange: (sql: string) => void;
  onRun: () => void;
}

/** CodeMirror 6 with Postgres highlighting, loaded on SQL pages only; a plain textarea until it arrives. */
export function QueryEditor({ value, onChange, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const latest = useRef({ onChange, onRun, value });
  latest.current = { onChange, onRun, value };
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    void (async () => {
      const [{ EditorView: View, keymap, lineNumbers, highlightActiveLine }, { EditorState }, { defaultKeymap, history, historyKeymap }, { sql, PostgreSQL }, { syntaxHighlighting }, { classHighlighter }] =
        await Promise.all([import("@codemirror/view"), import("@codemirror/state"), import("@codemirror/commands"), import("@codemirror/lang-sql"), import("@codemirror/language"), import("@lezer/highlight")]);
      if (gone || !host.current) return;
      view.current = new View({
        parent: host.current,
        state: EditorState.create({
          doc: latest.current.value,
          extensions: [
            lineNumbers(),
            highlightActiveLine(),
            history(),
            keymap.of([{ key: "Mod-Enter", preventDefault: true, run: () => (latest.current.onRun(), true) }, ...defaultKeymap, ...historyKeymap]),
            sql({ dialect: PostgreSQL, upperCaseKeywords: true }),
            syntaxHighlighting(classHighlighter),
            View.lineWrapping,
            View.contentAttributes.of({ "aria-label": "SQL query. Ctrl or Command plus Enter runs it." }),
            View.updateListener.of((u) => {
              if (u.docChanged) latest.current.onChange(u.state.doc.toString());
            }),
          ],
        }),
      });
      setReady(true);
    })();
    return () => {
      gone = true;
      view.current?.destroy();
      view.current = null;
    };
  }, []);

  // A new task, a reset or "put the solution in the editor" replaces the text.
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
  }, [value]);

  return (
    <div className="sql-editor" data-ready={ready || undefined}>
      {!ready && (
        <textarea
          aria-label="SQL query. Ctrl or Command plus Enter runs it."
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onRun();
            }
          }}
        />
      )}
      <div ref={host} className="cm-host" hidden={!ready} />
    </div>
  );
}
