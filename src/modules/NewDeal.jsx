import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Ship, DollarSign, Droplets, ScrollText, Save, Zap } from 'lucide-react';
import { PRODUCTS, INCOTERMS, VESSELS, PRICE_SOURCES } from '../constants.js';
import { uid, todayISO } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Textarea, Button } from '../components/UI.jsx';
import { getLatestPlattsPrice, getPlattsProductOptions, getMOPWindow, getPricesForPeriod } from '../utils/plattsStore.js';

function productLabel(value) {
  if (PRODUCTS[value]) return PRODUCTS[value].name;
  if (String(value || '').startsWith('platts:')) {
    const latest = getLatestPlattsPrice(String(value).replace('platts:', ''));
    return latest?.description || String(value).replace('platts:', '');
  }
  return value || 'Produit';
}

export default function NewDeal({ onSave, editingDeal, onCancel }) {
  const [plattsProducts, setPlattsProducts] = useState(() => getPlattsProductOptions());
  const defaultProduct = plattsProducts[0]?.value || 'crude-bonny';
  const [form, setForm] = useState(editingDeal || {
    id: uid(), dealType: 'buy', counterparty: '', counterpartyCountry: '',
    product: defaultProduct, quantity: '', tolerance: 10,
    incoterm: 'FOB', loadPort: '', dischargePort: '',
    laycanFrom: todayISO(), laycanTo: todayISO(), blDate: '',
    priceSource: 'Platts', priceMarker: plattsProducts[0]?.code || 'brent', differential: '',
    estimatedPrice: '', purchasePrice: '', salePrice: '', paymentTerm: 'LC at sight',
    vessel: '', inspector: 'SGS', hedgeRatio: 100, notes: '',
    status: 'open', createdAt: todayISO(),
    bankRating: 'A', counterpartyTier: 'first-class',
  });

  useEffect(() => {
    const refresh = () => setPlattsProducts(getPlattsProductOptions());
    window.addEventListener('amko:platts-updated', refresh);
    refresh();
    return () => window.removeEventListener('amko:platts-updated', refresh);
  }, []);

  const standardGroups = useMemo(() => ({
    crudes: Object.entries(PRODUCTS).filter(([, p]) => p.type === 'crude'),
    refined: Object.entries(PRODUCTS).filter(([, p]) => p.type === 'product'),
    gpl: Object.entries(PRODUCTS).filter(([, p]) => p.type === 'gpl'),
  }), []);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateProduct = (value) => {
    setForm((f) => {
      const next = { ...f, product: value };
      if (String(value).startsWith('platts:')) {
        const code = value.replace('platts:', '');
        const latest = getLatestPlattsPrice(code);
        next.priceSource = 'Platts';
        next.priceMarker = code;
        if (latest?.price) next.estimatedPrice = String(latest.price);
        next.plattsCode = code;
        next.plattsDescription = latest?.description || code;
        next.plattsDate = latest?.date || '';
      } else {
        next.priceMarker = PRODUCTS[value]?.marker || f.priceMarker || 'brent';
      }
      return next;
    });
  };

  const submit = () => {
    if (!form.counterparty || !form.quantity) {
      alert('Contrepartie et quantité sont obligatoires.');
      return;
    }
    // estimatedPrice reste le prix de la "jambe" du deal (achat ou vente)
    // pour rester compatible avec les modules qui le lisent (P&L, Pricing…)
    const legPrice = form.dealType === 'sell' ? form.salePrice : form.purchasePrice;
    onSave({ ...form, estimatedPrice: legPrice || form.estimatedPrice });
  };

  // ── Pré-remplissage deal exemple Vitol → Lomé ───────────────
  const loadExampleBuy = () => {
    setForm(f => ({
      ...f,
      dealType: 'buy',
      counterparty: 'Vitol S.A.',
      counterpartyTier: 'first-class',
      counterpartyCountry: 'Suisse',
      product: 'gasoil',
      quantity: '15000',
      tolerance: 5,
      incoterm: 'FOB',
      loadPort: 'Augusta (MED)',
      dischargePort: 'Lomé, Togo',
      laycanFrom: '2026-05-18',
      laycanTo: '2026-05-18',
      blDate: '2026-05-18',
      priceSource: 'Platts',
      priceMarker: 'gasoil',
      differential: '65.62',
      estimatedPrice: '1247.37',
      purchasePrice: '1247.37',
      salePrice: '',
      paymentTerm: 'LC at sight',
      bankRating: 'AA',
      hedgeRatio: 100,
      vessel: 'MR2 (TBN)',
      inspector: 'SGS',
      status: 'contracted',
      notes: 'Gasoil 0,1%S FOB MED. BL: 18/05/2026. Pricing Vitol: Platts MED Gasoil 0,1%S moy. 5j autour BL (14-20/05/2026): 1 181,75 USD/MT. Prime Vitol: +65,62 USD/MT → Prix achat: 1 247,37 USD/MT. Hedge ICE GOB: SHORT 150 lots entrés à 1 233,50 le 18/05, levés MOP sur 19 JO (avg 1 087,57). Gain hedge: +2 187 450 USD.',
    }));
  };

  const loadExampleSell = () => {
    setForm(f => ({
      ...f,
      dealType: 'sell',
      counterparty: 'Client Lomé',
      counterpartyTier: 'standard',
      counterpartyCountry: 'Togo',
      product: 'gasoil',
      quantity: '15000',
      tolerance: 5,
      incoterm: 'DAP',
      loadPort: 'Augusta (MED)',
      dischargePort: 'Lomé, Togo',
      laycanFrom: '2026-05-18',
      laycanTo: '2026-06-12',
      blDate: '2026-05-18',
      priceSource: 'Platts',
      priceMarker: 'gasoil',
      differential: '139',
      estimatedPrice: '1215.24',
      purchasePrice: '',
      salePrice: '1215.24',
      paymentTerm: 'J+30 ouvrables (LC irrévocable)',
      bankRating: 'A',
      hedgeRatio: 0,
      vessel: 'MR2 (TBN)',
      inspector: 'SGS',
      status: 'contracted',
      notes: 'Gasoil 0,1%S DAP Lomé. Livraison: 12/06/2026. Pricing AMKO: Platts MED Gasoil 0,1%S moy. 19 JO BL→livraison (18/05→12/06/2026): 1 076,24 USD/MT. Prime AMKO: +139 USD/MT → Prix vente: 1 215,24 USD/MT. Paiement client en XOF J+30 JO (24/07/2026). FX forward USD/XOF requis (tenor 42j). Marge nette avec hedge ICE: +100,72 USD/MT (+1 510 726 USD).',
    }));
  };

  const [nDaysAround, setNDaysAround] = useState(2);

  const selectedPlatts = String(form.product || '').startsWith('platts:')
    ? getLatestPlattsPrice(String(form.product).replace('platts:', ''))
    : null;

  const plattsCode = String(form.product || '').startsWith('platts:')
    ? String(form.product).replace('platts:', '')
    : form.priceMarker || '';

  const mopBL = useMemo(() => {
    if (!plattsCode || !form.blDate) return null;
    return getMOPWindow(plattsCode, form.blDate, nDaysAround);
  }, [plattsCode, form.blDate, nDaysAround]);

  const mopPeriod = useMemo(() => {
    if (!plattsCode || !form.blDate || !form.laycanTo) return null;
    return getPricesForPeriod(plattsCode, form.blDate, form.laycanTo);
  }, [plattsCode, form.blDate, form.laycanTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {editingDeal ? 'Éditer le deal' : 'Nouveau deal'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Capture du deal avec produits issus du Platts importé</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!editingDeal && (
            <>
              <button
                onClick={loadExampleBuy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition"
                title="Pré-remplir avec le deal d'achat Vitol Gasoil FOB MED">
                <Zap className="w-3.5 h-3.5" />
                Exemple — Achat Vitol
              </button>
              <button
                onClick={loadExampleSell}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition"
                title="Pré-remplir avec le deal de vente Client Lomé">
                <Zap className="w-3.5 h-3.5" />
                Exemple — Vente Client Lomé
              </button>
            </>
          )}
          {onCancel && <Button variant="secondary" onClick={onCancel}>Annuler</Button>}
          <Button variant="primary" icon={Save} onClick={submit}>Enregistrer</Button>
        </div>
      </div>

      <Card>
        <CardHeader icon={FilePlus2} title="Identité du deal" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="ID du deal"><Input value={form.id} disabled /></Field>
            <Field label="Type" required>
              <Select value={form.dealType} onChange={e => update('dealType', e.target.value)}>
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </Select>
            </Field>
            <Field label="Contrepartie" required>
              <Input value={form.counterparty} onChange={e => update('counterparty', e.target.value)} placeholder="Ex. Vitol" />
            </Field>
            <Field label="Pays de la contrepartie" hint="Sert au filtre sanctions">
              <Input value={form.counterpartyCountry} onChange={e => update('counterpartyCountry', e.target.value)} placeholder="Ex. Suisse" />
            </Field>
            <Field label="Niveau de contrepartie">
              <Select value={form.counterpartyTier} onChange={e => update('counterpartyTier', e.target.value)}>
                <option value="first-class">First-class (Major/Trader top)</option>
                <option value="solid">Solid (Investment grade)</option>
                <option value="standard">Standard</option>
                <option value="risky">À risque</option>
              </Select>
            </Field>
            <Field label="Banque émettrice / rating">
              <Select value={form.bankRating} onChange={e => update('bankRating', e.target.value)}>
                <option value="AAA">AAA</option><option value="AA">AA</option>
                <option value="A">A</option><option value="BBB">BBB</option>
                <option value="BB">BB</option><option value="lower">Lower / unknown</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Droplets} title="Produit, quantité, qualité" subtitle={plattsProducts.length ? `${plattsProducts.length} produit(s) disponibles depuis Platts` : 'Aucun Platts importé : produits standards disponibles'} />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Produit" required>
              <Select value={form.product} onChange={e => updateProduct(e.target.value)}>
                {plattsProducts.length > 0 && (
                  <optgroup label="Produits issus du Platts importé">
                    {plattsProducts.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </optgroup>
                )}
                <optgroup label="Bruts standards">
                  {standardGroups.crudes.map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
                <optgroup label="Produits raffinés standards">
                  {standardGroups.refined.map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
                <optgroup label="GPL standards">
                  {standardGroups.gpl.map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
                </optgroup>
              </Select>
            </Field>
            <Field label="Quantité (MT)" required>
              <Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} placeholder="15000" />
            </Field>
            <Field label="Tolérance ± %">
              <Input type="number" value={form.tolerance} onChange={e => update('tolerance', e.target.value)} />
            </Field>
            {selectedPlatts && (
              <div className="md:col-span-3 rounded-lg border border-brand-200 bg-brand-50 dark:bg-brand-950/30 dark:border-brand-800 p-3 text-sm text-brand-800 dark:text-brand-200">
                Produit Platts sélectionné : <b>{selectedPlatts.description}</b> — code <b>{selectedPlatts.code}</b> — dernier prix <b>{selectedPlatts.price}</b> au <b>{selectedPlatts.date}</b>.
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Ship} title="Incoterm & logistique" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Incoterm" required><Select value={form.incoterm} onChange={e => update('incoterm', e.target.value)}>{INCOTERMS.map(i => <option key={i}>{i}</option>)}</Select></Field>
            <Field label="Port de chargement"><Input value={form.loadPort} onChange={e => update('loadPort', e.target.value)} placeholder="Ex. FOB Med" /></Field>
            <Field label="Port de déchargement"><Input value={form.dischargePort} onChange={e => update('dischargePort', e.target.value)} placeholder="Ex. Lomé" /></Field>
            <Field label="Laycan — début"><Input type="date" value={form.laycanFrom} onChange={e => update('laycanFrom', e.target.value)} /></Field>
            <Field label="Laycan — fin"><Input type="date" value={form.laycanTo} onChange={e => update('laycanTo', e.target.value)} /></Field>
            <Field label="Date B/L"><Input type="date" value={form.blDate} onChange={e => update('blDate', e.target.value)} /></Field>
            <Field label="Type de navire"><Select value={form.vessel} onChange={e => update('vessel', e.target.value)}><option value="">— Choisir —</option>{VESSELS.map(v => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Inspecteur"><Select value={form.inspector} onChange={e => update('inspector', e.target.value)}><option>SGS</option><option>Bureau Veritas</option><option>Intertek</option><option>Saybolt</option></Select></Field>
            <Field label="Hedge ratio % cible"><Input type="number" min="0" max="100" value={form.hedgeRatio} onChange={e => update('hedgeRatio', e.target.value)} /></Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={DollarSign} title="Prix et paiement" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Source de cotation"><Select value={form.priceSource} onChange={e => update('priceSource', e.target.value)}>{PRICE_SOURCES.map(s => <option key={s}>{s}</option>)}</Select></Field>
            <Field label="Marker / code Platts"><Input value={form.priceMarker} onChange={e => update('priceMarker', e.target.value)} placeholder="Ex. AAVJI00-PLM" /></Field>
            <Field label="Différentiel / prime"><Input type="number" step="0.01" value={form.differential} onChange={e => update('differential', e.target.value)} placeholder="+70" /></Field>
            <Field label="Prix achat (USD/MT)" hint="Prix fournisseur / amont"><Input type="number" step="0.01" value={form.purchasePrice} onChange={e => update('purchasePrice', e.target.value)} placeholder="Ex. 1247.37" /></Field>
            <Field label="Prix vente (USD/MT)" hint="Prix client / aval"><Input type="number" step="0.01" value={form.salePrice} onChange={e => update('salePrice', e.target.value)} placeholder="Ex. 1215.24" /></Field>
            <Field label="Conditions de paiement"><Select value={form.paymentTerm} onChange={e => update('paymentTerm', e.target.value)}><option>LC at sight</option><option>LC deferred 30 days</option><option>LC deferred 60 days</option><option>Open credit</option><option>Prépaiement</option><option>SBLC</option></Select></Field>
            <Field label="Statut"><Select value={form.status} onChange={e => update('status', e.target.value)}><option value="open">Ouvert</option><option value="contracted">Contractualisé</option><option value="financed">Financé (LC OK)</option><option value="loaded">Chargé</option><option value="discharged">Déchargé</option><option value="closed">Soldé</option></Select></Field>
          </div>

          {/* ── Calculateur MOP ── */}
          {plattsCode && form.blDate && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                  Calculateur MOP — Moyenne Of Platts
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Jours autour du BL (chaque côté) :</span>
                  <select
                    value={nDaysAround}
                    onChange={e => setNDaysAround(Number(e.target.value))}
                    className="text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}j ({2*n+1} au total)</option>)}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* MOP achat : N jours autour du BL */}
                <div className="rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 p-3">
                  <div className="text-xs font-semibold text-brand-800 dark:text-brand-300 mb-2">
                    MOP achat — {2 * nDaysAround + 1}j autour BL ({form.blDate})
                  </div>
                  {mopBL ? (
                    <>
                      <table className="w-full text-xs mb-2">
                        <thead><tr className="text-brand-700 dark:text-brand-400">
                          <th className="text-left pb-1">Date</th>
                          <th className="text-right pb-1">Platts (USD/MT)</th>
                        </tr></thead>
                        <tbody>
                          {mopBL.rows.map(r => (
                            <tr key={r.date} className={r.isBL ? 'font-bold text-brand-900 dark:text-brand-100' : 'text-slate-700 dark:text-slate-300'}>
                              <td>{r.date}{r.isBL ? ' ★ BL' : ''}</td>
                              <td className="text-right">{r.price != null ? r.price.toFixed(2) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between border-t border-brand-200 dark:border-brand-700 pt-2">
                        <span className="font-semibold text-brand-900 dark:text-brand-100 text-sm">
                          Moy. {mopBL.count}j : <b>{mopBL.avg.toFixed(2)} USD/MT</b>
                          {form.differential ? <span className="text-brand-600 dark:text-brand-400"> + {form.differential} = {(mopBL.avg + Number(form.differential)).toFixed(2)}</span> : null}
                        </span>
                        <button
                          onClick={() => {
                            const v = (mopBL.avg + Number(form.differential || 0)).toFixed(2);
                            setForm(f => ({ ...f, purchasePrice: v, estimatedPrice: v }));
                          }}
                          className="text-xs px-2 py-1 rounded bg-brand-600 text-white hover:bg-brand-700 transition"
                        >
                          → Prix achat
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-brand-600 dark:text-brand-400 italic">
                      Aucune donnée Platts pour ce code et cette date BL. Importez un fichier Platts avec les dates autour du {form.blDate}.
                    </p>
                  )}
                </div>

                {/* MOP vente : BL → laycanTo (livraison) */}
                {form.laycanTo && form.laycanTo >= form.blDate && (
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                    <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                      MOP vente — BL→livraison ({form.blDate} → {form.laycanTo})
                    </div>
                    {mopPeriod ? (
                      <>
                        <div className="max-h-40 overflow-y-auto">
                          <table className="w-full text-xs mb-2">
                            <thead><tr className="text-emerald-700 dark:text-emerald-400">
                              <th className="text-left pb-1">Date</th>
                              <th className="text-right pb-1">Platts (USD/MT)</th>
                            </tr></thead>
                            <tbody>
                              {mopPeriod.rows.map(r => (
                                <tr key={r.date} className="text-slate-700 dark:text-slate-300">
                                  <td>{r.date}</td>
                                  <td className="text-right">{r.price != null ? r.price.toFixed(2) : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-emerald-200 dark:border-emerald-700 pt-2">
                          <span className="font-semibold text-emerald-900 dark:text-emerald-100 text-sm">
                            Moy. {mopPeriod.count}j : <b>{mopPeriod.avg.toFixed(2)} USD/MT</b>
                            {form.differential ? <span className="text-emerald-600 dark:text-emerald-400"> + {form.differential} = {(mopPeriod.avg + Number(form.differential || 0)).toFixed(2)}</span> : null}
                          </span>
                          <button
                            onClick={() => {
                              const v = (mopPeriod.avg + Number(form.differential || 0)).toFixed(2);
                              setForm(f => ({ ...f, salePrice: v, estimatedPrice: v }));
                            }}
                            className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                          >
                            → Prix vente
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">
                        Aucune donnée Platts pour la période {form.blDate} → {form.laycanTo}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={ScrollText} title="Notes" />
        <CardBody>
          <Textarea rows={3} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Spécifications, clauses particulières, points de vigilance…" />
        </CardBody>
      </Card>
    </div>
  );
}
