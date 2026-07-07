import React, { useState, useEffect } from 'react';
import {
  FileText, CheckCircle2, Circle, Printer, Download,
  ClipboardList, ChevronRight, AlertTriangle, FileCheck2,
} from 'lucide-react';
import { PRODUCTS, INCOTERMS } from '../constants.js';
import { todayISO, fmt } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Textarea, Button } from '../components/UI.jsx';

// ─────────────────────────────────────────────────────────────────
// PROCEDURE STEPS
// ─────────────────────────────────────────────────────────────────
const STEPS = [
  { n: 1,  doc: 'ICPO',    label: 'Acheteur émet l\'ICPO',             desc: 'Irrevocable Confirmed Purchase Order envoyé au Mandate du Vendeur.' },
  { n: 2,  doc: 'FCO',     label: 'Mandate émet le FCO',               desc: 'Full Corporate Offer transmis à l\'Acheteur.' },
  { n: 3,  doc: 'BCL',     label: 'Acheteur signe FCO + émet la BCL',  desc: 'FCO signé/cacheté retourné. BCL SWIFT MT-799 envoyée à la banque du Vendeur.' },
  { n: 4,  doc: 'POP',     label: 'Banque Vendeur confirme POP sous 6 jours ouvrés', desc: 'Proof of Product + Performance Bond après réception BCL.' },
  { n: 5,  doc: 'SPA',     label: 'Contrat SPA émis',                  desc: 'Version électronique du contrat pour accord Acheteur.' },
  { n: 6,  doc: 'SPA',     label: 'Contrat déposé en banque',          desc: 'Copie déposée par les deux parties auprès de leurs banques.' },
  { n: 7,  doc: 'POP',     label: 'Banque Vendeur confirme documents POP via SWIFT', desc: 'Transmission SWIFT des 7 documents POP.' },
  { n: 8,  doc: 'POP',     label: 'Réception complète des 7 POP docs', desc: 'Licence export, Approbation, Disponibilité produit, Engagement raffinerie, CPA, Passeport bancaire, Contrat Transneft.' },
  { n: 9,  doc: 'PB',      label: 'Banque Acheteur émet l\'instrument financier', desc: 'Instrument financier non-opératif envoyé à la banque du Vendeur.' },
  { n: 10, doc: 'PB',      label: 'Banque Vendeur émet le Performance Bond 1,5-2%', desc: 'PB automatiquement opératif avec l\'instrument financier Acheteur.' },
  { n: 11, doc: 'DELIVERY',label: 'Première livraison effectuée',      desc: 'Calendrier de livraison convenu pour les mois suivants.' },
  { n: 12, doc: 'DELIVERY',label: 'Livraison dans le délai contractuel', desc: 'Première livraison dans le délai prévu au contrat.' },
];

// ─────────────────────────────────────────────────────────────────
// PRINT HELPER
// ─────────────────────────────────────────────────────────────────
function printDoc(html, title) {
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; margin: 2.5cm 3cm; line-height: 1.6; color: #000; }
  h1 { text-align: center; font-size: 13pt; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 20px; }
  h2 { font-size: 11pt; text-transform: uppercase; margin-top: 18px; margin-bottom: 6px; }
  p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  td, th { border: 1px solid #555; padding: 5px 8px; vertical-align: top; }
  th { background: #eee; font-weight: bold; text-align: left; }
  .center { text-align: center; }
  .right  { text-align: right; }
  .bold   { font-weight: bold; }
  .ref    { font-size: 9pt; color: #555; margin-bottom: 4px; }
  .party-box { border: 1px solid #888; padding: 10px 14px; margin: 6px 0; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 50px; }
  .sig-col { width: 45%; }
  .sig-line { border-top: 1px solid #000; margin-top: 40px; padding-top: 4px; font-size: 9pt; }
  .stamp { width: 120px; height: 120px; border: 2px dashed #aaa; display: inline-block; text-align: center; line-height: 120px; font-size: 9pt; color: #aaa; margin-top: 8px; }
  .section { margin: 14px 0; }
  .indent { padding-left: 20px; }
  .underline { border-bottom: 1px solid #000; display: inline-block; min-width: 150px; }
  .swift-block { font-family: 'Courier New', Courier, monospace; font-size: 10pt; background: #f8f8f8; border: 1px solid #ccc; padding: 12px 16px; white-space: pre-wrap; margin: 8px 0; }
  @media print {
    body { margin: 1.5cm 2cm; }
    button { display: none; }
  }
</style>
</head><body>${html}
<div style="text-align:center;margin-top:30px;font-size:8pt;color:#999;border-top:1px solid #ccc;padding-top:6px;">
  Document généré par AMKO TRADING Platform — ${new Date().toLocaleString('fr-FR')}
</div>
<script>window.onload = function(){ window.print(); }<\/script>
</body></html>`);
  win.document.close();
}

// ─────────────────────────────────────────────────────────────────
// DOCUMENT GENERATORS
// ─────────────────────────────────────────────────────────────────

function genICPO(f) {
  const ref = `ICPO-${f.refNumber || 'XXXX'}-${new Date().getFullYear()}`;
  return `
<h1>Irrevocable Confirmed Purchase Order<br>(ICPO)</h1>
<p class="ref">Reference: <b>${ref}</b> &nbsp;|&nbsp; Date: <b>${f.date}</b></p>

<div class="sig-row" style="margin-top:0; margin-bottom:16px;">
  <div class="sig-col">
    <b>TO (Seller's Mandate):</b>
    <div class="party-box">
      <p class="bold">${f.sellerMandateName || '_____________________'}</p>
      <p>${f.sellerMandateAddress || '_____________________'}</p>
    </div>
  </div>
  <div class="sig-col">
    <b>FROM (Buyer):</b>
    <div class="party-box">
      <p class="bold">${f.buyerCompany || '_____________________'}</p>
      <p>${f.buyerAddress || '_____________________'}</p>
      <p>Contact: ${f.buyerContact || '_____'} | ${f.buyerEmail || '_____'}</p>
    </div>
  </div>
</div>

<p>Dear Sir / Madam,</p>
<p>We, <b>${f.buyerCompany || '_______________'}</b>, hereby irrevocably confirm our Purchase Order for the supply of petroleum products under the following terms and conditions:</p>

<h2>1. Product Specifications</h2>
<table>
  <tr><th>Product</th><td>${f.product || '_____'}</td><th>Quality / Grade</th><td>${f.quality || 'As per ASTM / EN590 specifications'}</td></tr>
  <tr><th>Quantity / Month</th><td>${f.quantityPerMonth || '_____'} Metric Tons ± ${f.tolerance || '5'}%</td><th>Contract Duration</th><td>${f.duration || '_____'} months</td></tr>
  <tr><th>Origin</th><td>${f.origin || 'Russian Federation'}</td><th>Total Volume (est.)</th><td>${f.totalQuantity || '_____'} MT approx.</td></tr>
</table>

<h2>2. Commercial Terms</h2>
<table>
  <tr><th>Price Formula</th><td colspan="3">${f.priceFormula || 'Platts Mean Brent Dated ± Differential'} — ${f.priceSource || 'Platts'}</td></tr>
  <tr><th>Differential</th><td>${f.differential || '_____'} USD/BBL</td><th>Incoterm</th><td>${f.incoterm || '_____'} ${new Date().getFullYear()}</td></tr>
  <tr><th>Port of Loading</th><td>${f.loadPort || '_____'}</td><th>Port of Discharge</th><td>${f.dischargePort || '_____'}</td></tr>
  <tr><th>Laycan</th><td>${f.laycanFrom || '_____'} to ${f.laycanTo || '_____'}</td><th>Inspector</th><td>${f.inspector || 'SGS / Bureau Veritas'}</td></tr>
</table>

<h2>3. Payment Terms</h2>
<table>
  <tr><th>Payment Method</th><td>${f.paymentTerm || 'Irrevocable, Confirmed Letter of Credit at Sight (LC at Sight)'}</td></tr>
  <tr><th>Issuing Bank</th><td>${f.buyerBank || '_____________________'} — SWIFT: ${f.buyerBankSwift || '_________'}</td></tr>
  <tr><th>Bank Rating</th><td>${f.bankRating || 'Investment Grade'}</td></tr>
</table>

<h2>4. Buyer's Undertakings</h2>
<div class="section indent">
  <p>The Buyer hereby undertakes and confirms the following:</p>
  <p>a) This ICPO is <b>irrevocable</b> and valid for <b>${f.icpoValidity || '7'} banking days</b> from the date hereof.</p>
  <p>b) The Buyer's Bank is ready, willing and able to issue a <b>Bank Comfort Letter (BCL) via SWIFT MT-799</b> upon receipt of the Full Corporate Offer (FCO).</p>
  <p>c) The Buyer has the financial capacity and authority to enter into this transaction.</p>
  <p>d) All information provided herein is true, accurate and complete to the best of the Buyer's knowledge.</p>
</div>

<div class="sig-row">
  <div class="sig-col">
    <div class="sig-line">Authorized Signatory — Buyer</div>
    <p>Name: ${f.buyerSignatoryName || '_____________________'}</p>
    <p>Title: ${f.buyerSignatoryTitle || '_____________________'}</p>
    <p>Date: ${f.date || '_____'}</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
  <div class="sig-col">
    <div class="sig-line">Witnessed by</div>
    <p>Name: _____________________</p>
    <p>Title: _____________________</p>
    <p>Date: _____________________</p>
  </div>
</div>`;
}

function genFCO(f) {
  const ref = `FCO-${f.refNumber || 'XXXX'}-${new Date().getFullYear()}`;
  return `
<h1>Full Corporate Offer<br>(FCO)</h1>
<p class="ref">Reference: <b>${ref}</b> &nbsp;|&nbsp; Date: <b>${f.date}</b> &nbsp;|&nbsp; Related ICPO: <b>${f.relatedICPO || '_____'}</b></p>

<div class="sig-row" style="margin-top:0; margin-bottom:16px;">
  <div class="sig-col">
    <b>FROM (Seller's Mandate):</b>
    <div class="party-box">
      <p class="bold">${f.sellerMandateName || '_____________________'}</p>
      <p>${f.sellerMandateAddress || '_____________________'}</p>
    </div>
  </div>
  <div class="sig-col">
    <b>TO (Buyer):</b>
    <div class="party-box">
      <p class="bold">${f.buyerCompany || '_____________________'}</p>
      <p>${f.buyerAddress || '_____________________'}</p>
    </div>
  </div>
</div>

<p>Dear Sir / Madam,</p>
<p>With reference to your Irrevocable Confirmed Purchase Order No. <b>${f.relatedICPO || '_____'}</b>, we are pleased to submit our <b>Full Corporate Offer</b> for the supply of the following petroleum product:</p>

<h2>Corporate Offer Terms</h2>
<table>
  <tr><th>1.</th><th>Product</th><td>${f.product || '_____'}</td></tr>
  <tr><td></td><th>Quality / Specifications</th><td>${f.quality || 'As per ASTM / EN590 / applicable standards'}</td></tr>
  <tr><th>2.</th><th>Quantity</th><td>${f.quantityPerMonth || '_____'} Metric Tons per Month ± ${f.tolerance || '5'}% Option in Seller's Favour</td></tr>
  <tr><td></td><th>Duration</th><td>${f.duration || '_____'} months (renewable by mutual agreement)</td></tr>
  <tr><th>3.</th><th>Origin</th><td>${f.origin || 'Russian Federation'}</td></tr>
  <tr><th>4.</th><th>Price</th><td>${f.priceFormula || 'Platts Mean Brent Dated'} ${f.differential ? (Number(f.differential) >= 0 ? '+' : '') + f.differential + ' USD/BBL' : '± Differential USD/BBL'}</td></tr>
  <tr><td></td><th>Price Source</th><td>${f.priceSource || 'Platts'} — pricing period: B/L date ± 2 business days</td></tr>
  <tr><th>5.</th><th>Incoterm</th><td>${f.incoterm || '_____'} ${new Date().getFullYear()} — ${f.loadPort || 'Port of Loading TBN'}</td></tr>
  <tr><th>6.</th><th>Payment Terms</th><td>${f.paymentTerm || 'Irrevocable, Confirmed LC at Sight'}</td></tr>
  <tr><th>7.</th><th>Inspection</th><td>${f.inspector || 'SGS / Bureau Veritas / Intertek'} — at loading and discharge port, cost to be borne by ${f.inspectorCost || 'Buyer'}</td></tr>
  <tr><th>8.</th><th>Governing Law</th><td>${f.governingLaw || 'English Law / ICC Rules'}</td></tr>
  <tr><th>9.</th><th>Validity</th><td>This FCO is valid for <b>${f.fcoValidity || '7'} banking days</b> from the date hereof</td></tr>
</table>

<h2>Required Procedure</h2>
<div class="section indent">
  <p><b>Step 1:</b> Buyer to sign, seal and return this FCO to Seller's Mandate within the validity period.</p>
  <p><b>Step 2:</b> Buyer's Bank to issue Bank Comfort Letter (BCL) via <b>SWIFT MT-799</b> to Seller's Bank, referring to this FCO and the ICPO.</p>
  <p><b>Step 3:</b> Seller's Bank will confirm readiness and issue Proof of Product (POP) documents within <b>6 (six) banking days</b>.</p>
  <p><b>Step 4:</b> Contract (SPA) to be executed by both parties.</p>
  <p><b>Step 5:</b> Delivery to commence as per agreed schedule.</p>
</div>

<p><b>This FCO is binding upon signature and seal of the Buyer and the Seller.</b></p>

<div class="sig-row">
  <div class="sig-col">
    <p><b>ACCEPTED — Buyer</b></p>
    <div class="sig-line">Signature &amp; Company Stamp</div>
    <p>Name: ${f.buyerSignatoryName || '_____________________'}</p>
    <p>Title: ${f.buyerSignatoryTitle || '_____________________'}</p>
    <p>Date: _____________________</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
  <div class="sig-col">
    <p><b>ISSUED BY — Seller's Mandate</b></p>
    <div class="sig-line">Signature &amp; Company Stamp</div>
    <p>Name: ${f.sellerSignatoryName || '_____________________'}</p>
    <p>Title: ${f.sellerSignatoryTitle || '_____________________'}</p>
    <p>Date: ${f.date}</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
</div>`;
}

function genBCL(f) {
  const ref = `BCL-${f.refNumber || 'XXXX'}-${new Date().getFullYear()}`;
  return `
<h1>Bank Comfort Letter<br>(BCL — SWIFT MT-799)</h1>
<p class="ref">Bank Reference: <b>${ref}</b> &nbsp;|&nbsp; Date: <b>${f.date}</b></p>

<div class="sig-row" style="margin-top:0;margin-bottom:20px;">
  <div class="sig-col">
    <b>Issuing Bank:</b>
    <div class="party-box">
      <p class="bold">${f.buyerBank || '_____________________'}</p>
      <p>SWIFT/BIC: <b>${f.buyerBankSwift || '_________'}</b></p>
      <p>${f.buyerBankAddress || '_____________________'}</p>
    </div>
  </div>
  <div class="sig-col">
    <b>Receiving Bank:</b>
    <div class="party-box">
      <p class="bold">${f.sellerBank || '_____________________'}</p>
      <p>SWIFT/BIC: <b>${f.sellerBankSwift || '_________'}</b></p>
      <p>${f.sellerBankAddress || '_____________________'}</p>
    </div>
  </div>
</div>

<div class="swift-block">:20: ${ref}
:21: ${f.relatedICPO || 'RELATED-REF-XXXX'}
:79: BANK COMFORT LETTER — MT-799

TO: ${f.sellerBank || '_____________________'}
    SWIFT: ${f.sellerBankSwift || '_________'}
    ${f.sellerBankAddress || ''}

RE: IRREVOCABLE CONFIRMED PURCHASE ORDER NO. ${f.relatedICPO || '_____'}
    FOR THE PURCHASE OF ${f.product || '_______________'}

WE, ${(f.buyerBank || '_____________________').toUpperCase()}, SWIFT CODE ${f.buyerBankSwift || '_________'},
HEREBY CONFIRM AND CERTIFY THAT:

OUR CLIENT:     ${(f.buyerCompany || '_____________________').toUpperCase()}
ADDRESS:        ${f.buyerAddress || '_____________________'}
ACCOUNT No.:    ████████████████ (CONFIDENTIAL)

HAS SUFFICIENT FUNDS ON DEPOSIT AND IS READY, WILLING AND ABLE
TO ENTER INTO THE FOLLOWING TRANSACTION:

COMMODITY:     ${f.product || '_____________________'}
QUANTITY:      ${f.quantityPerMonth || '_____'} METRIC TONS PER MONTH
               × ${f.duration || '_____'} MONTHS
TOTAL VALUE:   USD ${f.totalValue || '_____________________'} APPROXIMATELY
PAYMENT:       ${(f.paymentTerm || 'IRREVOCABLE LC AT SIGHT').toUpperCase()}

WE FURTHER CONFIRM THAT THE ABOVE-NAMED CLIENT HAS BEEN
OUR VALUED CUSTOMER SINCE ${f.clientSince || '____'} AND THAT THIS BANK
IS PREPARED TO ISSUE THE APPROPRIATE FINANCIAL INSTRUMENTS
UPON PRESENTATION OF A VALID CONTRACT (SPA) AND PROOF OF
PRODUCT (POP) DOCUMENTATION AS REQUIRED.

THIS BANK COMFORT LETTER IS ISSUED IN GOOD FAITH AND DOES
NOT CONSTITUTE A COMMITMENT OR GUARANTEE.

ISSUED BY:
${(f.buyerBank || '_____________________').toUpperCase()}

AUTHORIZED SIGNATORY:
NAME:   ${f.bankOfficerName || '_____________________'}
TITLE:  ${f.bankOfficerTitle || '_____________________'}
DATE:   ${f.date}
</div>

<div class="sig-row">
  <div class="sig-col">
    <div class="sig-line">Bank Authorized Officer — Signature</div>
    <p>Name: ${f.bankOfficerName || '_____________________'}</p>
    <p>Title: ${f.bankOfficerTitle || '_____________________'}</p>
    <p>Date: ${f.date}</p>
    <div class="stamp">BANK<br>STAMP</div>
  </div>
  <div class="sig-col">
    <div class="sig-line">Countersigned</div>
    <p>Name: _____________________</p>
    <p>Title: _____________________</p>
    <p>Date: _____________________</p>
  </div>
</div>`;
}

function genSPA(f) {
  const ref = `SPA-${f.refNumber || 'XXXX'}-${new Date().getFullYear()}`;
  return `
<h1>Sales and Purchase Agreement<br>(SPA / Contract)</h1>
<p class="center ref">Contract No.: <b>${ref}</b> &nbsp;|&nbsp; Date: <b>${f.date}</b></p>

<p>This Sales and Purchase Agreement ("<b>Agreement</b>") is entered into as of <b>${f.date}</b> by and between the following parties:</p>

<div class="sig-row" style="margin-top:8px;margin-bottom:16px;">
  <div class="sig-col">
    <div class="party-box">
      <p><b>SELLER:</b></p>
      <p class="bold">${f.sellerCompany || '_____________________'}</p>
      <p>${f.sellerAddress || '_____________________'}</p>
      <p>Reg. No.: ${f.sellerRegNo || '_____________________'}</p>
      <p>Represented by: ${f.sellerRepresentative || '_____________________'}</p>
      <p>Title: ${f.sellerRepTitle || '_____________________'}</p>
      <p>hereinafter referred to as "<b>SELLER</b>"</p>
    </div>
  </div>
  <div class="sig-col">
    <div class="party-box">
      <p><b>BUYER:</b></p>
      <p class="bold">${f.buyerCompany || '_____________________'}</p>
      <p>${f.buyerAddress || '_____________________'}</p>
      <p>Reg. No.: ${f.buyerRegNo || '_____________________'}</p>
      <p>Represented by: ${f.buyerSignatoryName || '_____________________'}</p>
      <p>Title: ${f.buyerSignatoryTitle || '_____________________'}</p>
      <p>hereinafter referred to as "<b>BUYER</b>"</p>
    </div>
  </div>
</div>

<p>NOW, THEREFORE, in consideration of the mutual covenants and agreements herein contained, the parties agree as follows:</p>

<h2>Article 1 — Product</h2>
<table>
  <tr><th>Commodity</th><td>${f.product || '_____________________'}</td></tr>
  <tr><th>Quality / Grade</th><td>${f.quality || 'As per applicable ASTM / EN590 standards. Quality to be certified by mutually agreed independent inspector at loading port.'}</td></tr>
  <tr><th>Origin</th><td>${f.origin || 'Russian Federation'}</td></tr>
  <tr><th>Refinery</th><td>${f.refinery || 'To be confirmed by Seller'}</td></tr>
</table>

<h2>Article 2 — Quantity</h2>
<p>Quantity per shipment: <b>${f.quantityPerMonth || '_____'} Metric Tons ± ${f.tolerance || '5'}%</b> at Seller's option.</p>
<p>Contract duration: <b>${f.duration || '_____'} (${f.durationWords || '_____'}) consecutive months</b>.</p>
<p>Estimated total quantity: <b>${f.totalQuantity || '_____'} Metric Tons</b> approximately.</p>
<p>The first delivery shall take place within <b>${f.firstDeliveryDays || '_____'} days</b> of the execution of this Agreement.</p>

<h2>Article 3 — Price</h2>
<p>Base Price: <b>${f.priceFormula || 'Platts Mean Brent Dated'}</b> as published by ${f.priceSource || 'S&P Global Platts / Argus Media'}.</p>
<p>Differential: <b>${f.differential ? (Number(f.differential) >= 0 ? '+' : '') + f.differential + ' USD/BBL' : '± _____ USD/BBL'}</b></p>
<p>Pricing period: B/L date ± 2 (two) business days mean average.</p>
<p>Currency: United States Dollars (USD).</p>
<p>All prices are <b>${f.incoterm || '_____'} ${f.loadPort || '_____'}</b>.</p>

<h2>Article 4 — Delivery</h2>
<table>
  <tr><th>Incoterm</th><td>${f.incoterm || '_____'} ${new Date().getFullYear()} (Incoterms® ${new Date().getFullYear()})</td></tr>
  <tr><th>Port of Loading</th><td>${f.loadPort || '_____________________'}</td></tr>
  <tr><th>Port of Discharge</th><td>${f.dischargePort || '_____________________'}</td></tr>
  <tr><th>Laycan Window</th><td>${f.laycanFrom || '_____'} to ${f.laycanTo || '_____'} (first shipment)</td></tr>
  <tr><th>Vessel Type</th><td>${f.vessel || 'TBN — compatible with loading/discharge port infrastructure'}</td></tr>
  <tr><th>Inspector</th><td>${f.inspector || 'SGS / Bureau Veritas / Intertek'} (independent at loading and discharge port)</td></tr>
  <tr><th>Demurrage Rate</th><td>As per Charter Party Agreement in force</td></tr>
</table>

<h2>Article 5 — Payment</h2>
<p>Payment shall be made by <b>${f.paymentTerm || 'Irrevocable, Confirmed, Transferable Letter of Credit at Sight (LC at Sight)'}</b>, conforming to UCP 600.</p>
<table>
  <tr><th>Buyer's Issuing Bank</th><td>${f.buyerBank || '_____________________'}, SWIFT: ${f.buyerBankSwift || '_________'}</td></tr>
  <tr><th>Seller's Receiving Bank</th><td>${f.sellerBank || '_____________________'}, SWIFT: ${f.sellerBankSwift || '_________'}</td></tr>
  <tr><th>LC Opening</th><td>Buyer to open LC within <b>${f.lcOpeningDays || '7'} banking days</b> of execution of this Agreement, covering 110% of estimated shipment value.</td></tr>
  <tr><th>LC Validity</th><td>The LC shall remain valid for ${f.lcValidity || '30'} days beyond the last discharge port.</td></tr>
</table>

<h2>Article 6 — Proof of Product (POP)</h2>
<p>The Seller shall provide the following Proof of Product documents via SWIFT within <b>6 (six) banking days</b> of receiving the BCL from Buyer's Bank:</p>
<div class="indent">
  <p>6.1 Copy of License to Export issued by the Russian Ministry of Energy.</p>
  <p>6.2 Copy of Approval to Export issued by the Russian Ministry of Justice.</p>
  <p>6.3 Copy of Statement of Availability of the Product.</p>
  <p>6.4 Copy of the Refinery Commitment to produce the Product.</p>
  <p>6.5 Copy of Charter Party Agreement(s) to transport the Product to discharge ports.</p>
  <p>6.6 Copy of the Banking Passport of the Bargain.</p>
  <p>6.7 Copy of the Contract with AK "Transneft" to transport the Product to port.</p>
</div>

<h2>Article 7 — Performance Bond</h2>
<p>Upon receipt of the non-operative financial instrument from Buyer's Bank, Seller's Bank shall issue a <b>Performance Bond of ${f.pbPercent || '1.5'}% to ${f.pbPercentMax || '2'}%</b> of the total contract value. The Performance Bond shall automatically operate the financial instrument of the Buyer.</p>

<h2>Article 8 — Title and Risk</h2>
<p>Title and risk in the Product shall pass from Seller to Buyer at the point of delivery as defined by the applicable Incoterm.</p>

<h2>Article 9 — Force Majeure</h2>
<p>Neither party shall be liable for delays or non-performance caused by circumstances beyond its reasonable control, including but not limited to: acts of God, war, embargo, government restrictions, natural disasters, or any other event constituting Force Majeure. The affected party shall notify the other within <b>48 hours</b> of the occurrence.</p>

<h2>Article 10 — Sanctions &amp; Compliance</h2>
<p>Both parties represent that they are not subject to any applicable sanctions lists (OFAC SDN, EU Consolidated List, HM Treasury OFSI, or SECO). The parties undertake to comply with all applicable export control laws and regulations.</p>

<h2>Article 11 — Confidentiality</h2>
<p>Both parties agree to maintain strict confidentiality regarding the terms of this Agreement and shall not disclose any information to third parties without prior written consent.</p>

<h2>Article 12 — Dispute Resolution</h2>
<p>Any dispute arising out of or in connection with this Agreement shall be referred to and finally resolved by arbitration in accordance with the rules of the <b>${f.arbitration || 'International Chamber of Commerce (ICC)'}</b>. The seat of arbitration shall be <b>${f.arbitrationSeat || 'London, England'}</b>. The language of arbitration shall be English.</p>

<h2>Article 13 — Governing Law</h2>
<p>This Agreement shall be governed by and construed in accordance with the laws of <b>${f.governingLaw || 'England and Wales'}</b>.</p>

<h2>Article 14 — Entire Agreement</h2>
<p>This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior negotiations, representations, warranties, and understandings.</p>

<div class="sig-row" style="margin-top:40px;">
  <div class="sig-col">
    <p><b>FOR AND ON BEHALF OF THE SELLER:</b></p>
    <div class="sig-line">Signature</div>
    <p>Name: ${f.sellerRepresentative || '_____________________'}</p>
    <p>Title: ${f.sellerRepTitle || '_____________________'}</p>
    <p>Company: ${f.sellerCompany || '_____________________'}</p>
    <p>Date: _____________________</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
  <div class="sig-col">
    <p><b>FOR AND ON BEHALF OF THE BUYER:</b></p>
    <div class="sig-line">Signature</div>
    <p>Name: ${f.buyerSignatoryName || '_____________________'}</p>
    <p>Title: ${f.buyerSignatoryTitle || '_____________________'}</p>
    <p>Company: ${f.buyerCompany || '_____________________'}</p>
    <p>Date: _____________________</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
</div>`;
}

function genPOP(f) {
  return `
<h1>Proof of Product Checklist<br>&amp; Cover Letter</h1>
<p class="ref">Reference: POP-${f.refNumber || 'XXXX'} &nbsp;|&nbsp; Date: ${f.date} &nbsp;|&nbsp; Related SPA: ${f.relatedSPA || '_____'}</p>

<p>Pursuant to Article 6 of the Sales and Purchase Agreement No. <b>${f.relatedSPA || '_____'}</b>, the Seller hereby confirms the availability and transmission of the following Proof of Product (POP) documents:</p>

<h2>POP Document Checklist</h2>
<table>
  <tr>
    <th style="width:40px;" class="center">#</th>
    <th>Document</th>
    <th style="width:80px;" class="center">Status</th>
    <th>Ref. / Notes</th>
  </tr>
  <tr>
    <td class="center">6.1</td>
    <td><b>License to Export</b> — issued by the Russian Ministry of Energy</td>
    <td class="center">${f.pop1 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop1Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.2</td>
    <td><b>Approval to Export</b> — issued by the Russian Ministry of Justice</td>
    <td class="center">${f.pop2 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop2Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.3</td>
    <td><b>Statement of Availability</b> of the Product</td>
    <td class="center">${f.pop3 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop3Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.4</td>
    <td><b>Refinery Commitment</b> to produce the product</td>
    <td class="center">${f.pop4 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop4Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.5</td>
    <td><b>Charter Party Agreement(s)</b> to transport the product to discharge ports</td>
    <td class="center">${f.pop5 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop5Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.6</td>
    <td><b>Banking Passport of the Bargain</b></td>
    <td class="center">${f.pop6 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop6Notes || ''}</td>
  </tr>
  <tr>
    <td class="center">6.7</td>
    <td><b>Contract with AK "Transneft"</b> to transport the product to port</td>
    <td class="center">${f.pop7 ? '✓ Provided' : '☐ Pending'}</td>
    <td>${f.pop7Notes || ''}</td>
  </tr>
</table>

<p>All above documents are transmitted via SWIFT from Seller's Bank (${f.sellerBank || '_____'}, SWIFT: ${f.sellerBankSwift || '_____'}) to Buyer's Bank (${f.buyerBank || '_____'}, SWIFT: ${f.buyerBankSwift || '_____'}).</p>

<div class="sig-row">
  <div class="sig-col">
    <div class="sig-line">Seller's Authorized Officer</div>
    <p>Name: ${f.sellerSignatoryName || '_____________________'}</p>
    <p>Title: ${f.sellerSignatoryTitle || '_____________________'}</p>
    <p>Date: ${f.date}</p>
    <div class="stamp">COMPANY<br>STAMP</div>
  </div>
  <div class="sig-col">
    <div class="sig-line">Seller's Bank Officer</div>
    <p>Bank: ${f.sellerBank || '_____________________'}</p>
    <p>Name: _____________________</p>
    <p>Date: _____________________</p>
    <div class="stamp">BANK<br>STAMP</div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const DOC_TYPES = [
  { id: 'procedure', label: 'Procédure',    icon: ClipboardList },
  { id: 'icpo',      label: 'ICPO',         icon: FileText },
  { id: 'fco',       label: 'FCO',          icon: FileText },
  { id: 'bcl',       label: 'BCL / MT-799', icon: FileText },
  { id: 'spa',       label: 'SPA / Contrat', icon: FileText },
  { id: 'pop',       label: 'POP',          icon: FileCheck2 },
];

const DEFAULT_FORM = {
  date: todayISO(), refNumber: '', relatedICPO: '', relatedSPA: '',
  // Buyer
  buyerCompany: '', buyerAddress: '', buyerContact: '', buyerEmail: '',
  buyerRegNo: '', buyerSignatoryName: '', buyerSignatoryTitle: '',
  // Seller / Mandate
  sellerCompany: '', sellerAddress: '', sellerRegNo: '',
  sellerMandateName: '', sellerMandateAddress: '',
  sellerRepresentative: '', sellerRepTitle: '',
  sellerSignatoryName: '', sellerSignatoryTitle: '',
  // Product
  product: '', quality: '', origin: 'Russian Federation', refinery: '',
  quantityPerMonth: '', totalQuantity: '', tolerance: '5', duration: '12', durationWords: 'twelve',
  firstDeliveryDays: '30',
  // Price
  priceFormula: 'Platts Mean Brent Dated', priceSource: 'Platts', differential: '',
  // Delivery
  incoterm: 'FOB', loadPort: '', dischargePort: '', laycanFrom: '', laycanTo: '',
  vessel: '', inspector: 'SGS / Bureau Veritas',
  // Payment
  paymentTerm: 'Irrevocable, Confirmed LC at Sight',
  lcOpeningDays: '7', lcValidity: '30', totalValue: '',
  bankRating: 'Investment Grade',
  // Buyer bank
  buyerBank: '', buyerBankSwift: '', buyerBankAddress: '',
  bankOfficerName: '', bankOfficerTitle: '', clientSince: '',
  // Seller bank
  sellerBank: '', sellerBankSwift: '', sellerBankAddress: '',
  // Legal
  arbitration: 'International Chamber of Commerce (ICC)',
  arbitrationSeat: 'London, England', governingLaw: 'England and Wales',
  // FCO / offer
  fcoValidity: '7', icpoValidity: '7',
  // PB
  pbPercent: '1.5', pbPercentMax: '2',
  // POP status
  pop1: false, pop1Notes: '', pop2: false, pop2Notes: '', pop3: false, pop3Notes: '',
  pop4: false, pop4Notes: '', pop5: false, pop5Notes: '', pop6: false, pop6Notes: '',
  pop7: false, pop7Notes: '',
  // Misc
  inspectorCost: 'Buyer',
};

export default function Documents({ deals }) {
  const [activeDoc, setActiveDoc] = useState('procedure');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [linkedDeal, setLinkedDeal] = useState('');
  const [stepStatuses, setStepStatuses] = useState({});

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const check = (k) => upd(k, !form[k]);

  // Pre-fill form from deal
  useEffect(() => {
    if (!linkedDeal) return;
    const d = deals.find(x => x.id === linkedDeal);
    if (!d) return;
    const productName = PRODUCTS[d.product]?.name || d.product;
    setForm(prev => ({
      ...prev,
      product: productName,
      quantityPerMonth: String(d.quantity || ''),
      tolerance: String(d.tolerance || '5'),
      incoterm: d.incoterm || prev.incoterm,
      loadPort: d.loadPort || prev.loadPort,
      dischargePort: d.dischargePort || prev.dischargePort,
      laycanFrom: d.laycanFrom || prev.laycanFrom,
      laycanTo: d.laycanTo || prev.laycanTo,
      differential: String(d.differential || ''),
      paymentTerm: d.paymentTerm || prev.paymentTerm,
      inspector: d.inspector || prev.inspector,
      buyerBank: d.bankRating ? `[Buyer Bank — rating ${d.bankRating}]` : prev.buyerBank,
      relatedICPO: d.id,
      refNumber: d.id.replace('D', ''),
    }));
  }, [linkedDeal, deals]);

  const printCurrent = () => {
    const map = { icpo: genICPO, fco: genFCO, bcl: genBCL, spa: genSPA, pop: genPOP };
    const gen = map[activeDoc];
    if (gen) printDoc(gen(form), activeDoc.toUpperCase());
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Procédures & Documents</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Générateur de documents types — ICPO, FCO, BCL/MT-799, SPA, POP
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 flex-wrap border-b border-slate-200 dark:border-slate-700">
        {DOC_TYPES.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveDoc(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-md transition border-b-2 ${
              activeDoc === id
                ? 'border-brand-600 text-brand-700 dark:text-brand-400 bg-white dark:bg-slate-800'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── PROCEDURE TAB ──────────────────────────────────────── */}
      {activeDoc === 'procedure' && (
        <div className="space-y-4">
          <Card>
            <CardHeader icon={ClipboardList} title="Procédure d'achat standard"
              subtitle="12 étapes de l'ICPO à la première livraison" />
            <CardBody>
              <div className="space-y-2">
                {STEPS.map(step => {
                  const done = stepStatuses[step.n];
                  return (
                    <div key={step.n}
                      className={`flex items-start gap-3 p-3 rounded-md border transition cursor-pointer ${
                        done
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                      }`}
                      onClick={() => setStepStatuses(s => ({ ...s, [step.n]: !s[step.n] }))}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        done ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {done ? '✓' : step.n}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${done ? 'text-emerald-800 dark:text-emerald-300 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                            {step.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono ${
                            step.doc === 'ICPO' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400' :
                            step.doc === 'FCO'  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                            step.doc === 'BCL'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            step.doc === 'SPA'  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            step.doc === 'POP'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            step.doc === 'PB'   ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}>{step.doc}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{step.desc}</p>
                      </div>
                      <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 ${done ? 'text-emerald-500' : 'text-slate-400'}`} />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Cliquez sur une étape pour la marquer comme complète.
                {Object.values(stepStatuses).filter(Boolean).length}/{STEPS.length} étapes complétées.
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ── DOCUMENT FORMS ─────────────────────────────────────── */}
      {activeDoc !== 'procedure' && (
        <>
          {/* Pre-fill from deal */}
          <Card>
            <CardHeader icon={FileText} title="Pré-remplir depuis un deal"
              subtitle="Les champs du deal sélectionné remplissent le formulaire automatiquement" />
            <CardBody>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Deal lié">
                  <Select value={linkedDeal} onChange={e => setLinkedDeal(e.target.value)}>
                    <option value="">— Saisie manuelle —</option>
                    {deals.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.id} — {PRODUCTS[d.product]?.name || d.product} — {d.counterparty}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="N° de référence du document">
                  <Input value={form.refNumber} onChange={e => upd('refNumber', e.target.value)} placeholder="Ex. 2026-001" />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* ── Parties ─── */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader icon={FileText} title="Acheteur (Buyer)" />
              <CardBody>
                <div className="space-y-3">
                  <Field label="Société"><Input value={form.buyerCompany}        onChange={e => upd('buyerCompany', e.target.value)} placeholder="AMKO TRADING SA" /></Field>
                  <Field label="Adresse"><Input value={form.buyerAddress}        onChange={e => upd('buyerAddress', e.target.value)} placeholder="Adresse complète" /></Field>
                  <Field label="N° d'enregistrement"><Input value={form.buyerRegNo} onChange={e => upd('buyerRegNo', e.target.value)} /></Field>
                  <Field label="Signataire autorisé"><Input value={form.buyerSignatoryName} onChange={e => upd('buyerSignatoryName', e.target.value)} placeholder="Nom complet" /></Field>
                  <Field label="Titre du signataire"><Input value={form.buyerSignatoryTitle} onChange={e => upd('buyerSignatoryTitle', e.target.value)} placeholder="CEO / Director" /></Field>
                  <Field label="Contact / Email"><Input value={form.buyerContact} onChange={e => upd('buyerContact', e.target.value)} /></Field>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={FileText} title="Vendeur / Mandate (Seller)" />
              <CardBody>
                <div className="space-y-3">
                  <Field label="Société du Mandate"><Input value={form.sellerMandateName} onChange={e => upd('sellerMandateName', e.target.value)} /></Field>
                  <Field label="Adresse Mandate"><Input value={form.sellerMandateAddress} onChange={e => upd('sellerMandateAddress', e.target.value)} /></Field>
                  <Field label="Société du Vendeur"><Input value={form.sellerCompany} onChange={e => upd('sellerCompany', e.target.value)} /></Field>
                  <Field label="Adresse Vendeur"><Input value={form.sellerAddress} onChange={e => upd('sellerAddress', e.target.value)} /></Field>
                  <Field label="Représentant Vendeur"><Input value={form.sellerRepresentative} onChange={e => upd('sellerRepresentative', e.target.value)} /></Field>
                  <Field label="Titre"><Input value={form.sellerRepTitle} onChange={e => upd('sellerRepTitle', e.target.value)} /></Field>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ── Produit & Commercial ─── */}
          <Card>
            <CardHeader icon={FileText} title="Produit & termes commerciaux" />
            <CardBody>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="Produit"><Input value={form.product} onChange={e => upd('product', e.target.value)} placeholder="Ex. Gasoil / Diesel EN590 10ppm" /></Field>
                <Field label="Qualité"><Input value={form.quality} onChange={e => upd('quality', e.target.value)} placeholder="Specs ASTM / EN590" /></Field>
                <Field label="Origine"><Input value={form.origin} onChange={e => upd('origin', e.target.value)} /></Field>
                <Field label="Qté / mois (MT)"><Input type="number" value={form.quantityPerMonth} onChange={e => upd('quantityPerMonth', e.target.value)} /></Field>
                <Field label="Tolérance (%)"><Input type="number" value={form.tolerance} onChange={e => upd('tolerance', e.target.value)} /></Field>
                <Field label="Durée (mois)"><Input type="number" value={form.duration} onChange={e => upd('duration', e.target.value)} /></Field>
                <Field label="Formule de prix"><Input value={form.priceFormula} onChange={e => upd('priceFormula', e.target.value)} placeholder="Platts Mean Brent Dated" /></Field>
                <Field label="Différentiel ($/bbl)"><Input type="number" step="0.01" value={form.differential} onChange={e => upd('differential', e.target.value)} /></Field>
                <Field label="Source prix"><Select value={form.priceSource} onChange={e => upd('priceSource', e.target.value)}><option>Platts</option><option>Argus</option><option>OPIS</option></Select></Field>
                <Field label="Incoterm"><Select value={form.incoterm} onChange={e => upd('incoterm', e.target.value)}>{INCOTERMS.map(i => <option key={i}>{i}</option>)}</Select></Field>
                <Field label="Port chargement"><Input value={form.loadPort} onChange={e => upd('loadPort', e.target.value)} placeholder="Ex. Novorossiysk" /></Field>
                <Field label="Port déchargement"><Input value={form.dischargePort} onChange={e => upd('dischargePort', e.target.value)} placeholder="Ex. Rotterdam" /></Field>
                <Field label="Laycan début"><Input type="date" value={form.laycanFrom} onChange={e => upd('laycanFrom', e.target.value)} /></Field>
                <Field label="Laycan fin"><Input type="date" value={form.laycanTo} onChange={e => upd('laycanTo', e.target.value)} /></Field>
                <Field label="Paiement"><Select value={form.paymentTerm} onChange={e => upd('paymentTerm', e.target.value)}><option>Irrevocable, Confirmed LC at Sight</option><option>LC deferred 30 days</option><option>LC deferred 60 days</option><option>SBLC</option><option>Open credit</option></Select></Field>
              </div>
            </CardBody>
          </Card>

          {/* ── Banques ─── */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader icon={FileText} title="Banque Acheteur" />
              <CardBody>
                <div className="space-y-3">
                  <Field label="Nom banque"><Input value={form.buyerBank} onChange={e => upd('buyerBank', e.target.value)} placeholder="Ex. BNP Paribas" /></Field>
                  <Field label="SWIFT/BIC"><Input value={form.buyerBankSwift} onChange={e => upd('buyerBankSwift', e.target.value)} placeholder="Ex. BNPAFRPP" /></Field>
                  <Field label="Adresse banque"><Input value={form.buyerBankAddress} onChange={e => upd('buyerBankAddress', e.target.value)} /></Field>
                  <Field label="Officier bancaire"><Input value={form.bankOfficerName} onChange={e => upd('bankOfficerName', e.target.value)} /></Field>
                  <Field label="Titre"><Input value={form.bankOfficerTitle} onChange={e => upd('bankOfficerTitle', e.target.value)} placeholder="Senior Relationship Manager" /></Field>
                  <Field label="Client depuis (année)"><Input value={form.clientSince} onChange={e => upd('clientSince', e.target.value)} placeholder="Ex. 2018" /></Field>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader icon={FileText} title="Banque Vendeur" />
              <CardBody>
                <div className="space-y-3">
                  <Field label="Nom banque"><Input value={form.sellerBank} onChange={e => upd('sellerBank', e.target.value)} /></Field>
                  <Field label="SWIFT/BIC"><Input value={form.sellerBankSwift} onChange={e => upd('sellerBankSwift', e.target.value)} /></Field>
                  <Field label="Adresse banque"><Input value={form.sellerBankAddress} onChange={e => upd('sellerBankAddress', e.target.value)} /></Field>
                  <Field label="ICPO n° référencé"><Input value={form.relatedICPO} onChange={e => upd('relatedICPO', e.target.value)} /></Field>
                  <Field label="SPA n° référencé"><Input value={form.relatedSPA} onChange={e => upd('relatedSPA', e.target.value)} /></Field>
                  <Field label="Valeur totale transaction (USD)"><Input value={form.totalValue} onChange={e => upd('totalValue', e.target.value)} placeholder="Ex. 5,000,000" /></Field>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* ── POP checklist (only for pop tab) ─── */}
          {activeDoc === 'pop' && (
            <Card>
              <CardHeader icon={FileCheck2} title="Statut des 7 documents POP" />
              <CardBody>
                <div className="space-y-3">
                  {[
                    { key: 'pop1', label: '6.1 Licence d\'export — Ministère de l\'Énergie russe' },
                    { key: 'pop2', label: '6.2 Approbation export — Ministère de la Justice russe' },
                    { key: 'pop3', label: '6.3 Statement of Availability of Product' },
                    { key: 'pop4', label: '6.4 Engagement de la raffinerie à produire le produit' },
                    { key: 'pop5', label: '6.5 Charter Party Agreement(s) vers les ports de déchargement' },
                    { key: 'pop6', label: '6.6 Banking Passport of the Bargain' },
                    { key: 'pop7', label: '6.7 Contrat avec AK "Transneft" (transport au port)' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-3">
                      <input type="checkbox" checked={!!form[key]} onChange={() => check(key)}
                        className="w-4 h-4 text-brand-600 border-slate-300 dark:border-slate-600 rounded" />
                      <span className={`text-sm flex-1 ${form[key] ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{label}</span>
                      <Input value={form[key + 'Notes'] || ''} onChange={e => upd(key + 'Notes', e.target.value)}
                        placeholder="Notes / référence doc." className="max-w-[200px]" />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* ── Print button ─── */}
          <div className="flex gap-3 items-center">
            <Button variant="primary" icon={Printer} onClick={printCurrent}>
              Imprimer / Exporter PDF — {activeDoc.toUpperCase()}
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Le document s'ouvre dans un nouvel onglet. Utilisez Fichier → Imprimer → "Enregistrer en PDF" pour exporter.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
