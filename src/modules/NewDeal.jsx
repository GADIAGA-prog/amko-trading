import React, { useEffect, useMemo, useState } from 'react';
import { FilePlus2, Ship, DollarSign, Droplets, ScrollText, Save, Zap } from 'lucide-react';
import { PRODUCTS, INCOTERMS, VESSELS, PRICE_SOURCES } from '../constants.js';
import { uid, todayISO } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Textarea, Button } from '../components/UI.jsx';
import { getLatestPlattsPrice, getPlattsProductOptions } from '../utils/plattsStore.js';

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
    estimatedPrice: '', paymentTerm: 'LC at sight',
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
    onSave(form);
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
      laycanFrom: '2026-06-01',
      laycanTo: '2026-06-15',
      blDate: '2026-06-01',
      priceSource: 'Platts',
      priceMarker: 'gasoil',
      differential: '65.62',
      estimatedPrice: '1126.62',
      paymentTerm: 'LC at sight',
      bankRating: 'first-class',
      hedgeRatio: 100,
      vessel: 'MR2 (TBN)',
      inspector: 'SGS',
      status: 'contracted',
      notes: 'Gasoil 0,1%S FOB MED. Pricing: Platts MED Gasoil 0,1%S moyenne 5j autour BL (01/06/2026). Prime Vitol: +65,62 USD/MT. Platts référence: 1 061 USD/MT.',
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
      laycanFrom: '2026-06-01',
      laycanTo: '2026-06-15',
      blDate: '2026-06-01',
      priceSource: 'Platts',
      priceMarker: 'gasoil',
      differential: '139',
      estimatedPrice: '1200',
      paymentTerm: 'J+30 ouvrables (LC irrévocable)',
      bankRating: 'A',
      hedgeRatio: 0,
      vessel: 'MR2 (TBN)',
      inspector: 'SGS',
      status: 'contracted',
      notes: 'Gasoil 0,1%S DAP Lomé. Pricing: Platts MED Gasoil 0,1%S moyenne quotidienne BL→livraison (01/06→15/06/2026). Prime AMKO: +139 USD/MT. Prix vente cible: 1 200 USD/MT. Paiement client en XOF J+30 ouvrables. Couverture FX forward USD/XOF requise.',
    }));
  };

  const selectedPlatts = String(form.product || '').startsWith('platts:')
    ? getLatestPlattsPrice(String(form.product).replace('platts:', ''))
    : null;

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
              <div className="md:col-span-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-200">
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
            <Field label="Prix estimé"><Input type="number" step="0.01" value={form.estimatedPrice} onChange={e => update('estimatedPrice', e.target.value)} placeholder="Prix Platts ou offre fournisseur" /></Field>
            <Field label="Conditions de paiement"><Select value={form.paymentTerm} onChange={e => update('paymentTerm', e.target.value)}><option>LC at sight</option><option>LC deferred 30 days</option><option>LC deferred 60 days</option><option>Open credit</option><option>Prépaiement</option><option>SBLC</option></Select></Field>
            <Field label="Statut"><Select value={form.status} onChange={e => update('status', e.target.value)}><option value="open">Ouvert</option><option value="contracted">Contractualisé</option><option value="financed">Financé (LC OK)</option><option value="loaded">Chargé</option><option value="discharged">Déchargé</option><option value="closed">Soldé</option></Select></Field>
          </div>
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
