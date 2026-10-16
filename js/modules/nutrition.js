// Módulo de Nutrición, Hidratación y Pauta Clínica (Guía de Referencia)
import { INITIAL_DATA } from '../data/initialData.js';

export function renderNutritionModule(container) {
  const nutritionData = INITIAL_DATA.nutrition;

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
            <p class="text-xs text-[var(--muted-foreground)] mt-0.5">Recomposición Corporal • Protección Muscular (58.3 kg magros) & Tiroidea</p>
          </div>
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
            ~${nutritionData.targetCalories} kcal
          </span>
        </div>

        <!-- Target Macros Grid -->
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

      <!-- PILARES CLÍNICOS DIARIOS (SOLO CONSULTA) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <!-- Pilar 1: Protocolo Levotiroxina -->
        <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-base">💊</span>
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[var(--foreground)]">Protocolo Levotiroxina</h3>
                  <span class="text-[10px] font-mono text-purple-400 font-bold">06:30 – 07:00 hrs</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">Absorción &gt;85%</span>
            </div>
            <ul class="space-y-1.5 text-xs text-[var(--muted-foreground)] mt-2">
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

        <!-- Pilar 2: Distribución de Hidratación 3.0L -->
        <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2">
                <span class="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-base">💧</span>
                <div>
                  <h3 class="font-bold text-xs sm:text-sm text-[var(--foreground)]">Pauta de Hidratación</h3>
                  <span class="text-[10px] font-mono text-blue-400 font-bold">Meta Base: ${(nutritionData.targetWaterMl / 1000).toFixed(1)} Litros / día</span>
                </div>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">Distribución</span>
            </div>
            <ul class="space-y-1.5 text-xs text-[var(--muted-foreground)] mt-2">
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
          <span class="text-[10px] text-[var(--muted-foreground)]">${nutritionData.meals.filter(m => m.id !== 'medication').length} Tiempos de Comida</span>
        </div>

        ${nutritionData.meals.filter(meal => meal.id !== 'medication').map((meal, idx) => `
          <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]/60">
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  #${idx + 1} • ${meal.time}
                </span>
                <h4 class="font-bold text-sm text-[var(--foreground)]">${meal.name}</h4>
              </div>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                🎯 ${meal.badge}
              </span>
            </div>

            <!-- Lista de Alimentos -->
            <ul class="mt-3 space-y-2 text-xs text-[var(--foreground)]/90">
              ${meal.items.map(item => `
                <li class="flex items-start gap-2">
                  <span class="text-amber-500 font-bold mt-0.5">▸</span>
                  <span class="leading-relaxed">${item}</span>
                </li>
              `).join('')}
            </ul>

            <!-- Nota Médica / Nutricional -->
            ${meal.notes ? `
              <div class="mt-3 p-2.5 rounded-xl bg-[var(--accent)]/50 text-[11px] text-[var(--muted-foreground)] border-l-2 border-amber-500">
                💡 <b class="text-[var(--foreground)]">Clave fisiológica:</b> ${meal.notes}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>

      <!-- GUÍA RÁPIDA DE EQUIVALENCIAS E INTERCAMBIOS -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs space-y-3">
        <div>
          <h3 class="text-sm font-bold text-[var(--foreground)]">Guía Rápida de Intercambios Equivalentes</h3>
          <p class="text-xs text-[var(--muted-foreground)]">Opciones intercambiables para variar tus menús manteniendo las calorías y macros exactos</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <!-- Proteínas -->
          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[11px] font-extrabold text-blue-400 block">🥩 ~35-40g Proteína Magra</span>
            <ul class="space-y-1 text-[11px] text-[var(--muted-foreground)]">
              <li>• 170-180g Pechuga de pollo o pavo</li>
              <li>• 190g Pescado blanco (merluza/reineta)</li>
              <li>• 150g Salmón o atún al agua (2 latas)</li>
              <li>• 170g Posta rosada / asiento magro</li>
            </ul>
          </div>

          <!-- Carbohidratos -->
          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[11px] font-extrabold text-amber-400 block">🍚 ~30-35g Carbohidratos</span>
            <ul class="space-y-1 text-[11px] text-[var(--muted-foreground)]">
              <li>• 100-120g Arroz o quinoa cocida</li>
              <li>• 150-170g Papa o camote al horno/airfryer</li>
              <li>• 2 rebanadas Pan 100% integral</li>
              <li>• 45g Avena tradicional en hojuelas</li>
            </ul>
          </div>

          <!-- Grasas Buenas -->
          <div class="p-3 rounded-xl bg-[var(--accent)]/40 border border-[var(--border)] space-y-1.5">
            <span class="text-[11px] font-extrabold text-emerald-400 block">🥑 ~10-12g Grasas Saludables</span>
            <ul class="space-y-1 text-[11px] text-[var(--muted-foreground)]">
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
}

