/**
 * srs.js — Spaced Repetition System (SM-2 lightweight variant)
 * Manages review intervals for vocabulary words.
 */
const SRS = {
  getInitial() {
    return {
      dueDate: null,
      intervalDays: 0,
      easeFactor: 2.5,
      streak: 0,
      wrongCount: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      learned: false,
      learnedDate: null
    };
  },

  /**
   * Update progress record based on quiz result.
   * @param {object} prog  - existing progress object (mutated in place)
   * @param {boolean} correct - whether the user answered correctly
   * @returns {object} updated progress
   */
  update(prog, correct) {
    prog.totalAttempts = (prog.totalAttempts || 0) + 1;

    if (correct) {
      prog.totalCorrect = (prog.totalCorrect || 0) + 1;
      prog.streak = (prog.streak || 0) + 1;

      if (!prog.learned) {
        prog.learned = true;
        prog.learnedDate = SRS._todayStr();
        prog.intervalDays = 1;
      } else if (prog.streak === 1) {
        prog.intervalDays = 1;
      } else if (prog.streak === 2) {
        prog.intervalDays = 3;
      } else {
        prog.intervalDays = Math.min(
          Math.round((prog.intervalDays || 1) * (prog.easeFactor || 2.5)),
          60
        );
      }
      prog.easeFactor = Math.min(2.8, (prog.easeFactor || 2.5) + 0.1);
    } else {
      prog.wrongCount = (prog.wrongCount || 0) + 1;
      prog.streak = 0;
      prog.intervalDays = 1;
      prog.easeFactor = Math.max(1.3, (prog.easeFactor || 2.5) - 0.2);
      if (!prog.learned) {
        prog.learned = true;
        prog.learnedDate = SRS._todayStr();
      }
    }

    const due = new Date();
    due.setDate(due.getDate() + (prog.intervalDays || 1));
    prog.dueDate = due.toISOString().split('T')[0];

    return prog;
  },

  /** Is this word due for review today or earlier? */
  isDue(prog) {
    if (!prog || !prog.learned) return false;
    return prog.dueDate <= SRS._todayStr();
  },

  _todayStr() {
    return new Date().toISOString().split('T')[0];
  }
};
