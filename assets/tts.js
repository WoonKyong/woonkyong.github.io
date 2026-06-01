/**
 * tts.js — Text-to-Speech wrapper using SpeechSynthesis API
 * Handles voice loading (async on iOS) and graceful fallback.
 */
const TTS = {
  _voices: [],
  _ready: false,

  init() {
    if (!window.speechSynthesis) return;

    const load = () => {
      this._voices = window.speechSynthesis.getVoices();
      this._ready = true;
    };

    // Voices may load asynchronously (especially on Chrome)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
    load();
  },

  /**
   * Speak the given English text.
   * Must be called from a user-gesture handler (iOS requirement).
   * @param {string} text
   * @returns {boolean} true if speech was triggered
   */
  speak(text) {
    if (!window.speechSynthesis) return false;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick the best available English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang === 'en-US' && !v.localService === false)
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en-'))
      || voices.find(v => v.lang.startsWith('en'));

    if (preferred) utterance.voice = preferred;

    window.speechSynthesis.speak(utterance);
    return true;
  },

  isSupported() {
    return !!window.speechSynthesis;
  }
};
