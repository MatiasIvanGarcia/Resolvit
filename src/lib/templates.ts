export type TemplateOption = {
  label: string;
  image_url?: string;
};

export type TemplateQuestion = {
  title: string;
  subtitle: string;
  options: TemplateOption[];
};

export type Template = {
  id: string;
  title: string;
  personName: string;
  emoji: string;
  description: string;
  seasonalTag: string;
  seasonalMonth: number;
  seasonalDay: number;
  backgroundImageUrl?: string;
  questions: TemplateQuestion[];
  inviteTitleTemplate: string;
  inviteBodyTemplate: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "valentines",
    title: "San Valentín",
    personName: "Mi amor",
    emoji: "\u2764\uFE0F",
    description: "Un plan romántico para elegir juntos cómo celebrar.",
    seasonalTag: "San Valentín",
    seasonalMonth: 2,
    seasonalDay: 14,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Cómo empezamos el día?",
        options: [
          { label: "Desayuno en cama" },
          { label: "Cena a la luz de las velas" },
          { label: "Paseo al atardecer" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Qué regalo te sorprende más?",
        options: [
          { label: "Carta escrita a mano" },
          { label: "Un experience juntos" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Cómo cerramos la noche?",
        options: [
          { label: "Película y mantas" },
          { label: "Música y vino" },
        ],
      },
    ],
    inviteTitleTemplate: "Te invito #persona a que pasemos #plan juntos",
    inviteBodyTemplate: "Hola #persona!!\n\n¿Te copás a #decision1?\n\n#decision2 y después #decision3 😄",
  },
  {
    id: "fathers-day",
    title: "Día del Padre",
    personName: "Papá",
    emoji: "\uD83C\uDF93",
    description: "Armá un plan especial para papá.",
    seasonalTag: "Día del Padre",
    seasonalMonth: 6,
    seasonalDay: 15,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Qué le preparás de desayuno?",
        options: [
          { label: "Pancakes con frutas" },
          { label: "Tostadas con palta" },
          { label: "Medialunas de la esquina" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Cómo siguen el dia?",
        options: [
          { label: "Asado en familia" },
          { label: "Partido de fútbol" },
        ],
      },
    ],
    inviteTitleTemplate: "¡Feliz día, #persona! Vamos a #plan",
    inviteBodyTemplate: "Hola #persona!\n\nArrangemos #decision1 y después #decision2 🎉",
  },
  {
    id: "world-cup",
    title: "Mundial 2026",
    personName: "",
    emoji: "\u26BD",
    description: "Creá tu plan para ver los partidos con amigos.",
    seasonalTag: "Mundial 2026",
    seasonalMonth: 6,
    seasonalDay: 11,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Dónde miramos el partido?",
        options: [
          { label: "Casa con asado" },
          { label: "Bar con amigos" },
          { label: "En el estadio" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Qué comida no puede faltar?",
        options: [
          { label: "Empanadas" },
          { label: "Pizza" },
          { label: "Choripán" },
        ],
      },
    ],
    inviteTitleTemplate: "¡Vamos! #plan para ver el partido",
    inviteBodyTemplate: "Hola #persona!\n\nVamos a #decision1 y comemos #decision2 ⚽",
  },
  {
    id: "christmas",
    title: "Navidad",
    personName: "",
    emoji: "\uD83C\uDF84",
    description: "Planificá la cena de Navidad con quienes más querés.",
    seasonalTag: "Navidad",
    seasonalMonth: 12,
    seasonalDay: 25,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Cena principal?",
        options: [
          { label: "Vitel toné" },
          { label: "Pavo al horno" },
          { label: "Lechón" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Postre?",
        options: [
          { label: "Pan dulce" },
          { label: "Torta helada" },
        ],
      },
    ],
    inviteTitleTemplate: "¡Feliz Navidad! #plan para compartir",
    inviteBodyTemplate: "Hola #persona!\n\nEste año #decision1 de plato principal y #decision2 de postre 🎄",
  },
  {
    id: "new-year",
    title: "Año Nuevo",
    personName: "",
    emoji: "\uD83C\uDF89",
    description: "Definí cómo van a recibir el año juntos.",
    seasonalTag: "Año Nuevo",
    seasonalMonth: 12,
    seasonalDay: 31,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Dónde estamos a las 12?",
        options: [
          { label: "Fiesta en terraza" },
          { label: "Cena íntima en casa" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Brindamos con?",
        options: [
          { label: "Champagne" },
          { label: "Sidra" },
          { label: "Cerveza artesanal" },
        ],
      },
    ],
    inviteTitleTemplate: "¡A celebrar! #plan para recibir el año",
    inviteBodyTemplate: "Hola #persona!\n\nArrancamos con #decision1 y brindamos con #decision2 \uD83C\uDF89",
  },
  {
    id: "birthday",
    title: "Cumpleaños",
    personName: "",
    emoji: "\uD83C\uDF82",
    description: "Armá el plan perfecto para el cumple.",
    seasonalTag: "Cumpleaños",
    seasonalMonth: 0,
    seasonalDay: 0,
    backgroundImageUrl: undefined,
    questions: [
      {
        title: "¿Qué preferís?",
        subtitle: "¿Cómo empezamos?",
        options: [
          { label: "Sorpresa a la mañana" },
          { label: "Regalo a la noche" },
        ],
      },
      {
        title: "¿Qué preferís?",
        subtitle: "¿Qué hacemos?",
        options: [
          { label: "Cena tranqui" },
          { label: "Fiesta con amigos" },
          { label: "Escape room" },
        ],
      },
    ],
    inviteTitleTemplate: "¡Feliz cumple! #plan para tu dia",
    inviteBodyTemplate: "Hola #persona!\n\nEmpezamos con #decision1 y seguimos con #decision2 \uD83C\uDF82",
  },
];

export function getSeasonalTemplates(): Template[] {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();

  const sorted = TEMPLATES.map((t) => {
    if (t.seasonalMonth === 0) return { template: t, daysAway: 999 };
    let target = new Date(now.getFullYear(), t.seasonalMonth - 1, t.seasonalDay);
    if (target < now) {
      target = new Date(now.getFullYear() + 1, t.seasonalMonth - 1, t.seasonalDay);
    }
    const daysAway = Math.floor((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { template: t, daysAway };
  }).sort((a, b) => a.daysAway - b.daysAway);

  const upcoming = sorted.filter((t) => t.daysAway <= 45 || t.template.seasonalMonth === 0);
  if (upcoming.length >= 4) return upcoming.slice(0, 4).map((t) => t.template);

  const rest = sorted
    .filter((t) => !upcoming.includes(t))
    .map((t) => t.template);
  return [...upcoming.map((t) => t.template), ...rest].slice(0, 4);
}

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}