// Estado reactivo global de la aplicación
import { db } from './services/db.js';
import { INITIAL_DATA } from './data/initialData.js';

class AppState {
  constructor() {
    this.activeTab = 'workout';
    this.selectedDay = 'torso1';
    this.activeWorkout = db.getActiveSession(); // Puede ser null o una sesión en progreso
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
      routineId,
      routineName: routine.name,
      dayName: routine.dayName,
      startTime: new Date().toISOString(),
      cardioDone: false,
      notes: '',
      exercises: routine.exercises.map(ex => {
        // Consultar registro previo para sugerir pesos
        const prev = db.getLastExerciseLog(ex.id);
        const suggestedWeight = prev ? prev.bestWeight : (ex.baseWeight === 'Pendiente' || ex.baseWeight === 'Auto' ? '' : ex.baseWeight);

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
          previousLog: prev,
          sets,
          notes: ''
        };
      })
    };

    db.saveActiveSession(this.activeWorkout);
    this.notify();
  }

  updateSet(exerciseIndex, setIndex, field, value) {
    if (!this.activeWorkout) return;
    this.activeWorkout.exercises[exerciseIndex].sets[setIndex][field] = value;
    db.saveActiveSession(this.activeWorkout);
    this.notify();
  }

  toggleSetCompleted(exerciseIndex, setIndex) {
    if (!this.activeWorkout) return;
    const current = this.activeWorkout.exercises[exerciseIndex].sets[setIndex].completed;
    this.activeWorkout.exercises[exerciseIndex].sets[setIndex].completed = !current;
    db.saveActiveSession(this.activeWorkout);
    this.notify();
    return !current; // retorna el nuevo estado
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
    db.saveActiveSession(this.activeWorkout);
    this.notify();
  }

  finishWorkout() {
    if (!this.activeWorkout) return null;
    this.activeWorkout.endTime = new Date().toISOString();
    
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
    this.listeners.forEach(cb => cb(this));
  }
}

export const state = new AppState();
