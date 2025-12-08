// src/components/SharedCodeEditor.jsx

import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { LANGUAGE_CONFIG, DEFAULT_LANGUAGE } from '../config/languages';

function SharedCodeEditor({ code, onCodeChange, language = DEFAULT_LANGUAGE }) {
  // 根据语言动态获取对应的 CodeMirror 扩展
  const extensions = useMemo(() => {
    const langConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG[DEFAULT_LANGUAGE];
    return [langConfig.extension];
  }, [language]);

  return (
      <CodeMirror
        value={code}
        theme={vscodeDark}
        extensions={extensions}
        onChange={onCodeChange}
        height='500px'
        style={{
          fontSize: '16px',
          fontFamily: 'monospace',
          width: '100%',
          height: '100%',
          flexGrow: 1, 
          overflow: 'auto',
          borderRadius: '8px', 
        }}
      />
  );
}

export default SharedCodeEditor;