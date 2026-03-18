// ─── EMAIL TEMPLATES ────────────────────────────────────
// Professional HTML email templates with Northstar branding.
// All templates use inline CSS for maximum email client compatibility.

const { generateReplyAddress } = require("./reply-address");

const BRAND_RED = "#EA2028";
const DARK_TEXT = "#231F20";
const LIGHT_BG = "#F8F7F4";

function layout(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${LIGHT_BG};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${LIGHT_BG};padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:6px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="padding:28px 32px;border-bottom:1px solid #E8E5DE;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:28px;height:28px;background:${BRAND_RED};border-radius:3px;"></td>
              <td style="padding-left:12px;font-size:16px;font-weight:600;letter-spacing:0.04em;color:${DARK_TEXT};">NORTHSTAR</td>
            </tr></table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h2 style="margin:0 0 20px;font-size:20px;font-weight:400;color:${DARK_TEXT};font-family:'Georgia',serif;">${title}</h2>
            ${bodyContent}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #E8E5DE;background:#FAFAF8;">
            <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
              Northstar Pacific Development Group<br>
              710 &ndash; 1199 W Pender, Vancouver BC V6E 2R1<br>
              <a href="https://northstardevelopment.ca" style="color:${BRAND_RED};text-decoration:none;">northstardevelopment.ca</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(text, url) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
    <a href="${url}" style="display:inline-block;padding:12px 28px;background:${BRAND_RED};color:#FFFFFF;font-size:14px;font-weight:500;text-decoration:none;border-radius:4px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${text}</a>
  </td></tr></table>`;
}

function newDocument(investorName, docName, projectName) {
  const html = layout("New Document Available", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${investorName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      A new document has been uploaded to your investor portal${projectName ? ` for <strong>${projectName}</strong>` : ""}.
    </p>
    <div style="background:#F8F7F4;border:1px solid #E8E5DE;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};font-weight:500;">${docName}</p>
      ${projectName ? `<p style="margin:4px 0 0;font-size:12px;color:#888;">${projectName}</p>` : ""}
    </div>
    ${button("View Document", "https://portal.northstardevelopment.ca/documents")}
    <p style="font-size:13px;color:#888;margin:0;">
      Log in to your investor portal to view and download this document.
    </p>
  `);
  const text = `Dear ${investorName},\n\nA new document "${docName}" has been uploaded${projectName ? ` for ${projectName}` : ""}. Log in to your investor portal to view it.\n\nNorthstar Pacific Development Group`;
  return { subject: `New Document: ${docName}`, html, text };
}

function signatureRequired(investorName, docName, signUrl) {
  const html = layout("Signature Required", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${investorName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Your signature is required on the following document:
    </p>
    <div style="background:#FFF8F8;border:1px solid #F0D0D0;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};font-weight:500;">${docName}</p>
      <p style="margin:4px 0 0;font-size:12px;color:${BRAND_RED};">Action required</p>
    </div>
    ${button("Sign Document", signUrl || "https://portal.northstardevelopment.ca/documents")}
    <p style="font-size:13px;color:#888;margin:0;">
      Please review and sign this document at your earliest convenience.
    </p>
  `);
  const text = `Dear ${investorName},\n\nYour signature is required on "${docName}". Please visit your investor portal to review and sign.\n\nNorthstar Pacific Development Group`;
  return { subject: `Signature Required: ${docName}`, html, text };
}

function signatureCompleted(adminName, investorName, docName) {
  const html = layout("Signature Completed", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Hi ${adminName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      <strong>${investorName}</strong> has completed signing the following document:
    </p>
    <div style="background:#F0FAF4;border:1px solid #C0E8D0;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};font-weight:500;">${docName}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#3D7A54;">Signed</p>
    </div>
    ${button("View Details", "https://portal.northstardevelopment.ca/admin")}
  `);
  const text = `Hi ${adminName},\n\n${investorName} has signed "${docName}". Log in to the admin portal to view details.\n\nNorthstar Pacific Development Group`;
  return { subject: `Signature Completed: ${docName}`, html, text };
}

function distributionPaid(investorName, amount, projectName, quarter) {
  const formattedAmount = typeof amount === "number" ? `$${amount.toLocaleString("en-US")}` : amount;
  const html = layout("Distribution Payment", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${investorName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      A distribution payment has been processed for your investment in <strong>${projectName}</strong>.
    </p>
    <div style="background:#F8F7F4;border:1px solid #E8E5DE;border-radius:4px;padding:20px;margin:16px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:12px;color:#888;padding-bottom:8px;">Amount</td><td style="font-size:18px;font-weight:500;color:${DARK_TEXT};text-align:right;">${formattedAmount}</td></tr>
        <tr><td style="font-size:12px;color:#888;padding-bottom:8px;">Project</td><td style="font-size:14px;color:${DARK_TEXT};text-align:right;">${projectName}</td></tr>
        <tr><td style="font-size:12px;color:#888;">Period</td><td style="font-size:14px;color:${DARK_TEXT};text-align:right;">${quarter}</td></tr>
      </table>
    </div>
    ${button("View Statement", "https://portal.northstardevelopment.ca/distributions")}
    <p style="font-size:13px;color:#888;margin:0;">
      The payment will be deposited to your account on file within 3-5 business days.
    </p>
  `);
  const text = `Dear ${investorName},\n\nA distribution of ${formattedAmount} from ${projectName} (${quarter}) has been processed. It will be deposited to your account within 3-5 business days.\n\nNorthstar Pacific Development Group`;
  return { subject: `Distribution Payment: ${formattedAmount} - ${projectName}`, html, text };
}

function newMessage(investorName, senderName, subject, messageBody, threadId, userId) {
  const replyHint = threadId && userId
    ? `<p style="font-size:12px;color:#888;margin:20px 0 0;padding-top:16px;border-top:1px solid #E8E5DE;">You can reply directly to this email and your response will be added to the conversation.</p>`
    : "";
  const quotedBody = messageBody
    ? `<div style="background:#F8F7F4;border-left:3px solid ${BRAND_RED};padding:12px 16px;margin:16px 0;font-size:13px;color:#555;line-height:1.6;white-space:pre-wrap;">${messageBody.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`
    : "";
  const html = layout("New Message", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${investorName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      You have a new message from <strong>${senderName}</strong>:
    </p>
    <div style="background:#F8F7F4;border:1px solid #E8E5DE;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:${DARK_TEXT};font-weight:500;">${subject}</p>
    </div>
    ${quotedBody}
    ${button("View Message", "https://portal.northstardevelopment.ca/messages")}
    ${replyHint}
  `);
  const replyHintText = threadId && userId
    ? "\n\nYou can reply directly to this email and your response will be added to the conversation."
    : "";
  const text = `Dear ${investorName},\n\nYou have a new message from ${senderName}: "${subject}".${messageBody ? `\n\n${messageBody}` : ""}\n\nLog in to your investor portal to read and reply.${replyHintText}\n\nNorthstar Pacific Development Group`;

  const result = { subject: `New Message from ${senderName}: ${subject}`, html, text };
  if (threadId && userId) {
    result.headers = { "Reply-To": generateReplyAddress(threadId, userId) };
  }
  return result;
}

function capitalCall(investorName, amount, projectName, dueDate) {
  const formattedAmount = typeof amount === "number" ? `$${amount.toLocaleString("en-US")}` : amount;
  const html = layout("Capital Call Notice", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${investorName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      A capital call has been issued for your investment in <strong>${projectName}</strong>.
    </p>
    <div style="background:#FFF8F0;border:1px solid #F0D8B0;border-radius:4px;padding:20px;margin:16px 0;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr><td style="font-size:12px;color:#888;padding-bottom:8px;">Call Amount</td><td style="font-size:18px;font-weight:500;color:${BRAND_RED};text-align:right;">${formattedAmount}</td></tr>
        <tr><td style="font-size:12px;color:#888;padding-bottom:8px;">Project</td><td style="font-size:14px;color:${DARK_TEXT};text-align:right;">${projectName}</td></tr>
        <tr><td style="font-size:12px;color:#888;">Due Date</td><td style="font-size:14px;font-weight:500;color:${DARK_TEXT};text-align:right;">${dueDate}</td></tr>
      </table>
    </div>
    ${button("View Details", "https://portal.northstardevelopment.ca/documents")}
    <p style="font-size:13px;color:#888;margin:0;">
      Please review the capital call notice and arrange funding by the due date. Contact us if you have any questions.
    </p>
  `);
  const text = `Dear ${investorName},\n\nA capital call of ${formattedAmount} has been issued for ${projectName}, due ${dueDate}. Please review the notice in your investor portal.\n\nNorthstar Pacific Development Group`;
  return { subject: `Capital Call: ${formattedAmount} - ${projectName} (Due ${dueDate})`, html, text };
}

function passwordReset(userName, resetUrl) {
  const html = layout("Reset Your Password", `
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      Dear ${userName},
    </p>
    <p style="font-size:14px;color:#333;line-height:1.7;margin:0 0 16px;">
      We received a request to reset your password for your Northstar investor portal account.
    </p>
    ${button("Reset Your Password", resetUrl)}
    <p style="font-size:13px;color:#888;margin:0 0 8px;">
      This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.
    </p>
    <p style="font-size:12px;color:#AAA;margin:16px 0 0;">
      If the button above doesn't work, copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color:${BRAND_RED};word-break:break-all;">${resetUrl}</a>
    </p>
  `);
  const text = `Dear ${userName},\n\nWe received a request to reset your password. Visit this link to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nNorthstar Pacific Development Group`;
  return { subject: "Reset Your Password — Northstar Portal", html, text };
}

module.exports = { newDocument, signatureRequired, signatureCompleted, distributionPaid, newMessage, capitalCall, passwordReset };
