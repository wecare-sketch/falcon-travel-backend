import { InvoicePayload } from "../types/payment";

const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n
  );

const formatDateTime = (d?: Date | string) =>
  d
    ? new Intl.DateTimeFormat("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d))
    : "—";

export function buildInvoiceHTML(data: InvoicePayload): string {
  const headerHtml = `
    <div class="header">
      <div>
        <div class="brand">FalconTour</div>
        <div class="muted">Invoice for event</div>
        <h1>${data.event.name} (${data.event.slug})</h1>
      </div>
      <div class="muted right">
        Client: <strong>${data.event.clientName}</strong><br/>
        Phone: ${data.event.phoneNumber}<br/>
        Pickup: ${formatDateTime(data.event.pickupDate)}<br/>
        Vehicle: ${data.event.vehicle} • ${data.event.hoursReserved}h<br/>
        Location: ${data.event.location}<br/>
        Host: ${data.event.host ?? "—"}
      </div>
    </div>
  `;

  const participantCardsHtml = data.participants
    .map((p) => {
      const paymentsTable = p.payments.length
        ? `
        <table class="payments">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th class="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${p.payments
              .map(
                (pm) => `
                  <tr>
                    <td>${formatDateTime(pm.paidAt)}</td>
                    <td>${pm.method ?? "—"}</td>
                    <td>${pm.status}</td>
                    <td class="right">${formatMoney(pm.amount)}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      `
        : `<div class="muted">No payments yet.</div>`;

      return `
      <div class="card">
        <div class="col left">
          <div class="row"><span class="label">Email</span><span>${
            p.email
          }</span></div>
          <div class="row"><span class="label">Role</span><span>${
            p.role
          }</span></div>
          <div class="row"><span class="label">Equity</span><span>${formatMoney(
            p.equityAmount
          )}</span></div>
          <div class="row"><span class="label">Deposited</span><span>${formatMoney(
            p.depositedAmount
          )}</span></div>
          <div class="row"><span class="label">Remaining</span><span>${formatMoney(
            p.remainingAmount
          )}</span></div>
          <div class="row"><span class="label">Status</span><span class="pill ${
            p.paymentStatus
          }">${p.paymentStatus}</span></div>
        </div>
        <div class="col right">
          ${paymentsTable}
        </div>
      </div>
    `;
    })
    .join("");

  const totalsHtml = `
    <table class="totals">
      <tbody>
        <tr><td>Total Amount</td><td class="right">${formatMoney(
          data.totals.totalAmount
        )}</td></tr>
        <tr><td>Deposit Received</td><td class="right">${formatMoney(
          data.totals.totalAmount - data.totals.pendingAmount
        )}</td></tr>
        <tr><td><strong>Pending</strong></td><td class="right"><strong>${formatMoney(
          data.totals.pendingAmount
        )}</strong></td></tr>
        <tr><td>Participants</td><td class="right">${
          data.totals.participantCount
        }</td></tr>
        <tr><td>Paid / Pending</td><td class="right">${
          data.totals.participantsPaidCount
        } / ${data.totals.participantsPendingCount}</td></tr>
      </tbody>
    </table>
  `;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice — ${data.event.name}</title>
  <style>
    body { font-family: Arial, sans-serif; color:#111; margin: 28px; }
    .header { display:flex; justify-content:space-between; gap: 24px; }
    .brand { font-weight: 800; font-size: 20px; }
    .muted { color:#666; }
    .right { text-align:right; }
    h1 { margin: 4px 0 0; font-size: 18px; }

    .card { display:grid; grid-template-columns: 1fr 2fr; gap: 16px; border:1px solid #e6e6e6; border-radius:12px; padding:12px; margin-top:12px; }
    .col.left .row { display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed #eee; }
    .col.left .row:last-child { border-bottom:none; }
    .label { color:#555; margin-right:12px; }
    .pill { padding:2px 8px; border-radius:999px; font-size:11px; }
    .PAID { background:#e6ffed; color:#116329; }
    .PENDING { background:#fff5e6; color:#8a5a00; }

    table.payments { width:100%; border-collapse:collapse; }
    table.payments th, table.payments td { border:1px solid #eee; padding:6px; font-size:12px; }
    table.payments th { background:#fafafa; text-align:left; }

    .totals { margin-top: 18px; width: 100%; max-width: 360px; }
    .totals td { padding:6px 0; border-bottom:1px solid #f2f2f2; }
    .totals tr:last-child td { border-bottom:none; }
  </style>
</head>
<body>
  ${headerHtml}
  ${participantCardsHtml}
  ${totalsHtml}
</body>
</html>
`;
}
