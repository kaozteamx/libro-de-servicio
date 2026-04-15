export type LinkRecord = {
  id: string;
  title: string;
  url: string;
  createdAt: number;
};

export type PeriodFolder = {
  id: string; // e.g., "2024-05"
  label: string; // e.g., "2024/05"
  records: LinkRecord[];
};

export type Category = {
  id: string;
  name: string;
  periods: PeriodFolder[];
};

export const INITIAL_DATA: Category[] = [
  {
    id: 'instalacion',
    name: 'Solicitudes de Instalación',
    periods: []
  },
  {
    id: 'preventivos',
    name: 'Solicitudes de Preventivos',
    periods: []
  },
  {
    id: 'correctivos',
    name: 'Solicitudes de Correctivos',
    periods: []
  },
  {
    id: 'reuniones',
    name: 'Reuniones',
    periods: []
  }
];
