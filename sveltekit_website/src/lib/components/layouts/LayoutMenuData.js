const Navdata = [
  {
    label: 'Menu',
    isHeader: true,
  },
  {
    id: "corsi",
    label: "Corsi",
    icon: "ri-book-open-line",
    link: "/corsi",
    stateVariables: "isCorsi",
    subItems: [
      {
        id: "lista-corsi",
        label: "Lista corsi",
        link: "/corsi",
        parentId: "corsi",
      },
      {
        id: "aggiungi-corso",
        label: "Aggiungi corso",
        link: "/corsi/aggiungi",
        parentId: "corsi",
      },
    ],
  },
  {
    id: "studenti",
    label: "Studenti",
    icon: "ri-user-2-line",
    link: "/studenti",
    roles: ["developer", "professor"],
    stateVariables: "isStudenti",
    subItems: [
      {
        id: "lista-studenti",
        label: "Lista Studenti",
        link: "/studenti",
        parentId: "studenti",
      },
      {
        id: "aggiungi-studente",
        label: "Aggiungi studente",
        link: "/studenti/aggiungi",
        parentId: "studenti",
        roles: ["developer"],
      },
    ],
  },
  {
    id: "support",
    label: "Supporto",
    icon: "ri-mail-send-line",
    link: "/supporto",
    stateVariables: "isSupport",
    subItems: [
      {
        id: "apri-ticket-supporto",
        label: "Apri ticket",
        link: "/supporto",
        parentId: "support",
      },
      {
        id: "gestione-ticket-supporto",
        label: "Gestione ticket",
        link: "/supporto/gestione",
        parentId: "support",
        adminOnly: true,
      },
    ],
  },
];

const MOCK_DATA = {
  Navdata,
};

export default MOCK_DATA;
