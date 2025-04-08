'use client';

import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { dracula } from '@uiw/codemirror-theme-dracula';

interface CodeEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'json';
  placeholder?: string;
  height?: string;
  className?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  id,
  value,
  onChange,
  language = 'javascript',
  placeholder = '',
  height = '200px',
  className = '',
  readOnly = false,
}) => {
  const [mounted, setMounted] = useState(false);
  
  // Handle server-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get the language extension based on the language prop
  const getLanguageExtension = () => {
    switch (language) {
      case 'javascript':
        return javascript();
      case 'json':
        return json();
      default:
        return javascript();
    }
  };

  if (!mounted) {
    return (
      <div 
        style={{ height }}
        className={`w-full border rounded-md bg-gray-50 text-gray-400 p-4 ${className}`}
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {value === '' && (
        <div className="absolute text-gray-400 pointer-events-none p-3 z-10">
          {placeholder}
        </div>
      )}
      <CodeMirror
        id={id}
        value={value}
        height={height}
        extensions={[getLanguageExtension()]}
        onChange={onChange}
        theme={dracula}
        readOnly={readOnly}
        className={`border rounded-md overflow-hidden ${className}`}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: true,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: true,
          foldKeymap: true,
          completionKeymap: true,
          lintKeymap: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;