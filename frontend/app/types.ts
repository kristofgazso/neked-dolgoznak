// Data types for MP declarations

export interface MPDeclaration {
  nyilatkozattevo_nev: string;
  vagyonyi_nyilatkozat: VagyonyiNyilatkozat;
  jovedelemnyilatkozat: JovedelemNyilatkozat;
  gazdasagi_erdekeltsegi_nyilatkozat: GazdasagiErdekeltsegiNyilatkozat;
  data_not_extracted_explanation: string | null;
  source_file: string;
}

export interface VagyonyiNyilatkozat {
  ingatlanok: Ingatlan[];
  nagy_erteku_ingok: NagyErtekuIngok;
  tartozasok: Tartozasok;
  egyeb_kozlendok: string[];
}

export interface Ingatlan {
  telepules: string;
  terulet_m2: number | null;
  muvelesi_ag: string | null;
  szantofold: boolean;
  jogi_jelleg: string | null;
  szerzes_jogcime: string | null;
  tulajdoni_hanyad: number | null;
  szerzes_datuma: string | null;
  tipus: string | null;
  alapterulet_m2: number | null;
}

export interface NagyErtekuIngok {
  gepjarmuvek: Gepjarmu[];
  vedett_mualkotasok_gyujtemenyek: VedettMualkotas[];
  egyeb_ingok: EgyebIngo[];
  ertekpapir_vagy_egyeb_befektetes: ErtekpapirBefektetes[];
  takarekbetetben_elhelyezett_megtakaritas: { osszeg_huf: number | null };
  keszpenz: { osszeg_huf: number | null };
  hitelintezeti_szamlakoveteles: {
    hitelintezeti_szamlakoveteles_huf: number | null;
    forintban_huf: number | null;
    devizaban_forinterteken_huf: number | null;
  };
  mas_vagyontargyak: string[];
}

export interface Gepjarmu {
  tipus: string | null;
  marka: string | null;
  modell: string | null;
  gyartasi_ev: number | null;
  szerzes_jogcime: string | null;
  szerzes_datuma: string | null;
  ertek_huf: number | null;
}

export interface VedettMualkotas {
  megnevezes: string;
  tipus: string | null;
  darabszam: number | null;
  szerzes_jogcime: string | null;
  szerzes_datuma: string | null;
  ertek_huf: number | null;
}

export interface EgyebIngo {
  megnevezes: string;
  szerzes_jogcime: string | null;
  szerzes_datuma: string | null;
  ertek_huf: number | null;
}

export interface ErtekpapirBefektetes {
  tipus: string | null;
  kibocsato: string | null;
  nevertek: number | null;
  penznem: string | null;
}

export interface Tartozasok {
  koztartozas: number | null;
  hitelintezettel_szembeni_tartozasok: Tartozas[];
  maganszemelyekkel_szembeni_tartozasok: Tartozas[];
}

export interface Tartozas {
  hitelező: string | null;
  osszeg_huf: number | null;
  penznem: string | null;
}

export interface JovedelemNyilatkozat {
  elozo_3_ev_foglalkozasai: Foglalkozas[];
  aktualis_foglalkozasok: Foglalkozas[];
  alkalmi_jovedelem_2m_felett: AlkalmiJovedelem[];
}

export interface Foglalkozas {
  foglalkozas_megbizas_tisztseg: string | null;
  szervezet: string | null;
  jovedelem: {
    dijazas_nelkuli: boolean;
    jovedelmi_kategoria_1: boolean;
    jovedelmi_kategoria_2: boolean;
    jovedelmi_kategoria_3: boolean;
    jovedelmi_kategoria_4: boolean;
    jovedelmi_kategoria_5: boolean;
    jovedelem_huf: number | null;
  };
}

export interface AlkalmiJovedelem {
  tevekenyseg: string | null;
  szervezet: string | null;
  jovedelem: {
    dijazas_nelkuli: boolean;
    jovedelmi_kategoria_1: boolean;
    jovedelmi_kategoria_2: boolean;
    jovedelmi_kategoria_3: boolean;
    jovedelmi_kategoria_4: boolean;
    jovedelmi_kategoria_5: boolean;
    jovedelem_huf: number | null;
  };
}

export interface GazdasagiErdekeltsegiNyilatkozat {
  tagsag_vagy_tisztseg_gazdalkodo_szervezetben: Tagsag[];
  befolyassal_biro_gazdasagi_erdekeltsegek: GazdasagiErdekeltseget[];
}

export interface Tagsag {
  tagsag_tisztseg: string | null;
  szervezet: string | null;
  gazdasagi_tarsasag_formaja: string | null;
  nyeresegeseg: string | null;
}

export interface GazdasagiErdekeltseget {
  cegnev: string | null;
  szekhelye: string | null;
  gazdasagi_tarsasag_formaja: string | null;
  erdekeltseg_formaja: string | null;
  nyeresegeseg: string | null;
}
