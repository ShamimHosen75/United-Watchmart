/** Minimal dark, gold-accented email HTML that renders well in most mail clients. */

export type Row = [label: string, value: string];

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function emailHtml(opts: { dir: "ltr" | "rtl"; title: string; intro: string; rows: Row[]; footer?: string }) {
  const { dir, title, intro, rows, footer } = opts;
  const align = dir === "rtl" ? "right" : "left";
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:10px 0;color:#a8997f;font-size:13px;letter-spacing:.08em;text-transform:uppercase;width:38%;vertical-align:top">${esc(k)}</td><td style="padding:10px 0;color:#efe6d6;font-size:15px">${esc(v).replace(/\n/g, "<br>")}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html dir="${dir}"><body style="margin:0;background:#0e0803;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0e0803;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#1a120a;padding:40px;text-align:${align}">
<tr><td style="font-family:Georgia,serif;font-size:22px;color:#efe6d6;padding-bottom:24px" dir="ltr" align="${align}">United <span style="color:#c9a35c">WatchMart</span></td></tr>
<tr><td style="font-family:Georgia,serif;font-size:28px;color:#efe6d6;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="color:#efe6d6;font-size:15px;line-height:1.6;padding-bottom:24px">${esc(intro)}</td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(201,163,92,.3)">${body}</table></td></tr>
${footer ? `<tr><td style="color:#a8997f;font-size:13px;line-height:1.6;padding-top:24px">${esc(footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

export const emailText = (title: string, intro: string, rows: Row[], footer?: string) =>
  [title, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`), ...(footer ? ["", footer] : [])].join("\n");
