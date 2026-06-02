import React, { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/UI.jsx';

const FIELDS = [
  { code: '40A', name: 'Form of Credit',           expected: 'IRREVOCABLE',         tip: 'Doit être irrévocable' },
  { code: '20',  name: 'DC Number',                expected: '',                    tip: 'Référence à citer dans toute correspondance' },
  { code: '31C', name: "Date d'émission",           expected: '',                    tip: "Date d'ouverture de la LC" },
  { code: '31D', name: "Date & lieu d'expiration",  expected: '',                    tip: "Au-delà : plus d'encaissement possible" },
  { code: '40E', name: 'Règles applicables',        expected: 'UCP LATEST VERSION', tip: 'Doit citer UCP 600' },
  { code: '50',  name: 'Applicant (acheteur)',      expected: '',                    tip: "À reprendre à l'identique sur la facture" },
  { code: '59',  name: 'Beneficiary (vendeur)',     expected: '',                    tip: 'Vérifier nom et adresse exacts' },
  { code: '32B', name: 'Devise & montant',          expected: '',                    tip: 'Conformité au contrat' },
  { code: '39A', name: 'Tolérance % (montant)',     expected: '+/− 10%',            tip: 'Souvent 10% par défaut' },
  { code: '41A', name: 'Available With/By',         expected: '',                    tip: 'Doit correspondre à votre banque' },
  { code: '42P', name: 'Conditions de paiement',   expected: '',                    tip: 'AT SIGHT ou BY DEF PAYMENT' },
  { code: '43P', name: 'Partial Shipments',         expected: 'ALLOWED',            tip: 'Habituellement autorisé' },
  { code: '43T', name: 'Transhipment',              expected: 'ALLOWED',            tip: 'Habituellement autorisé' },
  { code: '44E', name: 'Port de chargement',        expected: '',                    tip: '' },
  { code: '44F', name: 'Port de déchargement',      expected: '',                    tip: 'Vérifier restrictions embargo' },
  { code: '44C', name: "Date limite d'embarquement",expected: '',                   tip: 'Latest shipment date' },
  { code: '45A', name: 'Description marchandises',  expected: '',                    tip: "À reprendre à l'identique sur la facture" },
  { code: '46A', name: 'Documents requis',          expected: '',                    tip: "Réduire à l'essentiel" },
  { code: '47A', name: 'Conditions additionnelles', expected: '',                    tip: 'Clauses sanctions, etc.' },
  { code: '49',  name: 'Confirmation',              expected: 'MAY ADD',            tip: 'MAY ADD est préférable côté acheteur' },
  { code: '71D', name: 'Charges',                   expected: '',                    tip: 'Qui paie quoi ?' },
  { code: '78',  name: 'Instructions paiement',    expected: '',                    tip: 'Lire les délais' },
];

export default function LCChecker() {
  const [checked, setChecked] = useState({});
  const done = Object.values(checked).filter(Boolean).length;
  const pct  = Math.round((done / FIELDS.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Vérificateur LC — MT700</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Checklist des champs SWIFT à contrôler</p>
      </div>

      <Card>
        <CardHeader icon={FileCheck2} title={`Progression : ${done} / ${FIELDS.length} champs`} subtitle={`${pct}% complété`} />
        <CardBody>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-emerald-600 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <div className="divide-y divide-slate-200 dark:divide-slate-700">
            {FIELDS.map(f => (
              <label key={f.code}
                className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer">
                <input type="checkbox"
                  checked={!!checked[f.code]}
                  onChange={e => setChecked(c => ({ ...c, [f.code]: e.target.checked }))}
                  className="mt-1 w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-700 dark:text-slate-300 font-semibold">
                      {f.code}
                    </span>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.name}</span>
                    {f.expected && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                        {f.expected}
                      </span>
                    )}
                  </div>
                  {f.tip && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.tip}</p>}
                </div>
              </label>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
