// Datos iniciales de perfil, rutina Smart Fit y nutrición para Michael Meneses
export const INITIAL_DATA = {
  profile: {
    name: "Michael Meneses Mora",
    age: 36,
    height: 173,
    startWeight: 85.0,
    targetWeightMin: 72.0,
    targetWeightMax: 74.0,
    skeletalMuscleMass: 37.0,
    fatFreeMass: 58.3,
    trunkFat: 16.45,
    waterTargetLitres: 3.0,
    gymSchedule: "18:00 - 19:15",
    condition: "Hipotiroidismo medicado (Levotiroxina 06:30 - 07:00 en ayunas)"
  },

  routines: {
    torso1: {
      id: "torso1",
      name: "Torso 1",
      dayName: "Lunes",
      focus: "Fuerza Pectoral, Espalda, Hombro & Brazos + Cardio Zona 2",
      cardio: "20 min Cinta inclinada (8-10%, 4.8 km/h, Zona 2 ~115-130 lpm)",
      exercises: [
        {
          id: "chest_press",
          name: "Press de Pecho en Máquina",
          machineName: "Seated Chest Press (Life Fitness / Matrix)",
          targetMuscles: "Pectoral Mayor, Tríceps, Deltoides Anterior",
          image: "assets/images/smartfit_chest_press_1789138165787.jpg",
          defaultSets: 4,
          defaultReps: "8-10",
          baseWeight: "40",
          seatAdjustment: "Ajustar asiento para que los agarres queden a la altura del pecho medio (línea de pezones).",
          tips: [
            "Espalda y cabeza firmes contra el respaldo, omóplatos retraídos hacia atrás y abajo.",
            "Empujar exhalando sin llegar a hiperextender ni bloquear los codos al final.",
            "Regresar en 2-3 segundos de forma controlada sintiendo el estiramiento en el pecho."
          ]
        },
        {
          id: "cable_row",
          name: "Remo Sentado en Polea / Máquina",
          machineName: "Remo / Seated Cable Row / Chest Supported Row",
          targetMuscles: "Dorsal Ancho, Romboides, Trapecio Medio, Bíceps",
          image: "assets/images/smartfit_back_machine_1789138318602.jpg",
          defaultSets: 4,
          defaultReps: "10",
          baseWeight: "33",
          seatAdjustment: "Pecho apoyado en cojín o pies firmes en la plataforma con rodillas semiflexionadas.",
          tips: [
            "Espalda erguida, pecho hacia afuera, sin balancear el torso.",
            "Traccionar llevando el agarre hacia el abdomen/ombligo.",
            "Apretar fuertemente las escápulas atrás durante 1 segundo."
          ]
        },
        {
          id: "shoulder_press",
          name: "Press de Hombro en Máquina",
          machineName: "Overhead Shoulder Press",
          targetMuscles: "Deltoides Anterior y Lateral, Tríceps",
          image: "assets/images/smartfit_shoulder_press_1789138236584.jpg",
          defaultSets: 3,
          defaultReps: "8-10",
          baseWeight: "25",
          seatAdjustment: "Asiento a una altura donde los agarres comiencen a nivel de las orejas/mentón.",
          tips: [
            "Lumbares pegadas al respaldo, pies firmes en el suelo.",
            "Empujar hacia arriba sin encoger los hombros hacia el cuello.",
            "Frenar justo antes de bloquear los codos para no descargar la tensión."
          ]
        },
        {
          id: "lat_pulldown",
          name: "Tracción Lateral Superior (Jalón al Pecho)",
          machineName: "Tracción Lateral Superior / Lat Pulldown",
          targetMuscles: "Dorsal Ancho, Redondo Mayor, Bíceps",
          image: "assets/images/smartfit_back_machine_1789138318602.jpg",
          defaultSets: 3,
          defaultReps: "10",
          baseWeight: "47",
          seatAdjustment: "Ajustar la almohadilla superior sobre los muslos para quedar totalmente anclado.",
          tips: [
            "Agarre prono un poco más ancho que los hombros.",
            "Inclinar el torso unos 10-15° hacia atrás.",
            "Llevar la barra a la clavícula pensando en clavar los codos hacia las costillas."
          ]
        },
        {
          id: "triceps_pushdown",
          name: "Tríceps en Polea Alta (Cuerda/Barra)",
          machineName: "Cable Pulley Station",
          targetMuscles: "Tríceps Braquial (3 cabezas)",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "10-12",
          baseWeight: "18",
          seatAdjustment: "Polea en la posición más alta. De pie con ligera inclinación.",
          tips: [
            "Codos pegados a los costados del torso actuando como bisagra fija.",
            "Extender completamente abajo. Si usas cuerda, abrir los extremos al final.",
            "Controlar la subida hasta formar un ángulo de 90° en los codos."
          ]
        },
        {
          id: "biceps_cable_curl",
          name: "Bíceps en Polea Baja",
          machineName: "Cable Pulley Station (Polea baja)",
          targetMuscles: "Bíceps Braquial, Braquial Anterior",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "10-12",
          baseWeight: "21",
          seatAdjustment: "Polea en la posición más baja con barra recta o agarres individuales.",
          tips: [
            "Pecho erguido, codos pegados a la cintura.",
            "Subir flexionando los brazos sin mover los codos hacia adelante ni arquear la espalda.",
            "Bajar en 2 segundos de forma estricta."
          ]
        },
        {
          id: "cardio_finisher_torso1",
          isCardio: true,
          name: "Cardio Finisher (Zona 2 • Quema Grasa Visceral)",
          machineName: "Cinta de Correr con Inclinación (Treadmill Incline)",
          targetMuscles: "Sistema Cardiovascular & Quema de Grasa Visceral",
          image: "",
          defaultSets: 1,
          defaultReps: "20 min",
          baseWeight: "Zona 2 (110-125 lpm)",
          seatAdjustment: "Inclinación 8-10%, velocidad caminata enérgica 4.8 km/h.",
          tips: [
            "Hacer SIEMPRE al final de la sesión de fuerza para no agotar el glucógeno antes de las máquinas.",
            "Mantener un paso constante donde puedas hablar sin ahogarte (Zona 2 conversacional).",
            "A esta intensidad tu cuerpo utiliza directamente los ácidos grasos del tronco como combustible sin elevar el cortisol."
          ]
        }
      ]
    },

    pierna1: {
      id: "pierna1",
      name: "Pierna 1",
      dayName: "Martes",
      focus: "Cuádriceps, Isquiosurales, Glúteos & Abdomen + Cardio",
      cardio: "15-20 min Elíptica o Bicicleta suave",
      exercises: [
        {
          id: "leg_press",
          name: "Prensa de Piernas (Leg Press)",
          machineName: "Seated Leg Press / Prensa 45°",
          targetMuscles: "Cuádriceps, Glúteos, Aductores",
          image: "assets/images/smartfit_leg_press_1789138185290.jpg",
          defaultSets: 4,
          defaultReps: "8-10",
          baseWeight: "75",
          seatAdjustment: "Respaldo a 45° o posición que permita flexión profunda sin despegar el coxis.",
          tips: [
            "Pies al ancho de hombros en el centro, puntas 10-15° hacia afuera.",
            "¡CRÍTICO!: Glúteos y lumbares 100% pegados al asiento. No despegar la pelvis al bajar.",
            "Bajar hasta 90° de flexión en rodilla y empujar con los talones.",
            "NUNCA bloquear (hiperextender) las rodillas arriba."
          ]
        },
        {
          id: "leg_extension",
          name: "Extensión de Cuádriceps",
          machineName: "Leg Extension Machine",
          targetMuscles: "Cuádriceps (Recto Femoral y Vasto Lateral)",
          image: "assets/images/smartfit_leg_extension_1789138265921.jpg",
          defaultSets: 4,
          defaultReps: "10-12",
          baseWeight: "47",
          seatAdjustment: "Eje de rotación alineado con la rodilla; rodillo sobre el empeine / espinilla baja.",
          tips: [
            "Sujetarse firmemente de las manillas laterales para no levantarse del banco.",
            "Extender completamente contrayendo 1 segundo en la cima.",
            "Descender en 2-3 segundos controlando el peso."
          ]
        },
        {
          id: "leg_curl",
          name: "Contracción de Pierna (Curl Femoral)",
          machineName: "Contracción de Pierna / Leg Curl",
          targetMuscles: "Isquiosurales (Bíceps Femoral, Semitendinoso)",
          image: "assets/images/smartfit_leg_extension_1789138265921.jpg",
          defaultSets: 4,
          defaultReps: "10-12",
          baseWeight: "46",
          seatAdjustment: "Rodillo colocado justo detrás de los tobillos (sobre el tendón de Aquiles).",
          tips: [
            "Flexionar llevando los talones hacia los glúteos de forma decidida.",
            "Pausar 1 segundo en contracción máxima.",
            "Regresar despacio sintiendo el estiramiento en la parte trasera del muslo."
          ]
        },
        {
          id: "calf_press",
          name: "Pantorrillas en Prensa o Máquina",
          machineName: "Calf Extension / Leg Press Calf Raise",
          targetMuscles: "Gastrocnemio y Sóleo",
          image: "assets/images/smartfit_leg_press_1789138185290.jpg",
          defaultSets: 4,
          defaultReps: "15",
          baseWeight: "Auto",
          seatAdjustment: "Apoyar solo la punta de los pies en el borde inferior de la plataforma.",
          tips: [
            "Bajar los talones sintiendo un estiramiento profundo del gemelo (pausa 1s).",
            "Empujar sobre la punta del pie contrayendo arriba 1s."
          ]
        },
        {
          id: "ab_crunch_machine",
          name: "Abdominales: Crunch en Máquina o Polea",
          machineName: "Abdominal Machine / Cable Crunch",
          targetMuscles: "Recto Abdominal, Oblicuos",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "12-15",
          baseWeight: "Auto",
          seatAdjustment: "Cojín contra el pecho o cuerda tras la cabeza.",
          tips: [
            "Exhalar todo el aire al flexionar el tronco, apretando el abdomen.",
            "El movimiento debe originarse en el core, no tirando con los brazos."
          ]
        },
        {
          id: "cardio_finisher_pierna1",
          isCardio: true,
          name: "Cardio Finisher (Zona 2 • Recuperación Activa)",
          machineName: "Elíptica o Bicicleta Estática Suave",
          targetMuscles: "Sistema Cardiovascular & Quema de Grasa Visceral",
          image: "",
          defaultSets: 1,
          defaultReps: "20 min",
          baseWeight: "Zona 2 (110-120 lpm)",
          seatAdjustment: "Resistencia moderada (nivel 4-6), bajo impacto articular tras prensa y piernas.",
          tips: [
            "Hacer al final de la sesión para drenar ácido láctico y oxidar grasa.",
            "Cadencia fluida sin forzar las rodillas tras el trabajo pesado de piernas.",
            "Mantener pulsaciones entre 110 y 120 lpm a ritmo conversacional."
          ]
        }
      ]
    },

    torso2: {
      id: "torso2",
      name: "Torso 2",
      dayName: "Jueves",
      focus: "Hipertrofia Espalda, Pectoral Aislado, Hombro Posterior + Cardio",
      cardio: "20 min Cinta inclinada (9%, 4.8 km/h, Zona 2)",
      exercises: [
        {
          id: "lat_pulldown_neutral",
          name: "Tracción Dorsal Fija (Jalón Neutro / Cerrado)",
          machineName: "Tracción Dorsal Fija / Lat Pulldown Neutro",
          targetMuscles: "Dorsal Ancho (fibras bajas), Braquial",
          image: "assets/images/smartfit_back_machine_1789138318602.jpg",
          defaultSets: 4,
          defaultReps: "8-10",
          baseWeight: "40",
          seatAdjustment: "Almohadilla sobre los muslos, torso firme.",
          tips: [
            "El agarre neutro permite un mayor recorrido hacia las costillas y protege las muñecas.",
            "Llevar el accesorio al pecho alto manteniendo el pecho inflado."
          ]
        },
        {
          id: "pec_deck",
          name: "Mariposa Pectoral (Pec Deck)",
          machineName: "Pec Deck Machine (Life Fitness)",
          targetMuscles: "Pectoral Mayor (fibras internas y esternales)",
          image: "assets/images/smartfit_pec_deck_1789138210707.jpg",
          defaultSets: 4,
          defaultReps: "10-12",
          baseWeight: "47",
          seatAdjustment: "Asiento regulado para que los brazos queden a la altura del pecho medio.",
          tips: [
            "Codos con una leve flexión constante (no doblarlos ni estirarlos durante el vuelo).",
            "Juntar los brazos al frente y apretar fuertemente el pecho 1 segundo.",
            "Abrir despacio sin dejar que las placas choquen entre sí."
          ]
        },
        {
          id: "machine_row_supported",
          name: "Remo en Máquina con Soporte en Pecho",
          machineName: "Remo / Chest-Supported Machine Row",
          targetMuscles: "Romboides, Trapecio Medio, Dorsal",
          image: "assets/images/smartfit_back_machine_1789138318602.jpg",
          defaultSets: 3,
          defaultReps: "10-12",
          baseWeight: "33",
          seatAdjustment: "Cojín del pecho colocado de modo que los brazos lleguen cómodos a las manillas.",
          tips: [
            "Tener el pecho apoyado elimina toda carga o molestia en la zona lumbar.",
            "Tirar con los codos hacia atrás y apretar la espalda alta."
          ]
        },
        {
          id: "cable_lateral_raise",
          name: "Elevaciones Laterales en Polea o Máquina",
          machineName: "Cable Tower (Polea baja) / Lateral Raise Machine",
          targetMuscles: "Deltoides Lateral (anchura de hombros)",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "12-15",
          baseWeight: "Auto",
          seatAdjustment: "Polea a la altura de la rodilla o máquina sentada.",
          tips: [
            "Elevar los brazos en plano escapular (ligeramente hacia adelante, unos 30°).",
            "Guiar el movimiento con el codo, no con la muñeca."
          ]
        },
        {
          id: "face_pull",
          name: "Face Pull en Polea Alta con Cuerda",
          machineName: "Cable Pulley Station",
          targetMuscles: "Deltoides Posterior, Manguito Rotador, Trapecio",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "15",
          baseWeight: "Auto",
          seatAdjustment: "Polea ajustada a la altura de la frente o cuello.",
          tips: [
            "Tirar de la cuerda hacia el entrecejo, separando las manos hacia afuera.",
            "Codos siempre más altos que las muñecas. Excelente para salud postural de hombro."
          ]
        },
        {
          id: "arms_superset_2",
          name: "Superserie: Tríceps tras nuca + Curl Martillo",
          machineName: "Cable Tower",
          targetMuscles: "Cabeza Larga de Tríceps + Braquial / Antebrazo",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "12",
          baseWeight: "Auto",
          seatAdjustment: "Polea media/baja con cuerda.",
          tips: [
            "Hacer primero 12 reps de extensión de tríceps tras nuca, e inmediatamente 12 reps de curl martillo.",
            "Descansar 90 segundos al terminar ambas."
          ]
        },
        {
          id: "cardio_finisher_torso2",
          isCardio: true,
          name: "Cardio Finisher (Zona 2 • Quema Grasa Visceral)",
          machineName: "Cinta de Correr con Inclinación",
          targetMuscles: "Sistema Cardiovascular & Quema de Grasa Visceral",
          image: "",
          defaultSets: 1,
          defaultReps: "20 min",
          baseWeight: "Zona 2 (115-125 lpm)",
          seatAdjustment: "Inclinación 8-9%, velocidad 4.8 km/h.",
          tips: [
            "Hacer al final: con el glucógeno bajo tras el pectoral y espalda, atacas directamente la grasa del tronco.",
            "Respiración nasal controlada a ritmo constante."
          ]
        }
      ]
    },

    pierna2: {
      id: "pierna2",
      name: "Pierna 2",
      dayName: "Viernes",
      focus: "Cadena Posterior, Glúteo, Aductores/Abductores + Cardio",
      cardio: "20 min Bicicleta estática en Zona 2",
      exercises: [
        {
          id: "hip_thrust_machine",
          name: "Hip & Glute (Hip Thrust en Máquina)",
          machineName: "Hip & Glute Machine / Hip Thrust",
          targetMuscles: "Glúteo Mayor, Isquiosurales",
          image: "assets/images/smartfit_leg_press_1789138185290.jpg",
          defaultSets: 4,
          defaultReps: "10-12",
          baseWeight: "89",
          seatAdjustment: "Cojín acolchado justo sobre la pelvis/caderas.",
          tips: [
            "Pies apoyados de modo que al subir las rodillas formen 90°.",
            "Empujar con los talones y apretar fuertemente los glúteos arriba por 1 segundo completo.",
            "Mantener la barbilla pegada al pecho (mirando al frente, no al techo)."
          ]
        },
        {
          id: "leg_press_high_feet",
          name: "Prensa de Piernas (Pies altos y separados)",
          machineName: "Prensa 45° o Seated Leg Press",
          targetMuscles: "Glúteos e Isquiosurales",
          image: "assets/images/smartfit_leg_press_1789138185290.jpg",
          defaultSets: 3,
          defaultReps: "10-12",
          baseWeight: "75+",
          seatAdjustment: "Colocar los pies en la parte más alta de la plataforma y algo más anchos que los hombros.",
          tips: [
            "La posición alta de pies transfiere el trabajo hacia la cadera y glúteo.",
            "Bajar profundo sin despegar el coxis del asiento."
          ]
        },
        {
          id: "leg_curl_p2",
          name: "Contracción de Pierna (Curl Femoral)",
          machineName: "Contracción de Pierna / Leg Curl",
          targetMuscles: "Isquiosurales",
          image: "assets/images/smartfit_leg_extension_1789138265921.jpg",
          defaultSets: 3,
          defaultReps: "10-12",
          baseWeight: "46",
          seatAdjustment: "Rodillo detrás del tendón de Aquiles.",
          tips: [
            "Concentración máxima en flexionar y retener 2 segundos la vuelta."
          ]
        },
        {
          id: "abductor_adductor_machine",
          name: "Máquina Abductora + Aductora",
          machineName: "Abductor / Adductor Machines",
          targetMuscles: "Glúteo Medio (abrir) + Aductores de muslo (cerrar)",
          image: "assets/images/smartfit_leg_press_1789138185290.jpg",
          defaultSets: 3,
          defaultReps: "15 c/u",
          baseWeight: "Auto",
          seatAdjustment: "Sentado erguido, almohadillas en rodillas.",
          tips: [
            "Hacer primero 15 reps de abducción (abrir caderas) y luego 15 reps de aducción (cerrar muslos).",
            "Protege la pelvis y estabiliza las rodillas en la prensa."
          ]
        },
        {
          id: "core_abs_p2",
          name: "Abdomen en Paralelas / Plancha Isométrica",
          machineName: "Captain's Chair (Torre de paralelas) / Colchoneta",
          targetMuscles: "Core, Recto Abdominal, Psoas",
          image: "assets/images/smartfit_cable_arms_1789138284942.jpg",
          defaultSets: 3,
          defaultReps: "12 reps / 40 seg",
          baseWeight: "Corporal",
          seatAdjustment: "Antebrazos apoyados en los cojines de la torre.",
          tips: [
            "Elevar las rodillas hacia el pecho sin balancear el cuerpo.",
            "O mantener plancha horizontal activando glúteos y abdomen."
          ]
        },
        {
          id: "cardio_finisher_pierna2",
          isCardio: true,
          name: "Cardio Finisher (Zona 2 • Vaciado y Quema)",
          machineName: "Bicicleta Estática o Caminadora Plana",
          targetMuscles: "Sistema Cardiovascular & Quema de Grasa Visceral",
          image: "",
          defaultSets: 1,
          defaultReps: "20 min",
          baseWeight: "Zona 2 (110-120 lpm)",
          seatAdjustment: "Asiento regulado a la altura de la cadera al estar de pie.",
          tips: [
            "Pedaleo continuo y fluido a ritmo conversacional.",
            "Excelente para cerrar la semana sin sobrecargar articulaciones."
          ]
        }
      ]
    }
  },

  nutrition: {
    targetCalories: 1860,
    targetProtein: 145,
    targetCarbs: 185,
    targetFats: 60,
    targetWaterMl: 3000,
    meals: [
      {
        id: "medication",
        time: "06:30 - 07:00",
        name: "Medicación Tiroidea",
        badge: "Absorción Óptima",
        items: [
          "1 pastilla de Levotiroxina",
          "1 vaso grande de agua pura (250-300 ml)",
          "Ayuno estricto de 1 a 2 horas (sin café ni comida)"
        ],
        notes: "Garantiza absorción >85%. El café o la comida antes de 1h reduce la absorción hasta en un 40%."
      },
      {
        id: "breakfast",
        time: "08:00 - 08:30",
        name: "Desayuno (Arranque Metabólico)",
        badge: "Proteína + Grasas Buenas",
        items: [
          "2 láminas de pan 100% integral",
          "Opción A: 2 huevos revueltos | Opción B: 1/2 palta con 3-4 láminas de jamón de pavo cocido (60-80g)",
          "100g de fruta fresca (arándanos, frutillas o kiwi)",
          "2 Castañas de Pará (Nuez de Brasil) o 1 cda semillas de zapallo/maravilla (aporte selenio)",
          "Café o té solo (sin azúcar)"
        ],
        notes: "Si eliges palta, asegúrate de incluir el jamón de pavo para llegar a los 20-25g de proteína matutina."
      },
      {
        id: "lunch",
        time: "13:00 - 13:30",
        name: "Almuerzo (Sostenimiento)",
        badge: "Energía Limpia",
        items: [
          "170g (peso en crudo) de pechuga de pollo, pavo, ternera magra o pescado",
          "100g de arroz cocido o 120g de patatas cocidas/airfryer o pastas",
          "200g de verduras variadas (cocidas o ensalada fresca)",
          "1 cucharada sopera (10 ml) de Aceite de Oliva Virgen Extra (AOVE)"
        ],
        notes: "Crucíferas (brócoli/coliflor) consumirlas siempre cocidas para desactivar bociógenos."
      },
      {
        id: "preworkout",
        time: "16:30 - 17:00",
        name: "Pre-Entreno (60-90 min antes)",
        badge: "Digestión Ligera",
        items: [
          "1 pote de yogur griego natural descremado (150-170g)",
          "1 plátano mediano (~100g) o 1 manzana grande + 20g de copos de avena",
          "Opcional: Colun Plus Proteína Chocolate (o Loncoleche Protein)",
          "Cero frutos secos o grasas pesadas en esta toma para evitar pesadez a las 18:00"
        ],
        notes: "Llegas a las 18:00 con glucosa disponible en sangre y el estómago liviano para entrenar."
      },
      {
        id: "dinner",
        time: "19:45 - 20:30",
        name: "Cena Post-Entreno (Recarga & Reparación)",
        badge: "GLUT-4 & Sueño",
        items: [
          "180-200g de pescado blanco, atún en agua, salmón o pechuga de ave",
          "140g de arroz cocido o 170-180g de patata o boniato cocido",
          "1 plato hondo de verduras cocidas o crema casera de calabacín/zapallo",
          "1 cucharadita (5 ml) de Aceite de Oliva Virgen Extra (AOVE)"
        ],
        notes: "Recarga el glucógeno de tus 37 kg de músculo, baja el cortisol post-ejercicio y favorece el descanso."
      }
    ]
  },

  measurementsHistory: [
    {
      date: "2026-09-07",
      source: "Smart Fit (InBody multicanal)",
      weight: 85.3,
      muscleMass: 37.0,
      fatMass: 22.0,
      fatPercent: 25.8,
      visceralFat: 9,
      waterLitres: 42.7,
      waterPercent: 50.0,
      trunkFat: 16.45
    },
    {
      date: "2026-09-08",
      source: "Eufy Life (Báscula hogar)",
      weight: 84.8,
      muscleMass: 36.8,
      fatMass: 24.2,
      fatPercent: 28.5,
      visceralFat: 13,
      waterLitres: 41.5,
      waterPercent: 49.0,
      trunkFat: 16.0
    }
  ]
};
