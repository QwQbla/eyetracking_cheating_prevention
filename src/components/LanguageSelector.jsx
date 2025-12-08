// src/components/LanguageSelector.jsx

import React from 'react';
import { LANGUAGE_CONFIG, SUPPORTED_LANGUAGES } from '../config/languages';
import styles from '../styles/LanguageSelector.module.css';

function LanguageSelector({ language, onLanguageChange, disabled = false }) {
  return (
    <div className={styles.languageSelector}>
      <label htmlFor="language-select" className={styles.label}>
        编程语言:
      </label>
      <select
        id="language-select"
        value={language}
        onChange={(e) => onLanguageChange(e.target.value)}
        disabled={disabled}
        className={styles.select}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_CONFIG[lang].name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default LanguageSelector;

