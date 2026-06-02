import React, { useState } from 'react';
import { FilePlus2, Ship, DollarSign, Droplets, ScrollText, Save } from 'lucide-react';
import { PRODUCTS, INCOTERMS, VESSELS, PRICE_SOURCES } from '../constants.js';
import { uid, todayISO } from '../utils.js';
import { Card, CardHeader, CardBody, Field, Input, Select, Textarea, Button } from '../components/UI.jsx';

export default function NewDeal({ onSave, editingDeal, onCancel }) {
  const [form, setForm] = useState(editingDeal || {
    id: uid(), dealType: 'buy', counterparty: '', counterpartyCountry: '',
    product: 'crude-bonny', quantity: '', tolerance: 10,
    incoterm: 'FOB', loadPort: '', dischargePort: '',
    laycanFrom: todayISO(), laycanTo: todayISO(), blDate: '',
    priceSource: 'Platts', priceMarker: 'brent', differential: '',
    estimatedPrice: '', paymentTerm: 'LC at sight',
    vessel: '', inspector: 'SGS', hedgeRatio: 100, notes: '',
    status: 'open', createdAt: todayISO(),
    bankRating: 'A', counterpartyTier: 'first-class',
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.counterparty || !form.quantity) {
      alert('Contrepartie et quantité sont obligatoires.');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {editingDeal ? 'Éditer le deal' : 'Nouveau deal'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Phase 1-2 du système : capture du deal</p>
        </div>
        <div className="flex gap-2">
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
              <Input value={form.counterparty} onChange={e => update('counterparty', e.target.value)} placeholder="Ex. TotalEnergies" />
            </Field>
            <Field label="Pays de la contrepartie" hint="Sert au filtre sanctions">
              <Input value={form.counterpartyCountry} onChange={e => update('counterpartyCountry', e.target.value)} placeholder="Ex. Nigeria" />
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
        <CardHeader icon={Droplets} title="Produit, quantité, qualité" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Produit" required>
              <Select value={form.product} onChange={e => update('product', e.target.value)}>
                <optgroup label="Bruts">
                  {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'crude').map(([k, p]) => (
                    <option key={k} value={k}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Produits raffinés">
                  {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'product').map(([k, p]) => (
                    <option key={k} value={k}>{p.name}</option>
                  ))}
                </optgroup>
                <optgroup label="GPL">
                  {Object.entries(PRODUCTS).filter(([, p]) => p.type === 'gpl').map(([k, p]) => (
                    <option key={k} value={k}>{p.name}</option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label="Quantité (MT)" required>
              <Input type="number" value={form.quantity} onChange={e => update('quantity', e.target.value)} placeholder="6500" />
            </Field>
            <Field label="Tolérance ± %">
              <Input type="number" value={form.tolerance} onChange={e => update('tolerance', e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={Ship} title="Incoterm & logistique" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Incoterm" required>
              <Select value={form.incoterm} onChange={e => update('incoterm', e.target.value)}>
                {INCOTERMS.map(i => <option key={i}>{i}</option>)}
              </Select>
            </Field>
            <Field label="Port de chargement">
              <Input value={form.loadPort} onChange={e => update('loadPort', e.target.value)} placeholder="Ex. Bonny" />
            </Field>
            <Field label="Port de déchargement">
              <Input value={form.dischargePort} onChange={e => update('dischargePort', e.target.value)} placeholder="Ex. Rotterdam" />
            </Field>
            <Field label="Laycan — début">
              <Input type="date" value={form.laycanFrom} onChange={e => update('laycanFrom', e.target.value)} />
            </Field>
            <Field label="Laycan — fin">
              <Input type="date" value={form.laycanTo} onChange={e => update('laycanTo', e.target.value)} />
            </Field>
            <Field label="Date B/L (si déjà chargé)">
              <Input type="date" value={form.blDate} onChange={e => update('blDate', e.target.value)} />
            </Field>
            <Field label="Type de navire">
              <Select value={form.vessel} onChange={e => update('vessel', e.target.value)}>
                <option value="">— Choisir —</option>
                {VESSELS.map(v => <option key={v}>{v}</option>)}
              </Select>
            </Field>
            <Field label="Inspecteur">
              <Select value={form.inspector} onChange={e => update('inspector', e.target.value)}>
                <option>SGS</option><option>Bureau Veritas</option>
                <option>Intertek</option><option>Saybolt</option>
              </Select>
            </Field>
            <Field label="Hedge ratio % cible" hint="Part de l'exposition à couvrir">
              <Input type="number" min="0" max="100" value={form.hedgeRatio} onChange={e => update('hedgeRatio', e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={DollarSign} title="Prix et paiement" />
        <CardBody>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Source de cotation">
              <Select value={form.priceSource} onChange={e => update('priceSource', e.target.value)}>
                {PRICE_SOURCES.map(s => <option key={s}>{s}</option>)}
              </Select>
            </Field>
            <Field label="Marker / Benchmark">
              <Select value={form.priceMarker} onChange={e => update('priceMarker', e.target.value)}>
                <option value="brent">Brent Dated / BFOE</option>
                <option value="wti">WTI</option>
                <option value="dubai">Dubai</option>
                <option value="gasoil">ICE Gasoil</option>
                <option value="rbob">RBOB</option>
                <option value="ulsd">ULSD / Heating Oil</option>
              </Select>
            </Field>
            <Field label="Différentiel ($/bbl)" hint="Prime (+) ou décote (−)">
              <Input type="number" step="0.01" value={form.differential} onChange={e => update('differential', e.target.value)} placeholder="+1.21" />
            </Field>
            <Field label="Prix estimé ($/bbl)" hint="Pour le notional">
              <Input type="number" step="0.01" value={form.estimatedPrice} onChange={e => update('estimatedPrice', e.target.value)} placeholder="108.00" />
            </Field>
            <Field label="Conditions de paiement">
              <Select value={form.paymentTerm} onChange={e => update('paymentTerm', e.target.value)}>
                <option>LC at sight</option><option>LC deferred 30 days</option>
                <option>LC deferred 60 days</option><option>Open credit</option>
                <option>Prépaiement</option><option>SBLC</option>
              </Select>
            </Field>
            <Field label="Statut">
              <Select value={form.status} onChange={e => update('status', e.target.value)}>
                <option value="open">Ouvert</option>
                <option value="contracted">Contractualisé</option>
                <option value="financed">Financé (LC OK)</option>
                <option value="loaded">Chargé</option>
                <option value="discharged">Déchargé</option>
                <option value="closed">Soldé</option>
              </Select>
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={ScrollText} title="Notes" />
        <CardBody>
          <Textarea rows={3} value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Spécifications, clauses particulières, points de vigilance…" />
        </CardBody>
      </Card>
    </div>
  );
}
