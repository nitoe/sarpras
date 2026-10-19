import type { ReactNode } from 'react'

export function PageHeader({ judul, keterangan, aksi }: { judul: string; keterangan?: string; aksi?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[#1a1d33]">{judul}</h1>
        {keterangan && <p className="mt-0.5 text-sm text-muted">{keterangan}</p>}
      </div>
      {aksi}
    </div>
  )
}

export function Notice({ tipe = 'info', children }: { tipe?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  const gaya = {
    info: 'border-muh-200 bg-muh-50 text-muh-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-red-200 bg-red-50 text-red-700',
  }[tipe]
  return <div className={`rounded-lg border px-3.5 py-3 text-sm ${gaya}`}>{children}</div>
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-muh-200 bg-muh-50 px-2.5 py-0.5 text-xs font-medium text-muh-700">
      {children}
    </span>
  )
}
