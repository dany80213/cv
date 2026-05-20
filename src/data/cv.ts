export const cv = {
  name: "Daniele Porcaro",
  age: 18,
  location: "Torino, IT",
  email: "danielepto2@gmail.com",
  github: "dany80213",
  githubUrl: "https://github.com/dany80213",

  roles: {
    it: "Studente di Informatica",
    en: "Computer Science Student",
  },

  tagline: {
    it: "Appassionato di sviluppo web, hardware, networking e Bitcoin.",
    en: "Passionate about web development, hardware, networking and Bitcoin.",
  },

  about: {
    it: "Sono Daniele, 18 anni, studente al 4° anno di Informatica all'IIS J.C. Maxwell di Nichelino. Mi occupo di sviluppo web full-stack, self-hosting, robotica e sistemi embedded. Investo in Bitcoin, lavoro spesso con GPG/PGP e mi piace costruire progetti che usino hardware e software insieme.",
    en: "I'm Daniele, 18, a 4th-year Computer Science student at IIS J.C. Maxwell in Nichelino (Torino). I work in full-stack web development, self-hosting, robotics and embedded systems. I invest in Bitcoin, work with GPG/PGP and enjoy building projects that blend hardware and software.",
  },

  education: [
    {
      school: "IIS J.C. Maxwell",
      location: "Nichelino (TO)",
      degree: { it: "Diploma – Informatica e Telecomunicazioni", en: "High School Diploma – Computer Science & Telecommunications" },
      period: "2021 – 2027",
      current: true,
      highlights: {
        it: ["Voto 10 in Sistemi e Reti", "Voto 10 in TPSIT", "Voto 9–10 in Informatica"],
        en: ["Grade 10/10 in Networks & Systems", "Grade 10/10 in TPSIT", "Grade 9–10/10 in Computer Science"],
      },
    },
    {
      school: "Politecnico di Torino",
      location: "Torino",
      degree: { it: "Ingegneria Informatica (prevista)", en: "Computer Engineering (planned)" },
      period: "2027 →",
      current: false,
      highlights: { it: [], en: [] },
    },
  ],

  certifications: [
    {
      name: "Cypherpunk 2140 – Proof of Knowledge",
      issuer: { it: "IIS J.C. Maxwell / Progetto Futura (PNRR)", en: "IIS J.C. Maxwell / Futura Project (PNRR)" },
      date: "09/05/2025",
      verifiable: true,
      score: "74/80",
      certUrl: "https://www.jcmaxwell.it/cypherpunk2140",
      txid: "0203793396bbed6546055fb01f1e0e15d39268cb8f06d66c8ce058d0a27604ed",
      hash: "D8B2CBE9 FC4CD664 3D8F66D0 DB5AF87C 94C07A67 210FFE21 4C00AE98 A6B6C93F",
      signedText: `Istituto di Istruzione Superiore J. C. Maxwell
Via XXV Aprile 141, Nichelino (TO)

Corso "Cypherpunk 2140"
~ Proof of Knowledge ~
https://www.jcmaxwell.it/cypherpunk2140

Si certifica che lo studente

Daniele Porcaro, classe 3A INFO

in data 09/05/2025 ha superato l'esame di certificazione
del corso "Cypherpunk2140" con un punteggio di 74/80.
Questo certificato è emesso e firmato dal Prof. Marco Farina.

Nichelino, 17/05/2025`,
      gpgFingerprint: "44021BD1F34AE97188 9CF873C03EE33A2FFE9173",
      file: "cypherpunk2140.pdf",
    },
    {
      name: "Cambridge English C1 Advanced",
      issuer: { it: "Cambridge University Press & Assessment", en: "Cambridge University Press & Assessment" },
      date: { it: "Maggio 2026 (in corso)", en: "May 2026 (in progress)" },
      verifiable: false,
    },
    {
      name: "Cambridge English B1 Preliminary",
      issuer: { it: "Cambridge University Press & Assessment", en: "Cambridge University Press & Assessment" },
      date: "2022",
      verifiable: false,
    },
    {
      name: "CISCO – Introduction to Networks",
      issuer: { it: "Cisco Networking Academy", en: "Cisco Networking Academy" },
      date: "2024",
      verifiable: false,
    },
    {
      name: { it: "Patentino Robotica Industriale", en: "Industrial Robotics Certificate" },
      issuer: { it: "Comau S.p.A.", en: "Comau S.p.A." },
      date: "2024",
      verifiable: false,
    },
  ],

  competitions: [
    {
      name: { it: "GNI 2026 – Gara Nazionale di Informatica", en: "GNI 2026 – National Computer Science Competition" },
      role: { it: "Rappresentante d'istituto", en: "Institute representative" },
      note: { it: "Un solo studente selezionato per istituto a livello nazionale", en: "Only one student selected per institute nationwide" },
    },
  ],

  skills: {
    languages: [
      { name: "Python", level: 85 },
      { name: "JavaScript", level: 80 },
      { name: "PHP", level: 65 },
      { name: "SQL", level: 70 },
      { name: "HTML/CSS", level: 85 },
      { name: "TypeScript", level: 65 },
      { name: "PDL2 (Comau)", level: 60 },
    ],
    frameworks: ["React", "Vue.js", "Next.js", "Express", "FastAPI"],
    databases: ["PostgreSQL", "MySQL", "Prisma ORM"],
    devops: ["Git", "Docker", "Caddy", "VS Code", "Antigravity"],
    networking: ["TCP/IP", "Subnetting", "Routing & Switching", "MQTT", "UART", "Tasmota"],
    hardware: ["Arduino", "Raspberry Pi 5", "ESP32", "RF 433 MHz"],
    blockchain: ["Bitcoin", "OpenTimestamps", "GPG / PGP"],
    ai: ["Claude (Anthropic)", "Gemini (Google)", "ChatGPT (OpenAI)"],
  },

  languages: [
    { lang: "Italiano", level: { it: "Madrelingua", en: "Native" }, code: "C2" },
    { lang: "English", level: { it: "Avanzato – C1 in corso", en: "Advanced – C1 in progress" }, code: "C1" },
    { lang: "Español", level: { it: "Elementare", en: "Elementary" }, code: "A2" },
  ],

  projects: [
    {
      name: "alarm-system",
      description: {
        it: "Sistema antifurto self-hosted con sensori RF 433 MHz, bridge Tasmota/MQTT, REST API (FastAPI), dashboard web real-time e logica multi-zona.",
        en: "Self-hosted home alarm system with RF 433 MHz sensors, Tasmota/MQTT bridge, REST API (FastAPI), real-time web dashboard and multi-zone logic.",
      },
      tech: ["Python", "FastAPI", "MQTT", "Tasmota", "UART", "JavaScript", "RPi5"],
      url: "https://github.com/dany80213/alarm-system",
      featured: true,
    },
    {
      name: "Bitcoin Tracker – Axial Corona",
      description: {
        it: "Dashboard personale per Bitcoin con analisi tecnica avanzata (RSI, MACD, Fibonacci, ATR) e AI advisor integrato via Google Gemini.",
        en: "Personal Bitcoin dashboard with advanced technical analysis (RSI, MACD, Fibonacci, ATR) and integrated AI advisor powered by Google Gemini.",
      },
      tech: ["React 19", "Express", "Gemini API", "Coinbase WS", "JWT", "Recharts"],
      url: "https://github.com/dany80213/Bitcoin-Tracker",
      featured: true,
    },
    {
      name: "party-webapp",
      description: {
        it: "Web app full-stack per organizzare feste: inviti con QR code, calendario, autenticazione, notifiche email via Google APIs.",
        en: "Full-stack web app for party management: QR-coded invites, calendar integration, authentication and email notifications via Google APIs.",
      },
      tech: ["Next.js 15", "React 19", "TypeScript", "Prisma", "PostgreSQL", "Docker"],
      url: "",
      featured: true,
    },
    {
      name: "irrigation-system",
      description: {
        it: "Sistema di irrigazione automatica per piante con ESP32, gestione via web e schedulazione.",
        en: "Automatic plant irrigation system using ESP32 with web-based control and scheduling.",
      },
      tech: ["ESP32", "JavaScript", "MQTT"],
      url: "https://github.com/dany80213/irrigation-system",
      featured: false,
    },
    {
      name: { it: "Caldaia Smart", en: "Smart Boiler" },
      description: {
        it: "Sistema di controllo caldaia con Arduino, display Nextion, sensori di temperatura. Progetto collaborativo scolastico.",
        en: "Boiler control system using Arduino, Nextion touchscreen display and temperature sensors. Collaborative school project.",
      },
      tech: ["Arduino", "C++", "Nextion HMI", "Sensori"],
      url: "",
      featured: false,
    },
  ],

  softSkills: {
    it: ["Problem solving", "Autonomia", "Lavoro in team", "Curiosità"],
    en: ["Problem solving", "Autonomy", "Team work", "Curiosity"],
  },

  hobbies: {
    it: ["Trading crypto & Bitcoin", "Self-hosting & homelab", "Hardware tinkering", "Palestra"],
    en: ["Crypto & Bitcoin trading", "Self-hosting & homelab", "Hardware tinkering", "Gym"],
  },

  pcto: {
    hours: 520,
    it: "PCTO svolto presso IIS J.C. Maxwell",
    en: "Work-based learning (PCTO) at IIS J.C. Maxwell",
  },

  // Certificati disponibili per il download — aggiungi file in public/certs/ e una voce qui
  downloadableCerts: [
    {
      name: "Cypherpunk 2140 – Proof of Knowledge",
      description: { it: "Certificato esame blockchain, punteggio 74/80", en: "Blockchain exam certificate, score 74/80" },
      file: "cypherpunk2140.pdf",
      icon: "₿",
    },
    // Aggiungi altri certificati qui:
    // { name: "Cambridge C1", description: { it: "...", en: "..." }, file: "cambridge_c1.pdf", icon: "🎓" },
  ],
};
