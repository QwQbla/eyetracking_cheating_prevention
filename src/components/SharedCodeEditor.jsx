// src/components/SharedCodeEditor.jsx

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

function SharedCodeEditor({ code, onCodeChange }) {
  return (
      <CodeMirror
        value={code}
        theme={vscodeDark}
        extensions={[javascript({ jsx: true })]}
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