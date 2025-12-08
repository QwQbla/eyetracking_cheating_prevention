// src/config/languages.js
// 支持的编程语言配置

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { cpp } from '@codemirror/lang-cpp';

// 语言配置映射
export const LANGUAGE_CONFIG = {
  javascript: {
    name: 'JavaScript',
    extension: javascript({ jsx: true }),
    defaultCode: '// 在此输入代码...\n\n',
    runner: 'javascript', // 用于代码执行的标识
  },
  python: {
    name: 'Python',
    extension: python(),
    defaultCode: '# 在此输入代码...\n\n',
    runner: 'python',
  },
  java: {
    name: 'Java',
    extension: java(),
    defaultCode: '// 在此输入代码...\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
    runner: 'java',
  },
  cpp: {
    name: 'C++',
    extension: cpp(),
    defaultCode: '// 在此输入代码...\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
    runner: 'cpp',
  },
};

// 支持的语言列表
export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG);

// 默认语言
export const DEFAULT_LANGUAGE = 'javascript';

