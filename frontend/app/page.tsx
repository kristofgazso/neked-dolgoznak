'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';

import { MPDeclarationsArraySchema, MPDeclarationZ } from './schemas';
import { fromZodError } from 'zod-validation-error';
import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';
import { ErtekpapirBefektetes, EgyebIngo } from './types';

const formatCurrency = (amount: number | null): string => {
  if (amount === null || amount === 0) return '-';
  // Use tabular nums for better alignment of numbers in tables
  return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(amount);
};

const countPropertiesOrZero = (arr: unknown[] | null | undefined): number => {
  return arr?.length || 0;
};

const sumHitelekOrZero = (tartozasok: { osszeg_huf: number | null }[] | null | undefined): number => {
  if (!tartozasok) return 0;
  return tartozasok.reduce((acc, item) => acc + (item.osszeg_huf || 0), 0);
};

// Calculate total debt for an MP
const calculateTotalDebt = (mp: MPDeclarationZ): number => {
  let totalDebt = 0;
  
  // Add bank debts
  totalDebt += sumHitelekOrZero(mp.vagyonyi_nyilatkozat?.tartozasok?.hitelintezettel_szembeni_tartozasok);
  
  // Add private debts
  totalDebt += sumHitelekOrZero(mp.vagyonyi_nyilatkozat?.tartozasok?.maganszemelyekkel_szembeni_tartozasok);
  
  return totalDebt;
};

// Calculate wealth excluding properties and vehicles
const totalOtherVagyonErtek = (mp: MPDeclarationZ): {total: number; breakdown: {[key: string]: number}} => {
  let total = 0;
  const breakdown: {[key: string]: number} = {
    keszpenz: 0,
    takarekbetet: 0,
    bankszamla: 0,
    ertekpapirok: 0,
    mualkotas: 0,
    egyeb_ingosag: 0,
    mas_penzkoveteles: 0
  };
  
  try {
    // Készpénz
    if (mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.keszpenz) {
      const amount = mp.vagyonyi_nyilatkozat.nagy_erteku_ingok.keszpenz.osszeg_huf || 0;
      total += amount;
      breakdown.keszpenz = amount;
    }
    
    // Takarékbetét
    if (mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.takarekbetetben_elhelyezett_megtakaritas) {
      const amount = mp.vagyonyi_nyilatkozat.nagy_erteku_ingok.takarekbetetben_elhelyezett_megtakaritas.osszeg_huf || 0;
      total += amount;
      breakdown.takarekbetet = amount;
    }
    
    // Bankszámla követelések
    const hitelintezeti = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.hitelintezeti_szamlakoveteles;
    if (hitelintezeti) {
      const forintban = hitelintezeti.forintban_huf || 0;
      const devizaban = hitelintezeti.devizaban_forinterteken_huf || 0;
      const egyeb = hitelintezeti.hitelintezeti_szamlakoveteles_huf || 0;
      const amount = forintban + devizaban + egyeb;
      total += amount;
      breakdown.bankszamla = amount;
    }
    
    // Értékpapírok
    const ertekpapirok = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.ertekpapir_vagy_egyeb_befektetes || [];
    let ertekpapirokTotal = 0;
    ertekpapirok.forEach(ep => {
      if (ep && ep.nevertek && ep.penznem === 'HUF') {
        ertekpapirokTotal += ep.nevertek;
      }
    });
    total += ertekpapirokTotal;
    breakdown.ertekpapirok = ertekpapirokTotal;
    
    // Védett műalkotások
    const mualkotas = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.vedett_mualkotas_es_gyujtemeny || [];
    let mualkotasTotal = 0;
    mualkotas.forEach(item => {
      mualkotasTotal += item.ertek_huf || 0;
    });
    total += mualkotasTotal;
    breakdown.mualkotas = mualkotasTotal;
    
    // Egyéb ingóságok 5M felett
    const egyebIngosag = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.egyeb_ingosag_5m_felett || [];
    let egyebTotal = 0;
    egyebIngosag.forEach(item => {
      egyebTotal += item.ertek_huf || 0;
    });
    total += egyebTotal;
    breakdown.egyeb_ingosag = egyebTotal;
    
    // Más szerződés alapján fennálló pénzkövetelés
    if (mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.mas_szerzodes_alapjan_fennallo_penzkoveteles_osszege_huf) {
      const amount = mp.vagyonyi_nyilatkozat.nagy_erteku_ingok.mas_szerzodes_alapjan_fennallo_penzkoveteles_osszege_huf || 0;
      total += amount;
      breakdown.mas_penzkoveteles = amount;
    }
  } catch (error) {
    console.error('Error calculating other wealth for MP:', mp.nyilatkozattevo_nev, error);
  }
  
  return { total, breakdown };
};

// Calculate total wealth including vehicles but excluding properties
const calculateTotalWealth = (mp: MPDeclarationZ): number => {
  let total = totalOtherVagyonErtek(mp).total;
  
  try {
    // Add vehicle values
    const gepjarmuvek = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || [];
    gepjarmuvek.forEach(jarmu => {
      total += jarmu.ertek_huf || 0;
    });
  } catch (error) {
    console.error('Error calculating total value for MP:', mp.nyilatkozattevo_nev, error);
  }
  
  return total;
};

// Helper function to get human-readable labels for the wealth breakdown
const getBreakdownLabel = (key: string): string => {
  const labels: Record<string, string> = {
    keszpenz: 'Készpénz',
    takarekbetet: 'Takarékbetét',
    bankszamla: 'Bankszámla',
    ertekpapirok: 'Értékpapírok',
    mualkotas: 'Műalkotások',
    egyeb_ingosag: 'Egyéb ingóságok',
    mas_penzkoveteles: 'Egyéb pénzkövetelés'
  };
  return labels[key] || key;
};

export default function Home() {
  const [mps, setMps] = useState<MPDeclarationZ[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // No tabs, only showing 'Összes képviselő'
  const [expandedMp, setExpandedMp] = useState<string | null>(null);
  
  // Toggle the expanded state for a MP's wealth breakdown
  const toggleExpand = (mpName: string) => {
    if (expandedMp === mpName) {
      setExpandedMp(null);
    } else {
      setExpandedMp(mpName);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/data.json');
        const rawData = await response.json();
        
        // Validate data with Zod schema - use safeParse for better error handling
        const validationResult = MPDeclarationsArraySchema.safeParse(rawData);
        
        if (validationResult.success) {
          console.log('Data validation successful');
          setMps(validationResult.data);
        } else {
          // Format and log detailed validation errors using zod-validation-error package
          const readableError = fromZodError(validationResult.error, {
            prefix: 'Validation error',
            prefixSeparator: ': ',
            includePath: true
          });
          
          console.error('Zod validation issues:', readableError.message);
          
          // Also log the full error object in a collapsed group for debugging
          console.groupCollapsed('Detailed validation errors');
          console.error(validationResult.error.format());
          console.groupEnd();
          
          console.log('Using data with schema errors, application will attempt to handle undefined values');
          
          // Still use the data but with warning - this keeps the app working
          setMps(rawData);
        }
      } catch (error) {
        console.error('Hiba az adatok betöltése során:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedMps = [...mps].sort((a, b) => {
    if (!sortField) return 0;

    // These can be string, number, or undefined based on the values we access
    let valueA: string | number | undefined;
    let valueB: string | number | undefined;

    switch (sortField) {
      case 'name':
        valueA = a.nyilatkozattevo_nev;
        valueB = b.nyilatkozattevo_nev;
        break;
      case 'vehicles':
        valueA = countPropertiesOrZero(a.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek);
        valueB = countPropertiesOrZero(b.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek);
        break;
      case 'properties':
        valueA = countPropertiesOrZero(a.vagyonyi_nyilatkozat?.ingatlanok);
        valueB = countPropertiesOrZero(b.vagyonyi_nyilatkozat?.ingatlanok);
        break;
      case 'debts':
        valueA = calculateTotalDebt(a);
        valueB = calculateTotalDebt(b);
        break;
      case 'cash':
        valueA = a.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.keszpenz?.osszeg_huf || 0;
        valueB = b.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.keszpenz?.osszeg_huf || 0;
        break;
      case 'wealth':
        valueA = calculateTotalWealth(a) - calculateTotalDebt(a); // Net wealth
        valueB = calculateTotalWealth(b) - calculateTotalDebt(b); // Net wealth
        break;
      default:
        return 0;
    }

    if (valueA === valueB) return 0;
    
    // For string values
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB, 'hu') 
        : valueB.localeCompare(valueA, 'hu');
    }
    
    // For numeric values - ensure they are numbers before subtraction
    // Convert potential undefined values to 0
    const numA = typeof valueA === 'number' ? valueA : 0;
    const numB = typeof valueB === 'number' ? valueB : 0;
    return sortDirection === 'asc' ? numA - numB : numB - numA;
  });
  
  // No filtering, show all MPs
  const filteredMps = sortedMps;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <header className="bg-blue-700 py-6 shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Neked Dolgoznak</h1>
              <p className="text-blue-100 mt-2">Magyar képviselők vagyonnyilatkozatainak vizualizációja</p>
            </div>
            <p className="text-blue-100 mt-2 md:mt-0 text-xs md:text-sm md:text-right max-w-sm md:max-w-md">
              <span className="font-medium">Figyelem:</span> Az adatok mesterséges intelligencia segítségével kerültek kinyerhetősre. Bár manuálisan javítottunk rajta, továbbra is tartalmazhatnak pontatlanságokat.
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-8">
            <Card>
              <CardContent className="p-3 md:p-6">
                {loading ? (
                  <div className="text-center py-8">Adatok betöltése...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="w-full">
                      <TableCaption className="text-sm md:text-base">Magyar országgyűlési képviselők vagyonnyilatkozatai - {filteredMps.length} képviselő</TableCaption>
                      <TableHeader>
                        <TableRow className="text-xs md:text-sm">
                          <TableHead className="w-8"></TableHead>
                          <TableHead className="cursor-pointer px-2 md:px-4" onClick={() => handleSort('name')}>
                            Név {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-right px-2 md:px-4" onClick={() => handleSort('properties')}>
                            Ingatlanok {sortField === 'properties' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-right px-2 md:px-4" onClick={() => handleSort('vehicles')}>
                            Járművek {sortField === 'vehicles' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-right px-2 md:px-4" onClick={() => handleSort('wealth')}>
                            <span className="hidden md:inline">Összvagyon (kiv. ingatlanok, járművek)</span>
                            <span className="md:hidden">Összvagyon</span> {sortField === 'wealth' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                          <TableHead className="cursor-pointer text-right px-2 md:px-4" onClick={() => handleSort('debts')}>
                            Tartozások {sortField === 'debts' && (sortDirection === 'asc' ? '↑' : '↓')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMps.map((mp, index) => (
                          <React.Fragment key={index}>
                            <TableRow
                              className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={() => toggleExpand(mp.nyilatkozattevo_nev)}
                              key={`row-${index}`}
                            >
                              <TableCell className="w-8 p-2">
                                <div className="inline-flex h-6 w-6 items-center justify-center text-gray-400">
                                  {expandedMp === mp.nyilatkozattevo_nev ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-medium py-3 md:py-4">{mp.nyilatkozattevo_nev}</TableCell>
                              <TableCell className="tabular-nums text-right py-3 md:py-4">{countPropertiesOrZero(mp.vagyonyi_nyilatkozat?.ingatlanok)} db</TableCell>
                              <TableCell className="tabular-nums text-right py-3 md:py-4">{countPropertiesOrZero(mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek)} db</TableCell>
                              <TableCell className="tabular-nums text-right py-3 md:py-4">{formatCurrency(totalOtherVagyonErtek(mp).total)}</TableCell>
                              <TableCell className="tabular-nums text-right py-3 md:py-4">{formatCurrency(
                                sumHitelekOrZero(mp.vagyonyi_nyilatkozat?.tartozasok?.hitelintezettel_szembeni_tartozasok) + 
                                sumHitelekOrZero(mp.vagyonyi_nyilatkozat?.tartozasok?.maganszemelyekkel_szembeni_tartozasok)
                              )}</TableCell>
                            </TableRow>

                            {expandedMp === mp.nyilatkozattevo_nev && (
                              <TableRow key={`details-${index}`} className="hover:bg-transparent">
                                <TableCell colSpan={6} className="p-0">
                                  <div className="bg-gray-100 dark:bg-gray-800 pt-3 pb-4 border-t border-b border-gray-200 dark:border-gray-700">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 px-4 md:px-6">
                                      <div>
                                        <h4 className="font-medium mb-3 text-sm md:text-base">Vagyon részletezése</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 md:p-4 shadow-sm">
                                          {/* Display wealth types from totalOtherVagyonErtek with more details */}
                                          {Object.entries(totalOtherVagyonErtek(mp).breakdown)
                                            .filter(([, value]) => value > 0)
                                            .map(([key, value]) => {
                                              // Get more details based on the wealth type
                                              let details: React.ReactNode[] = [];
                                              
                                              if (key === 'ertekpapirok' && mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.ertekpapir_vagy_egyeb_befektetes?.length) {
                                                details = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.ertekpapir_vagy_egyeb_befektetes?.map((item: ErtekpapirBefektetes, i: number) => (
                                                  <div key={`ertekpapir-${i}`} className="text-xs text-gray-500 ml-4 mt-1 break-words whitespace-normal hyphens-auto w-full block overflow-hidden">
                                                    {item.tipus && item.tipus.toLowerCase() !== 'egyéb' && `${item.tipus}`}{item.kibocsato ? `${item.tipus && item.tipus.toLowerCase() !== 'egyéb' ? ' - ' : ''}${item.kibocsato}` : ''}{item.nevertek ? ` (${formatCurrency(item.nevertek)})` : ''}
                                                  </div>
                                                ));
                                              } else if (key === 'egyeb_ingosag' && mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.egyeb_ingosag_5m_felett?.length) {
                                                details = mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.egyeb_ingosag_5m_felett?.map((item: EgyebIngo, i: number) => (
                                                  <div key={`egyeb-ingo-${i}`} className="text-xs text-gray-500 ml-4 mt-1 break-words whitespace-normal hyphens-auto w-full overflow-hidden">
                                                    {item.megnevezes}{item.ertek_huf ? ` (${formatCurrency(item.ertek_huf)})` : ''}
                                                  </div>
                                                ));
                                              } else if (key === 'vedett_mualkotasok' && mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.vedett_mualkotas_es_gyujtemeny?.length) {
                                                details = mp.vagyonyi_nyilatkozat.nagy_erteku_ingok.vedett_mualkotas_es_gyujtemeny.map((item, i: number) => (
                                                  <div key={`mualkotasok-${i}`} className="text-xs text-gray-500 ml-4 mt-1 break-words whitespace-normal hyphens-auto w-full overflow-hidden">
                                                    {item.megnevezes}{item.tipus ? ` (${item.tipus})` : ''}{item.ertek_huf ? ` - ${formatCurrency(item.ertek_huf)}` : ''}
                                                  </div>
                                                ));
                                              }
                                              
                                              return (
                                                <div key={key} className="text-sm py-1.5">
                                                  <div className="flex justify-between">
                                                    <span className="text-sm">{getBreakdownLabel(key)}</span>
                                                    <span className="tabular-nums font-medium text-sm">{formatCurrency(value)}</span>
                                                  </div>
                                                  {details}
                                                </div>
                                              );
                                            })}
                                          
                                          {/* Add vehicle values to the wealth breakdown with details if they exist */}
                                          {(mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || []).length > 0 && 
                                          (mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || []).some(jarmu => jarmu.ertek_huf) && (
                                            <div className="text-sm py-1.5">
                                              <div className="flex justify-between">
                                                <span className="text-sm">Járművek értéke</span>
                                                <span className="tabular-nums font-medium text-sm">{formatCurrency((mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || []).reduce((sum, jarmu) => sum + (jarmu.ertek_huf || 0), 0))}</span>
                                              </div>
                                              {/* Vehicle details */}
                                              {mp.vagyonyi_nyilatkozat.nagy_erteku_ingok.gepjarmuvek.map((jarmu, i: number) => (
                                                <div key={`jarmu-${i}`} className="text-xs text-gray-500 ml-4 mt-1">
                                                  {jarmu.marka} {jarmu.modell || ''} {jarmu.gyartasi_ev ? ` (${jarmu.gyartasi_ev})` : ''} {jarmu.tipus ? `- ${jarmu.tipus}` : ''} {jarmu.ertek_huf ? ` - ${formatCurrency(jarmu.ertek_huf)}` : ''}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                            
                                          {/* Total wealth - just assets, not net */}
                                          <div className="flex justify-between text-sm py-2 font-bold border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                                            <span className="text-sm">Összes vagyon</span>
                                            <span className="tabular-nums text-sm">{formatCurrency(calculateTotalWealth(mp))}</span>
                                          </div>
                                        </div>
                                        
                                        {/* Debt details section - always shown */}
                                        <h4 className="font-medium mb-3 mt-5 text-sm md:text-base">Tartozások részletezése</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 md:p-4 shadow-sm">
                                          {/* Bank Debts */}
                                          {(mp.vagyonyi_nyilatkozat?.tartozasok?.hitelintezettel_szembeni_tartozasok || []).length > 0 && (
                                            <>
                                              <h5 className="text-xs font-medium mb-1">Hitelintézettel szembeni tartozások</h5>
                                              {(mp.vagyonyi_nyilatkozat?.tartozasok?.hitelintezettel_szembeni_tartozasok || []).map((tartozas, idx) => (
                                                <div key={`bank-debt-${idx}`} className="text-sm py-1.5 border-b last:border-0">
                                                  <div className="flex flex-col sm:flex-row sm:justify-between">
                                                    <span className={`break-words whitespace-normal hyphens-auto w-full text-sm ${!tartozas.hitelező ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                                                      {tartozas.hitelező || 'Ismeretlen hitelező'}
                                                    </span>
                                                    <span className="tabular-nums font-medium sm:ml-4 text-sm mt-1 sm:mt-0">{formatCurrency(tartozas.osszeg_huf)}</span>
                                                  </div>
                                                </div>
                                              ))}
                                              {(mp.vagyonyi_nyilatkozat?.tartozasok?.maganszemelyekkel_szembeni_tartozasok || []).length > 0 && <div className="my-2"></div>}
                                            </>
                                          )}
                                          
                                          {/* Private Debts */}
                                          {(mp.vagyonyi_nyilatkozat?.tartozasok?.maganszemelyekkel_szembeni_tartozasok || []).length > 0 && (
                                            <>
                                              <h5 className="text-xs font-medium mb-1">Magánszemélyekkel szembeni tartozások</h5>
                                              {(mp.vagyonyi_nyilatkozat?.tartozasok?.maganszemelyekkel_szembeni_tartozasok || []).map((tartozas, idx) => (
                                                <div key={`private-debt-${idx}`} className="text-sm py-1 border-b last:border-0">
                                                  <div className="flex flex-col sm:flex-row sm:justify-between">
                                                    <span className={`break-words whitespace-normal hyphens-auto w-full text-sm ${!tartozas.hitelező ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                                                      {tartozas.hitelező || 'Ismeretlen hitelező'}
                                                    </span>
                                                    <span className="tabular-nums font-medium sm:ml-4 text-sm mt-1 sm:mt-0">{formatCurrency(tartozas.osszeg_huf)}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </>
                                          )}
                                          
                                          {/* Total debts or No debts message */}
                                          {calculateTotalDebt(mp) > 0 ? (
                                            <div className="flex justify-between text-sm py-1 font-bold border-t border-gray-200 dark:border-gray-600 mt-1 pt-1">
                                              <span>Összes tartozás</span>
                                              <span className="tabular-nums">{formatCurrency(calculateTotalDebt(mp))}</span>
                                            </div>
                                          ) : (
                                            <div className="text-sm text-gray-500 p-2">Nincsenek tartozások</div>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-medium mb-3 text-sm md:text-base">Ingatlanok (építmények, lakóházak)</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 shadow-sm overflow-auto break-words" style={{ maxHeight: '300px' }}>
                                          {(mp.vagyonyi_nyilatkozat?.ingatlanok || []).filter(ingatlan => !ingatlan.szantofold).length > 0 ? (
                                            (mp.vagyonyi_nyilatkozat?.ingatlanok || [])
                                              .filter(ingatlan => !ingatlan.szantofold)
                                              .map((ingatlan, idx) => (
                                                <div key={`property-${idx}`} className="text-sm border-b last:border-0 py-2">
                                                  <div className="font-medium break-words">{ingatlan.telepules || '?'} {ingatlan.tipus ? `(${ingatlan.tipus})` : ''}</div>
                                                  {ingatlan.alapterulet_m2 && ingatlan.alapterulet_m2 > 0 && <div>Alaptérület: {ingatlan.alapterulet_m2} m²</div>}
                                                  {ingatlan.terulet_m2 !== undefined && ingatlan.terulet_m2 !== null && ingatlan.terulet_m2 > 0 && <div>Terület: {ingatlan.terulet_m2} m²</div>}
                                                  {ingatlan.tulajdoni_hanyad !== undefined && ingatlan.tulajdoni_hanyad !== null && <div>Tulajdoni hányad: {(ingatlan.tulajdoni_hanyad * 100).toFixed(0)}%</div>}
                                                  {ingatlan.szerzes_jogcime && <div>Szerzés jogcíme: {ingatlan.szerzes_jogcime}</div>}
                                                  {ingatlan.szerzes_datuma && <div>Szerzés ideje: {ingatlan.szerzes_datuma}</div>}
                                                </div>
                                            ))
                                          ) : (
                                            <div className="text-sm text-gray-500 p-2">Nincsenek építmények, lakóházak</div>
                                          )}
                                        </div>
                                        
                                        <h4 className="font-medium mb-3 mt-4 text-sm md:text-base">Mezőgazdasági területek</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 shadow-sm overflow-auto break-words" style={{ maxHeight: '300px' }}>
                                          {(mp.vagyonyi_nyilatkozat?.ingatlanok || []).filter(ingatlan => ingatlan.szantofold).length > 0 ? (
                                            (mp.vagyonyi_nyilatkozat?.ingatlanok || [])
                                              .filter(ingatlan => ingatlan.szantofold)
                                              .map((ingatlan, idx) => (
                                                <div key={`ag-land-${idx}`} className="text-sm border-b last:border-0 py-2">
                                                  <div className="font-medium">{ingatlan.telepules || '?'}</div>
                                                  {/* Agricultural properties don't show area */}
                                                  {ingatlan.tulajdoni_hanyad !== undefined && ingatlan.tulajdoni_hanyad !== null && <div>Tulajdoni hányad: {(ingatlan.tulajdoni_hanyad * 100).toFixed(0)}%</div>}
                                                  {ingatlan.szerzes_jogcime && <div>Szerzés jogcíme: {ingatlan.szerzes_jogcime}</div>}
                                                  {ingatlan.szerzes_datuma && <div>Szerzés ideje: {ingatlan.szerzes_datuma}</div>}
                                                </div>
                                            ))
                                          ) : (
                                            <div className="text-sm text-gray-500 p-2">Nincsenek mezőgazdasági területek</div>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-medium mb-3 text-sm md:text-base">Járművek</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-2 shadow-sm overflow-auto break-words" style={{ maxHeight: '300px' }}>
                                          {(mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || []).length > 0 ? (
                                            (mp.vagyonyi_nyilatkozat?.nagy_erteku_ingok?.gepjarmuvek || []).map((jarmu, idx) => (
                                              <div key={`vehicle-${idx}`} className="text-sm border-b last:border-0 py-2">
                                                <div className="font-medium break-words">{jarmu.marka || '?'} {jarmu.modell || ''} {jarmu.tipus ? `- ${jarmu.tipus}` : ''} {jarmu.gyartasi_ev ? ` (${jarmu.gyartasi_ev})` : ''}</div>
                                                {jarmu.szerzes_jogcime && <div>Szerzés jogcíme: {jarmu.szerzes_jogcime}</div>}
                                                {jarmu.szerzes_datuma && <div>Szerzés ideje: {jarmu.szerzes_datuma}</div>}
                                                {jarmu.ertek_huf && <div>Értéke: {formatCurrency(jarmu.ertek_huf)}</div>}
                                              </div>
                                            ))
                                          ) : (
                                            <div className="text-sm text-gray-500 p-2">Nincsenek járművek</div>
                                          )}
                                        </div>
                                      </div>
                                      
                                    </div>

                                    {/* Add Egyeb Kozlendok section if it exists - spans entire row */}
                                    {mp.vagyonyi_nyilatkozat?.egyeb_kozlendok && mp.vagyonyi_nyilatkozat.egyeb_kozlendok.length > 0 && (
                                      <div className="mt-4 px-4 col-span-3">
                                        <h4 className="font-medium mb-2 text-sm">Egyéb közlendők</h4>
                                        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm overflow-auto">
                                          {mp.vagyonyi_nyilatkozat.egyeb_kozlendok.map((kozlendo, idx) => (
                                            <div key={`kozlendo-${idx}`} className="text-sm py-1 break-words whitespace-normal hyphens-auto w-full overflow-hidden">
                                              {kozlendo}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </main>

      <footer className="bg-slate-100 dark:bg-slate-800 py-6 md:py-8 text-center">
        <div className="container mx-auto px-4">
          <p className="text-slate-600 dark:text-slate-400">Adatvizualizáció az országgyűlési képviselők vagyonnyilatkozatairól</p>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Adatok forrása: <a href="https://www.parlament.hu/documents/d/guest/kepviselok_20250228" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">parlament.hu</a>
          </p>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            A teljes adatbázis JSON formátumban elérhető a <a href="/data/data.json" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">/data/data.json</a> címen
          </p>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Készítette: <a href="https://gaz.so" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Gazsó Kristóf</a>
          </p>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Ha hibás adatokat találsz, módosítást javasolhatsz a <Link href="https://github.com/kristofgazso/neked-dolgoznak/edit/main/frontend/public/data/data.json" className="text-blue-600 dark:text-blue-400 hover:underline">következő oldalon</Link>.
          </p>
        </div>
      </footer>
    </div>
  );
}
