/**
 * The 16 Local Government Areas (LGAs) of Ekiti State, Nigeria.
 * This is the single source of truth for LGA values throughout the application.
 */
export const EKITI_LGAS = [
  'Ado-Ekiti',
  'Ikere',
  'Oye',
  'Ikole',
  'Ekiti East',
  'Ekiti West',
  'Emure',
  'Ise/Orun',
  'Irepodun/Ifelodun',
  'Ijero',
  'Efon',
  'Ekiti South-West',
  'Gbonyin',
  'Ido-Osi',
  'Moba',
  'Ilejemeje',
] as const;

export type EkitiLGA = (typeof EKITI_LGAS)[number];
