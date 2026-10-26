// services/email/terminationEmail.js
//
// The email accounting gets when a vendor is terminated, so they stop paying
// them for those sites. Ported from the old app's TerminationEmail.js; same
// layout (inline styles + tables, so Gmail and Outlook render it), now with
// the service lines per site and a link to the notice.
import { formatNoticeDate } from "../pandadoc/send/sendTerminationNotice.js";

// Anything that lands in the HTML is escaped — reason and back charge are
// free text, and a stray `<` or `&` would otherwise mangle the markup.
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Preserve line breaks typed into a textarea.
const escMultiline = (value) => esc(value).replace(/\r?\n/g, "<br />");

const formatUser = (u) =>
  !u ? "Unknown user" : u.email && u.email !== u.name ? `${u.name} (${u.email})` : u.name;

const S = {
  wrapper:
    "margin:0;padding:24px 12px;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;",
  card: "width:100%;max-width:640px;margin:0 auto;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;",
  header:
    "padding:20px 24px;background-color:#1f2d3d;color:#ffffff;font-size:18px;font-weight:bold;",
  headerSub: "padding:0 24px 18px;background-color:#1f2d3d;color:#c2ccd6;font-size:13px;",
  section: "padding:20px 24px 4px;",
  sectionTitle:
    "margin:0 0 12px;font-size:12px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:#5a6b7c;",
  label:
    "padding:8px 12px 8px 0;font-size:13px;color:#5a6b7c;vertical-align:top;white-space:nowrap;width:150px;",
  value: "padding:8px 0;font-size:14px;color:#1f2d3d;vertical-align:top;",
  th: "padding:8px 10px;font-size:11px;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase;color:#5a6b7c;background-color:#f4f5f7;border-bottom:1px solid #e0e0e0;text-align:left;",
  td: "padding:8px 10px;font-size:13px;color:#1f2d3d;border-bottom:1px solid #eef0f2;vertical-align:top;",
  callout:
    "margin:12px 24px 4px;padding:12px 14px;background-color:#fff6e5;border-left:4px solid #d68910;font-size:13px;color:#5c4413;",
  footer: "padding:16px 24px 20px;font-size:12px;color:#8a97a3;border-top:1px solid #eef0f2;",
  link: "color:#1f5fa8;",
};

/** "Vendor Termination [Back Charge]: Acme | 3 sites | Effective 05/14/2026" */
export function buildTerminationSubject({ vendor, sites, notice }) {
  const count = sites.length;
  const flag = notice.backCharge ? " [Back Charge]" : "";
  return `Vendor Termination${flag}: ${vendor?.company || "Unknown Vendor"} | ${count} site${
    count === 1 ? "" : "s"
  } | Effective ${formatNoticeDate(notice.effectiveDate)}`;
}

export function buildTerminationEmailBody({ vendor, sender, sites, notice, noticeUrl, vendorUrl }) {
  const company = esc(vendor?.company || "Unknown Vendor");
  const reason = escMultiline(notice.reason) || '<em style="color:#8a97a3;">Not provided</em>';

  const siteRows = sites.length
    ? sites
        .map(
          (s) => `
            <tr>
              <td style="${S.td}">${esc(s.client)}</td>
              <td style="${S.td}">${esc(s.store)}</td>
              <td style="${S.td}">${esc(s.address)}</td>
              <td style="${S.td}">${esc((s.lines ?? []).join(", "))}</td>
            </tr>`,
        )
        .join("")
    : `<tr><td style="${S.td}" colspan="4"><em style="color:#8a97a3;">No sites selected</em></td></tr>`;

  const backChargeBlock = notice.backCharge
    ? `
            <tr><td>
              <div style="${S.callout}">
                <strong style="display:block;margin-bottom:4px;">Back charge reason</strong>
                ${escMultiline(notice.backChargeDetails) || "<em>No detail provided</em>"}
              </div>
            </td></tr>`
    : "";

  const links = [
    noticeUrl && `<a href="${esc(noticeUrl)}" style="${S.link}">View the notice in PandaDoc</a>`,
    vendorUrl && `<a href="${esc(vendorUrl)}" style="${S.link}">Open the vendor</a>`,
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Vendor Termination Notice</title>
  </head>
  <body style="${S.wrapper}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="${S.card}">
            <tr><td style="${S.header}">Vendor Termination Notice</td></tr>
            <tr><td style="${S.headerSub}">${company}</td></tr>

            <tr>
              <td style="${S.section}">
                <p style="${S.sectionTitle}">Details</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr><td style="${S.label}">Vendor</td><td style="${S.value}"><strong>${company}</strong></td></tr>
                  <tr><td style="${S.label}">Submitted by</td><td style="${S.value}">${esc(formatUser(sender))}</td></tr>
                  <tr><td style="${S.label}">Effective date</td><td style="${S.value}"><strong>${esc(
                    formatNoticeDate(notice.effectiveDate),
                  )}</strong></td></tr>
                  <tr><td style="${S.label}">Reason</td><td style="${S.value}">${reason}</td></tr>
                  <tr><td style="${S.label}">Back charge</td><td style="${S.value}">${
                    notice.backCharge ? "Yes" : "No"
                  }</td></tr>
                </table>
              </td>
            </tr>

            ${backChargeBlock}

            <tr>
              <td style="${S.section}">
                <p style="${S.sectionTitle}">Sites terminated (${sites.length})</p>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <th style="${S.th}">Client</th>
                    <th style="${S.th}">Store</th>
                    <th style="${S.th}">Address</th>
                    <th style="${S.th}">Service lines</th>
                  </tr>
                  ${siteRows}
                </table>
              </td>
            </tr>

            <tr>
              <td style="${S.footer}">
                ${links ? `<p style="margin:0 0 10px;">${links}</p>` : ""}
                This notice was generated automatically when the termination form was
                submitted. Please update vendor records and stop any scheduled payments
                for the sites listed above as of the effective date.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
