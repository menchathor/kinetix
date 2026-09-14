// Módulo de Nutrición, Hidratación y Hábitos Clínicos (Plan v1)
import { INITIAL_DATA } from '../data/initialData.js';
import { db } from '../services/db.js';

export function renderNutritionModule(container) {
  const nutritionData = INITIAL_DATA.nutrition;
  const todayLog = db.getTodayNutrition();
  const waterProgress = Math.min(100, Math.round((todayLog.waterMl / nutritionData.targetWaterMl) * 100));

  container.innerHTML = `
    <div class="space-y-4 max-w-3xl mx-auto pb-24">
      
      <!-- Cabecera de Macros Diarios -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div>
            <h2 class="text-base font-bold text-[var(--foreground)]">Plan Nutricional & Hábitos</h2>
            <p class="text-xs text-[var(--muted-foreground)]">Objetivo: Recomposición & Protección Tiroidea</p>
          </div>
          <span class="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            ~${nutritionData.targetCalories} kcal
          </span>
        </div>

        <!-- Target Macros Grid -->
        <div class="grid grid-cols-3 gap-2 mt-3 text-center">
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Proteína</span>
            <span class="text-base font-extrabold text-blue-400 block">${nutritionData.targetProtein}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">31% (1.7 g/kg)</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Carbohidratos</span>
            <span class="text-base font-extrabold text-amber-400 block">${nutritionData.targetCarbs}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">40% (T4 a T3)</span>
          </div>
          <div class="p-2.5 rounded-xl bg-[var(--accent)]/50 border border-[var(--border)]">
            <span class="text-[10px] uppercase font-bold text-[var(--muted-foreground)] block">Grasas Buenas</span>
            <span class="text-base font-extrabold text-emerald-400 block">${nutritionData.targetFats}g</span>
            <span class="text-[10px] text-[var(--muted-foreground)]">29% (Hormonal)</span>
          </div>
        </div>
      </div>

      <!-- CONTROL CLÍNICO: LEVOTIROXINA -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0 text-lg">
              💊
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-sm text-[var(--foreground)]">Levotiroxina (06:30 – 07:00)</h3>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold">Crítico</span>
              </div>
              <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
                Tomar con vaso grande de agua pura. Mantener ayuno estricto de 1 a 2 horas (sin café ni comida).
              </p>
            </div>
          </div>

          <button 
            id="btnToggleMed" 
            class="shrink-0 w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all ${todayLog.medicationTaken 
              ? 'bg-purple-500 text-slate-950 shadow-sm' 
              : 'bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--border)]'}">
            ${todayLog.medicationTaken ? '✓' : '○'}
          </button>
        </div>
      </div>

      <!-- TRACKER DE HIDRATACIÓN DIARIA (TARGET: 3.0 LITROS) -->
      <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">💧</span>
            <div>
              <h3 class="font-bold text-sm text-[var(--foreground)]">Hidratación Diaria</h3>
              <p class="text-xs text-[var(--muted-foreground)]">Meta: ${nutritionData.targetWaterMl / 1000} Litros diarios</p>
            </div>
          </div>
          <div class="text-right">
            <span class="font-mono text-base font-extrabold text-blue-400" id="waterCounterText">
              ${(todayLog.waterMl / 1000).toFixed(2)} L
            </span>
            <span class="text-[10px] text-[var(--muted-foreground)] block">(${waterProgress}%)</span>
          </div>
        </div>

        <!-- Barra de progreso -->
        <div class="w-full h-3 bg-[var(--accent)] rounded-full overflow-hidden mt-3 border border-[var(--border)]">
          <div 
            id="waterProgressBar" 
            class="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 rounded-full" 
            style="width: ${waterProgress}%"></div>
        </div>

        <!-- Botones de incremento -->
        <div class="flex items-center justify-between gap-2 mt-3">
          <button id="btnAddWater250" class="flex-1 py-1.5 px-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs font-semibold text-[var(--foreground)] transition-all flex items-center justify-center gap-1">
            <span>+250 ml (Vaso)</span>
          </button>
          <button id="btnAddWater500" class="flex-1 py-1.5 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1">
            <span>+500 ml (Botella)</span>
          </button>
          <button id="btnSubWater250" class="py-1.5 px-3 rounded-xl bg-[var(--accent)] hover:bg-[var(--border)] text-xs text-[var(--muted-foreground)] transition-all" title="Restar 250ml">
            -250 ml
          </button>
        </div>
      </div>

      <!-- DESGLOSE DE COMIDAS DEL PLAN V1 -->
      <div class="space-y-3">
        <h3 class="text-xs uppercase font-bold tracking-wider text-[var(--muted-foreground)] px-1">
          Estructura de Comidas (Alineada a Smart Fit 18:00 hrs)
        </h3>

        ${nutritionData.meals.map(meal => {
          const isDone = todayLog.completedMeals && todayLog.completedMeals[meal.id];

          return `
            <div class="bg-[var(--card)] rounded-2xl p-4 border border-[var(--border)] shadow-xs transition-all ${isDone ? 'opacity-70 bg-[var(--accent)]/30' : ''}">
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--accent)] text-amber-500">
                      ${meal.time}
                    </span>
                    <h4 class="font-bold text-sm text-[var(--foreground)]">${meal.name}</h4>
                  </div>
                  <span class="inline-block text-[10px] text-emerald-400 font-semibold mt-1">
                    🎯 ${meal.badge}
                  </span>

                  <!-- Lista de Alimentos -->
                  <ul class="mt-2.5 space-y-1.5 text-xs text-[var(--muted-foreground)]">
                    ${meal.items.map(item => `
                      <li class="flex items-start gap-1.5">
                        <span class="text-amber-500">•</span>
                        <span>${item}</span>
                      </li>
                    `).join('')}
                  </ul>

                  <!-- Nota Médica / Nutricional -->
                  ${meal.notes ? `
                    <div class="mt-2.5 p-2 rounded-lg bg-[var(--accent)]/40 text-[11px] text-[var(--muted-foreground)] border-l-2 border-amber-500">
                      💡 ${meal.notes}
                    </div>
                  ` : ''}
                </div>

                <!-- Checkbox Comida Realizada -->
                <button 
                  data-meal="${meal.id}" 
                  class="btn-toggle-meal shrink-0 w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all ${isDone 
                    ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                    : 'bg-[var(--accent)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--border)]'}">
                  ${isDone ? '✓' : '○'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

    </div>
  `;

  attachNutritionEvents(container, todayLog, nutritionData);
}

function attachNutritionEvents(container, todayLog, nutritionData) {
  // Medicación toggle
  const btnMed = container.querySelector('#btnToggleMed');
  if (btnMed) {
    btnMed.addEventListener('click', () => {
      todayLog.medicationTaken = !todayLog.medicationTaken;
      db.saveTodayNutrition(todayLog);
      renderNutritionModule(container);
    });
  }

  // Agua +250ml
  const btnAdd250 = container.querySelector('#btnAddWater250');
  if (btnAdd250) {
    btnAdd250.addEventListener('click', () => {
      todayLog.waterMl = (todayLog.waterMl || 0) + 250;
      db.saveTodayNutrition(todayLog);
      updateWaterUI(container, todayLog.waterMl, nutritionData.targetWaterMl);
    });
  }

  // Agua +500ml
  const btnAdd500 = container.querySelector('#btnAddWater500');
  if (btnAdd500) {
    btnAdd500.addEventListener('click', () => {
      todayLog.waterMl = (todayLog.waterMl || 0) + 500;
      db.saveTodayNutrition(todayLog);
      updateWaterUI(container, todayLog.waterMl, nutritionData.targetWaterMl);
    });
  }

  // Agua -250ml
  const btnSub250 = container.querySelector('#btnSubWater250');
  if (btnSub250) {
    btnSub250.addEventListener('click', () => {
      todayLog.waterMl = Math.max(0, (todayLog.waterMl || 0) - 250);
      db.saveTodayNutrition(todayLog);
      updateWaterUI(container, todayLog.waterMl, nutritionData.targetWaterMl);
    });
  }

  // Toggle Comidas
  container.querySelectorAll('.btn-toggle-meal').forEach(btn => {
    btn.addEventListener('click', () => {
      const mealId = btn.getAttribute('data-meal');
      if (!todayLog.completedMeals) todayLog.completedMeals = {};
      todayLog.completedMeals[mealId] = !todayLog.completedMeals[mealId];
      db.saveTodayNutrition(todayLog);
      renderNutritionModule(container);
    });
  });
}

function updateWaterUI(container, currentMl, targetMl) {
  const textEl = container.querySelector('#waterCounterText');
  const barEl = container.querySelector('#waterProgressBar');
  const percent = Math.min(100, Math.round((currentMl / targetMl) * 100));

  if (textEl) textEl.textContent = `${(currentMl / 1000).toFixed(2)} L`;
  if (barEl) barEl.style.width = `${percent}%`;
}
