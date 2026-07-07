import React from 'react';

export const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
    {children}
  </div>
);

export const CardHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-md">
          <Icon className="w-5 h-5 text-brand-700 dark:text-brand-400" />
        </div>
      )}
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

export const Field = ({ label, children, hint, required }) => (
  <div>
    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{hint}</p>}
  </div>
);

export const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition ${className}`}
  />
);

export const Select = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition"
  >
    {children}
  </select>
);

export const Textarea = (props) => (
  <textarea
    {...props}
    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition resize-y"
  />
);

export const Button = ({ children, variant = 'primary', icon: Icon, size = 'md', ...props }) => {
  const variants = {
    primary:   'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-slate-300 dark:disabled:bg-slate-600',
    secondary: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600',
    danger:    'bg-red-600 text-white hover:bg-red-700',
    gold:      'bg-amber-600 text-white hover:bg-amber-700',
    outline:   'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button {...props} className={`rounded-md font-medium flex items-center gap-2 transition ${variants[variant]} ${sizes[size]}`}>
      {Icon && <Icon className="w-4 h-4" />}{children}
    </button>
  );
};

export const Stat = ({ label, value, hint, accent = 'blue' }) => {
  const colors = {
    blue:  'text-brand-700 dark:text-brand-400',
    green: 'text-emerald-700 dark:text-emerald-400',
    red:   'text-red-700 dark:text-red-400',
    gold:  'text-amber-700 dark:text-amber-400',
    slate: 'text-slate-700 dark:text-slate-300',
  };
  return (
    <div className="px-4 py-3 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colors[accent]}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
};

export const Row = ({ label, value }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
    <span className="text-slate-600 dark:text-slate-400">{label}</span>
    <span className="font-semibold text-slate-900 dark:text-slate-100">{value}</span>
  </div>
);
