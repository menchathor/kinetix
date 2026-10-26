// Módulo de Nutrición, Hidratación y Pauta Clínica.
// Incluye seguimiento diario (medicación, agua y comidas) sincronizado.
import { INITIAL_DATA } from '../data/initialData.js';
import { db } from '../services/db.js';
import { escapeHtml, escapeAttr } from '../utils/escape.js';
import { icon } from '../ui/icons.js';

function formatWater(ml) {
  return `${(Number(ml) / 1000).toFixed(2)} L`;
}

export function renderNutritionModule(container) {
  const nutritionData = INITIAL_DATA.nutrition;
  const profile = db.getProfile();
  const today = db.getTodayNutrition();
  const goal = Number(nutritionData.targetWaterMl) || 3000;
  const meals = nutritionData.meals.filter(meal => meal.id !== 'medication');
  const completedMeals = today.completedMeals || {};
  const waterPercent = Math.min(100, Math.round((Number(today.waterMl) || 0) / goal * 100));

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">

      <!-- Cabecera de Macros Diarios -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-[var(--foreground)]">Guía Nutricional & Pauta Clínica</h2>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Pauta de Referencia
              </span>
            </div>
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
              Recomposición Corporal${profile.fatFreeMass > 0 ? ` • Protección de ${profile.fatFreeMass} kg magros` : ''} & Tiroidea
            </p>
          </div>
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            ~${nutritionData.targetCalories} kcal
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2 mt-3 text-center">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Proteína</span>
            <span class="text-base font-extrabold text-blue-400 block">${nutritionData.targetProtein}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">31% (~1.8 g/kg)</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Carbohidratos</span>
            <span class="text-base font-extrabold text-amber-400 block">${nutritionData.targetCarbs}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">40% (Conversión T4➔T3)</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Grasas Buenas</span>
            <span class="text-base font-extrabold text-emerald-400 block">${nutritionData.targetFats}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">29% (Soporte Hormonal)</span>
          </div>
        </div>
      </div>

      <!-- SEGUIMIENTO DIARIO -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-[var(--foreground)]">Seguimiento de Hoy</h3>
          <span id="nutritionSaveState" class="text-[11px] font-semibold text-emerald-500 opacity-0 transition-opacity inline-flex items-center gap-1">${icon('check', 'w-3.5 h-3.5')} Guardado</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Medicación -->
          <label class="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)] cursor-pointer">
            <input id="medicationToggle" type="checkbox" ${today.medicationTaken ? 'checked' : ''} class="mt-0.5 h-5 w-5 accent-emerald-500" />
            <span>
              <span class="text-[13px] font-bold text-[var(--foreground)] block">Levotiroxina en ayunas</span>
              <span class="text-[10px] text-[var(--muted-foreground)] block">06:30 – 07:00 • con 250-300 ml de agua</span>
              ${today.medicationTaken && today.medicationTime ? `<span class="text-[10px] text-emerald-400 font-bold block mt-1">Registrada ${escapeHtml(today.medicationTime)}</span>` : ''}
            </span>
          </label>

          <!-- Hidratación -->
          <div class="p-3 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-[var(--foreground)] inline-flex items-center gap-1.5">${icon('droplet', 'w-4 h-4 text-blue-500')} Hidratación</span>
              <span id="waterLabel" class="text-[11px] font-mono font-bold text-blue-400">${formatWater(today.waterMl)} / ${formatWater(goal)}</span>
            </div>
            <div class="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden mt-2">
              <div id="waterBar" class="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style="width: ${waterPercent}%"></div>
            </div>
            <div class="flex items-center gap-1.5 mt-2">
              <button type="button" id="btnWaterMinus" class="btn-touch flex-1 text-xs font-bold rounded-lg bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--accent)]" aria-label="Restar 250 ml de agua">−250</button>
              <button type="button" id="btnWaterPlus" class="btn-touch flex-1 text-xs font-bold rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30 hover:bg-blue-500/25" aria-label="Sumar 250 ml de agua">+250</button>
              <button type="button" id="btnWaterPlus500" class="btn-touch flex-1 text-xs font-bold rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30 hover:bg-blue-500/25" aria-label="Sumar 500 ml de agua">+500</button>
            </div>
          </div>
        </div>

        <p class="text-[10px] text-[var(--muted-foreground)] mt-2">
          Los registros de hoy se sincronizan con tu perfil y se restauran en otros dispositivos.
        </p>
      </div>

      <!-- PILARES CLÍNICOS DIARIOS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">${icon('pill', 'w-5 h-5')}</span>
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[var(--foreground)]">Protocolo Levotiroxina</h3>
                  <span class="text-[10px] font-mono text-purple-400 font-bold">06:30 – 07:00 hrs</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">Absorción &gt;85%</span>
            </div>
            <ul class="space-y-1.5 text-[13px] text-[var(--muted-foreground)] mt-2">
              <li class="flex items-start gap-1.5">
                <span class="text-purple-400 font-bold">•</span>
                <span>Ingerir en ayunas únicamente con <b>250–300 ml de agua pura</b>.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-purple-400 font-bold">•</span>
                <span>Esperar <b>60 a 90 minutos</b> antes de tomar café, té o desayunar.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-purple-400 font-bold">•</span>
                <span>Aportar <b>Selenio y Zinc</b> en el desayuno (2 castañas de Pará o semillas).</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">${icon('droplet', 'w-5 h-5')}</span>
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[var(--foreground)]">Pauta de Hidratación</h3>
                  <span class="text-[10px] font-mono text-blue-400 font-bold">Meta: ${(goal / 1000).toFixed(1)} L / día</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">Distribución</span>
            </div>
            <ul class="space-y-1.5 text-[13px] text-[var(--muted-foreground)] mt-2">
              <li class="flex items-start gap-1.5">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Mañana (07:00 – 12:00):</b> ~1.0 L (incluye vaso de ayuno + media mañana).</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Tarde (13:00 – 17:30):</b> ~1.0 L entre el almuerzo y el pre-entreno.</span>
              </li>
              <li class="flex items-start gap-1.5">
                <span class="text-blue-400 font-bold">•</span>
                <span><b>Gimnasio y Cena (18:00 – 21:00):</b> ~1.0 L durante las máquinas, cardio y cena.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- LISTADO DE COMIDAS DEL DÍA -->
      <div class="space-y-3">
        <div class="flex items-center justify-between px-1">
          <h3 class="text-xs uppercase font-bold tracking-wider text-[var(--muted-foreground)]">
            Estructura Diaria de Comidas (Alineada al Entreno 18:00 hrs)
          </h3>
          <span class="text-[10px] text-[var(--muted-foreground)]">${meals.length} Tiempos de Comida</span>
        </div>

        ${meals.map((meal, idx) => {
          const done = !!completedMeals[meal.id];
          return `
            <div data-meal-card class="bg-[var(--card)] rounded-2xl p-4 border ${done ? 'border-emerald-500/40' : 'border-[var(--border)]'} shadow-xs transition-colors">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]/60">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    #${idx + 1} • ${escapeHtml(meal.time)}
                  </span>
                  <h4 class="font-bold text-sm text-[var(--foreground)]">${escapeHtml(meal.name)}</h4>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold inline-flex items-center gap-1">
                    ${icon('target', 'w-3.5 h-3.5')} ${escapeHtml(meal.badge)}
                  </span>
                  <label class="flex items-center gap-1.5 min-h-11 text-[11px] font-bold text-[var(--muted-foreground)] cursor-pointer px-1">
                    <input type="checkbox" class="meal-toggle h-5 w-5 accent-emerald-500" data-meal="${escapeAttr(meal.id)}" ${done ? 'checked' : ''} />
                    <span>Hecha</span>
                  </label>
                </div>
              </div>

              <ul class="mt-3 space-y-2 text-[13px] text-[var(--foreground)]/90">
                ${meal.items.map(item => `
                  <li class="flex items-start gap-2">
                    <span class="text-amber-500 mt-1 shrink-0">${icon('chevron-right', 'w-3.5 h-3.5')}</span>
                    <span class="leading-relaxed">${escapeHtml(item)}</span>
                  </li>
                `).join('')}
              </ul>

              ${meal.notes ? `
                <div class="mt-3 p-2.5 rounded-xl bg-[var(--accent)]/50 text-[13px] text-[var(--muted-foreground)] border-l-2 border-amber-500 flex items-start gap-1.5">
                  <span class="text-amber-500 mt-0.5 shrink-0">${icon('lightbulb', 'w-4 h-4')}</span>
                  <span><b class="text-[var(--foreground)]">Clave fisiológica:</b> ${escapeHtml(meal.notes)}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- GUÍA RÁPIDA DE EQUIVALENCIAS E INTERCAMBIOS -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs space-y-3">
        <div>
          <h3 class="text-sm font-bold text-[var(--foreground)]">Guía Rápida de Intercambios Equivalentes</h3>
          <p class="text-[13px] text-[var(--muted-foreground)]">Opciones intercambiables para variar tus menús manteniendo las calorías y macros exactos</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[12px] font-extrabold text-blue-500 block">🥩 ~35-40g Proteína Magra</span>
            <ul class="space-y-1 text-[12px] text-[var(--muted-foreground)]">
              <li>• 170-180g Pechuga de pollo o pavo</li>
              <li>• 190g Pescado blanco (merluza/reineta)</li>
              <li>• 150g Salmón o atún al agua (2 latas)</li>
              <li>• 170g Posta rosada / asiento magro</li>
            </ul>
          </div>

          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[12px] font-extrabold text-amber-500 block">🍚 ~30-35g Carbohidratos</span>
            <ul class="space-y-1 text-[12px] text-[var(--muted-foreground)]">
              <li>• 100-120g Arroz o quinoa cocida</li>
              <li>• 150-170g Papa o camote al horno/airfryer</li>
              <li>• 2 rebanadas Pan 100% integral</li>
              <li>• 45g Avena tradicional en hojuelas</li>
            </ul>
          </div>

          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[12px] font-extrabold text-emerald-500 block">🥑 ~10-12g Grasas Saludables</span>
            <ul class="space-y-1 text-[12px] text-[var(--muted-foreground)]">
              <li>• 1 cda sopera (10 ml) Aceite de Oliva</li>
              <li>• 1/2 Palta Hass mediana (~70g)</li>
              <li>• 2 huevos enteros (proteína + grasa)</li>
              <li>• 2 Castañas de Pará + 1 cda semillas</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  `;

  attachNutritionEvents(container, today, goal);
}

function attachNutritionEvents(container, today, goal) {
  const stateEl = container.querySelector('#nutritionSaveState');
  const waterLabel = container.querySelector('#waterLabel');
  const waterBar = container.querySelector('#waterBar');

  const persist = () => {
    db.saveNutrition(today.date, today);
    if (stateEl) {
      stateEl.classList.remove('opacity-0');
      setTimeout(() => stateEl.classList.add('opacity-0'), 1200);
    }
  };

  const updateWaterUI = () => {
    const water = Math.max(0, Number(today.waterMl) || 0);
    if (waterLabel) waterLabel.textContent = `${formatWater(water)} / ${formatWater(goal)}`;
    if (waterBar) waterBar.style.width = `${Math.min(100, Math.round(water / goal * 100))}%`;
  };

  const changeWater = (delta) => {
    today.waterMl = Math.max(0, (Number(today.waterMl) || 0) + delta);
    updateWaterUI();
    persist();
  };

  container.querySelector('#btnWaterPlus')?.addEventListener('click', () => changeWater(250));
  container.querySelector('#btnWaterPlus500')?.addEventListener('click', () => changeWater(500));
  container.querySelector('#btnWaterMinus')?.addEventListener('click', () => changeWater(-250));

  const medicationToggle = container.querySelector('#medicationToggle');
  if (medicationToggle) {
    medicationToggle.addEventListener('change', () => {
      today.medicationTaken = medicationToggle.checked;
      today.medicationTime = medicationToggle.checked
        ? new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })
        : '';
      persist();
      if (medicationToggle.checked) {
        const note = medicationToggle.closest('label')?.querySelector('.text-emerald-400');
        if (!note) {
          const span = document.createElement('span');
          span.className = 'text-[10px] text-emerald-400 font-bold block mt-1';
          span.textContent = `Registrada ${today.medicationTime}`;
          medicationToggle.closest('label')?.querySelector('span')?.appendChild(span);
        }
      }
    });
  }

  container.querySelectorAll('.meal-toggle').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const mealId = toggle.dataset.meal;
      if (!today.completedMeals || typeof today.completedMeals !== 'object') today.completedMeals = {};
      today.completedMeals[mealId] = toggle.checked;
      persist();
      const card = toggle.closest('[data-meal-card]');
      if (card) {
        card.classList.toggle('border-emerald-500/40', toggle.checked);
        card.classList.toggle('border-[var(--border)]', !toggle.checked);
      }
    });
  });
}
