import { z } from 'zod';

// Ingatlan schema
const IngatlanSchema = z.object({
  telepules: z.string(),
  terulet_m2: z.number().nullable(),
  muvelesi_ag: z.string().nullable(),
  szantofold: z.boolean(),
  jogi_jelleg: z.string().nullable(),
  szerzes_jogcime: z.string().nullable(),
  tulajdoni_hanyad: z.number().nullable(),
  szerzes_datuma: z.string().nullable(),
  tipus: z.string().nullable(),
  alapterulet_m2: z.number().nullable(),
});

// Gepjarmu schema
const GepjarmuSchema = z.object({
  tipus: z.string().nullable(),
  marka: z.string().nullable(),
  modell: z.string().nullable(),
  gyartasi_ev: z.number().nullish(),
  szerzes_jogcime: z.string().nullable(),
  szerzes_datuma: z.string().nullable(),
  ertek_huf: z.number().nullable(),
});

// VedettMualkotas schema
const VedettMualkotasSchema = z.object({
  megnevezes: z.string(),
  tipus: z.string().nullable(),
  darabszam: z.number().nullable(),
  szerzes_jogcime: z.string().nullable(),
  szerzes_datuma: z.string().nullable(),
  ertek_huf: z.number().nullable(),
});

// EgyebIngo schema
const EgyebIngoSchema = z.object({
  megnevezes: z.string(),
  szerzes_jogcime: z.string().nullable(),
  szerzes_datuma: z.string().nullable(),
  ertek_huf: z.number().nullable(),
});

// ErtekpapirBefektetes schema
const ErtekpapirBefektetesSchema = z.object({
  tipus: z.string().nullable(),
  kibocsato: z.string().nullable(),
  nevertek: z.number().nullable(),
  penznem: z.string().nullable(),
});

// Tartozas schema
const TartozasSchema = z.object({
  hitelező: z.string().nullable(),
  osszeg_huf: z.number().nullable(),
  penznem: z.string().nullable(),
});

// Tartozasok schema
const TartozasokSchema = z.object({
  koztartozas: z.number().nullable(),
  hitelintezettel_szembeni_tartozasok: z.array(TartozasSchema).nullable().default([]),
  maganszemelyekkel_szembeni_tartozasok: z.array(TartozasSchema).nullable().default([]),
}).default({ koztartozas: null, hitelintezettel_szembeni_tartozasok: [], maganszemelyekkel_szembeni_tartozasok: [] });

// Define JovedelemSchema (simplified to nullable object as it's complex and not critical for current display)
const JovedelemSchema = z.object({
  dijazas_nelkuli: z.boolean().optional().default(false),
  jovedelmi_kategoria_1: z.boolean().optional().default(false),
  jovedelmi_kategoria_2: z.boolean().optional().default(false),
  jovedelmi_kategoria_3: z.boolean().optional().default(false),
  jovedelmi_kategoria_4: z.boolean().optional().default(false),
  jovedelmi_kategoria_5: z.boolean().optional().default(false),
  jovedelem_huf: z.number().nullish(),
});

// Foglalkozas schema
const FoglalkozasSchema = z.object({
  foglalkozas_megbizas_tisztseg: z.string().nullable(),
  szervezet: z.string().nullable(),
  jovedelem: JovedelemSchema,
  dijazas_nelkuli: z.boolean().optional(),
  jovedelmi_kategoria_1: z.boolean().optional(),
  jovedelmi_kategoria_2: z.boolean().optional(),
  jovedelmi_kategoria_3: z.boolean().optional(),
  jovedelmi_kategoria_4: z.boolean().optional(),
  jovedelmi_kategoria_5: z.boolean().optional(),
  jovedelem_huf: z.number().nullish(),
});

// AlkalmiJovedelem schema
const AlkalmiJovedelemSchema = z.object({
  tevekenyseg: z.string().nullable(),
  szervezet: z.string().nullable(),
  jovedelem: JovedelemSchema,
  dijazas_nelkuli: z.boolean().optional(),
  jovedelmi_kategoria_1: z.boolean().optional(),
  jovedelmi_kategoria_2: z.boolean().optional(),
  jovedelmi_kategoria_3: z.boolean().optional(),
  jovedelmi_kategoria_4: z.boolean().optional(),
  jovedelmi_kategoria_5: z.boolean().optional(),
  jovedelem_huf: z.number().nullish(),
});

// JovedelemNyilatkozat schema
const JovedelemNyilatkozatSchema = z.object({
  elozo_3_ev_foglalkozasai: z.array(FoglalkozasSchema).default([]),
  aktualis_foglalkozasok: z.array(FoglalkozasSchema).default([]),
  alkalmi_jovedelem_2m_felett: z.array(AlkalmiJovedelemSchema).default([]),
});

// Tagsag schema
const TagsagSchema = z.object({
  tagsag_tisztseg: z.string().nullable(),
  szervezet: z.string().nullable(),
  gazdasagi_tarsasag_formaja: z.string().nullish(),
  nyeresegeseg: z.string().nullish(),
});

// GazdasagiErdekeltseget schema
const GazdasagiErdekeltsegetSchema = z.object({
  cegnev: z.string().nullish(),
  szekhelye: z.string().nullish(),
  gazdasagi_tarsasag_formaja: z.string().nullish(),
  erdekeltseg_formaja: z.string().nullish(),
  nyeresegeseg: z.string().nullish(),
});

// GazdasagiErdekeltsegiNyilatkozat schema
const GazdasagiErdekeltsegiNyilatkozatSchema = z.object({
  tagsag_vagy_tisztseg_gazdalkodo_szervezetben: z.array(TagsagSchema).default([]),
  befolyassal_biro_gazdasagi_erdekeltsegek: z.array(GazdasagiErdekeltsegetSchema).default([]),
});

// NagyErtekuIngok schema
export const NagyErtekuIngokSchema = z.object({
  gepjarmuvek: z.array(GepjarmuSchema).optional().default([]),
  vedett_mualkotas_es_gyujtemeny: z.array(VedettMualkotasSchema).optional().default([]),
  egyeb_ingosag_5m_felett: z.array(EgyebIngoSchema).optional().default([]),
  ertekpapir_vagy_egyeb_befektetes: z.array(ErtekpapirBefektetesSchema).optional().default([]),
  keszpenz: z.object({
    osszeg_huf: z.number().nullable().default(0),
  }).nullish().default({ osszeg_huf: 0 }),
  takarekbetetben_elhelyezett_megtakaritas: z.object({
    osszeg_huf: z.number().nullable().default(0),
  }).nullish().default({ osszeg_huf: 0 }),
  hitelintezeti_szamlakoveteles: z.object({
    forintban_huf: z.number().nullable().default(0),
    devizaban_forinterteken_huf: z.number().nullable().default(0),
    hitelintezeti_szamlakoveteles_huf: z.number().nullable().default(0),
  }).nullish().default({
    forintban_huf: 0,
    devizaban_forinterteken_huf: 0,
    hitelintezeti_szamlakoveteles_huf: 0,
  }),
  mas_szerzodes_alapjan_fennallo_penzkoveteles_osszege_huf: z.number().nullish(),
});

// VagyonyiNyilatkozat schema
export const VagyonyiNyilatkozatSchema = z.object({
  ingatlanok: z.array(IngatlanSchema).default([]),
  nagy_erteku_ingok: NagyErtekuIngokSchema,
  tartozasok: TartozasokSchema,
  egyeb_kozlendok: z.array(z.string()).default([]),
});

// MPDeclaration schema
export const MPDeclarationSchema = z.object({
  nyilatkozattevo_nev: z.string(),
  vagyonyi_nyilatkozat: VagyonyiNyilatkozatSchema,
  jovedelemnyilatkozat: JovedelemNyilatkozatSchema.default({}),
  gazdasagi_erdekeltsegi_nyilatkozat: GazdasagiErdekeltsegiNyilatkozatSchema.default({}),
  data_not_extracted_explanation: z.string().nullish(),
  source_file: z.string(),
});

// Export inferred types
export type MPDeclarationZ = z.infer<typeof MPDeclarationSchema>;
export type VagyonyiNyilatkozatZ = z.infer<typeof VagyonyiNyilatkozatSchema>;
export type NagyErtekuIngokZ = z.infer<typeof NagyErtekuIngokSchema>;

// Export an array schema for the API response
export const MPDeclarationsArraySchema = z.array(MPDeclarationSchema);
export type MPDeclarationsArray = z.infer<typeof MPDeclarationsArraySchema>;
