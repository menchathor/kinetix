// Estado reactivo global de la aplicación
import { db } from './services/db.js';
import { INITIAL_DATA } from './data/initialData.js';

// Función para detectar el identificador del día actual (auto-selección inteligente)
export function getTodayDayId(date = new Date()) {
  const day = date.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié, 4: Jue, 5: Vie, 6: Sáb
  const map = {
    1: 'torso1',
    2: 'pierna1',
    3: 'rest_wednesday',
    4: 'torso2',
    5: 'pierna2',
    6: 'rest_saturday',
    0: 'rest_sunday'
  };
  return map[day] || 'torso1';
}

class AppState {
  constructor() {
    this.activeTab = 'workout';
    this.activeWorkout = db.getActiveSession(); // Puede ser null o una sesión en progreso
    this.todayDayId = getTodayDayId();
    this.selectedDay = this.activeWorkout ? this.activeWorkout.routineId : this.todayDayId;

    // Migración automática: Si hay una sesión activa abierta sin el ejercicio de cardio, integrarlo de inmediato
    if (this.activeWorkout && this.activeWorkout.routineId) {
      const routine = INITIAL_DATA.routines[this.activeWorkout.routineId];
      if (routine && routine.exercises) {
        const cardioDef = routine.exercises.find(e => e.isCardio);
        if (cardioDef && !this.activeWorkout.exercises.some(e => e.isCardio || e.exerciseId === cardioDef.id)) {
          this.activeWorkout.exercises.push({
            exerciseId: cardioDef.id,
            exerciseName: cardioDef.name,
            isCardio: true,
            minutes: 20,
            sets: [{ setNumber: 1, weight: 20, reps: 20, completed: !!this.activeWorkout.cardioDone }],
            notes: ''
          });
          db.saveActiveSession(this.activeWorkout);
        }
      }
    }

    this.listeners = [];
  }

  setTab(tab) {
    this.activeTab = tab;
    this.notify();
  }

  setSelectedDay(dayId) {
    this.selectedDay = dayId;
    this.notify();
  }

  startWorkout(routineId) {
    const routine = INITIAL_DATA.routines[routineId];
    if (!routine) return;

    // Crear esqueleto de sesión
    this.activeWorkout = {
      id: 'session_' + Date.now(),
      sessionId: 'session_' + Date.now(),
      routineId,
      routineName: routine.name,
      dayName: routine.dayName,
      startTime: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-CA'),
      updatedAt: Date.now(),
      cardioDone: false,
      cardioMinutes: 20,
      notes: '',
      exercises: routine.exercises.map(ex => {
        const prev = db.getLastExerciseLog(ex.id);

        if (ex.isCardio) {
          return {
            exerciseId: ex.id,
            exerciseName: ex.name,
            isCardio: true,
            minutes: 20,
            previousLog: prev,
            sets: [{
              setNumber: 1,
              weight: 20, // espejo de minutes para compatibilidad
              reps: 20,
              completed: false,
              rpe: ''
            }],
            notes: ''
          };
        }

        const customWeight = db.getCustomWeight(ex.id);
        const suggestedWeight = customWeight !== null
          ? customWeight
          : (prev ? prev.bestWeight : (ex.baseWeight === 'Pendiente' || ex.baseWeight === 'Auto' ? '' : ex.baseWeight));

        // Generar sets por defecto
        const setsCount = ex.defaultSets || 3;
        const sets = [];
        for (let i = 1; i <= setsCount; i++) {
          sets.push({
            setNumber: i,
            weight: suggestedWeight,
            reps: ex.defaultReps.includes('-') ? ex.defaultReps.split('-')[0] : ex.defaultReps,
            completed: false,
            rpe: ''
          });
        }
        return {
          exerciseId: ex.id,
          exerciseName: ex.name,
          isCardio: false,
          previousLog: prev,
          sets,
          notes: ''
        };
      })
    };

    db.saveActiveSession(this.activeWorkout);
    this.notify();
  }

  updateSet(exerciseIndex, setIndex, field, value, shouldNotify = true) {
    if (!this.activeWorkout) return;
    this.activeWorkout.exercises[exerciseIndex].sets[setIndex][field] = value;
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    if (shouldNotify) {
      this.notify();
    }
  }

  toggleSetCompleted(exerciseIndex, setIndex, shouldNotify = true) {
    if (!this.activeWorkout) return false;
    const current = this.activeWorkout.exercises[exerciseIndex].sets[setIndex].completed;
    this.activeWorkout.exercises[exerciseIndex].sets[setIndex].completed = !current;
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    if (shouldNotify) {
      this.notify();
    }
    return !current; // retorna el nuevo estado
  }

  completeAllSetsOfExercise(exerciseIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (ex && ex.sets) {
      ex.sets.forEach(s => {
        s.completed = true;
      });
      this.activeWorkout.updatedAt = Date.now();
      db.saveActiveSession(this.activeWorkout);
      this.notify();
    }
  }

  toggleCardioCompleted(minutes = 20) {
    if (!this.activeWorkout) return false;
    const current = !!this.activeWorkout.cardioDone;
    this.activeWorkout.cardioDone = !current;
    this.activeWorkout.cardioMinutes = this.activeWorkout.cardioDone ? minutes : 0;
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    this.notify();
    return this.activeWorkout.cardioDone;
  }

  setCardioMinutes(minutes) {
    if (!this.activeWorkout) return;
    this.activeWorkout.cardioMinutes = Math.max(5, parseInt(minutes) || 20);
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
  }

  getExerciseBaseSets(exerciseIndex) {
    const ex = this.activeWorkout?.exercises?.[exerciseIndex];
    if (!ex) return 0;
    const routine = INITIAL_DATA.routines[this.activeWorkout.routineId];
    const definition = routine?.exercises?.find(item => item.id === ex.exerciseId);
    // Si no hay definición, no permitimos borrar para no tocar series base.
    return Number(definition?.defaultSets) || ex.sets?.length || 0;
  }

  removeSetFromExercise(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return null;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !Array.isArray(ex.sets) || setIndex < 0 || setIndex >= ex.sets.length) return null;

    // Sólo se eliminan series agregadas por encima de la base del ejercicio.
    const baseSets = this.getExerciseBaseSets(exerciseIndex);
    if (setIndex < baseSets) return null;

    const [removed] = ex.sets.splice(setIndex, 1);
    ex.sets.forEach((set, index) => {
      set.setNumber = index + 1;
    });
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    this.notify();
    return removed;
  }

  restoreSetFromUndo(exerciseIndex, setIndex, removedSet) {
    if (!this.activeWorkout || !removedSet) return false;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    if (!ex || !Array.isArray(ex.sets)) return false;

    const baseSets = this.getExerciseBaseSets(exerciseIndex);
    const insertAt = Math.max(baseSets, Math.min(setIndex, ex.sets.length));
    ex.sets.splice(insertAt, 0, { ...removedSet });
    ex.sets.forEach((set, index) => {
      set.setNumber = index + 1;
    });
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    this.notify();
    return true;
  }

  addSetToExercise(exerciseIndex) {
    if (!this.activeWorkout) return;
    const ex = this.activeWorkout.exercises[exerciseIndex];
    const nextNum = ex.sets.length + 1;
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({
      setNumber: nextNum,
      weight: lastSet ? lastSet.weight : '',
      reps: lastSet ? lastSet.reps : 10,
      completed: false,
      rpe: ''
    });
    this.activeWorkout.updatedAt = Date.now();
    db.saveActiveSession(this.activeWorkout);
    this.notify();
  }

  finishWorkout() {
    if (!this.activeWorkout) return null;
    this.activeWorkout.endTime = new Date().toISOString();
    this.activeWorkout.updatedAt = Date.now();
    
    // Calcular duración
    const start = new Date(this.activeWorkout.startTime);
    const end = new Date(this.activeWorkout.endTime);
    this.activeWorkout.durationMinutes = Math.round((end - start) / 60000);

    const saved = db.saveWorkoutSession(this.activeWorkout);
    this.activeWorkout = null;
    this.notify();
    return saved;
  }

  cancelWorkout() {
    this.activeWorkout = null;
    db.clearActiveSession();
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this);
      } catch (err) {
        console.error('[State] Error en listener:', err);
      }
    });
  }
}

export const state = new AppState();
