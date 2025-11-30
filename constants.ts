import { EditorTheme } from './types';

export const THEMES: EditorTheme[] = [
  {
    id: 'minimalist',
    name: '极简白',
    description: 'Clean, modern, and spacious. Best for general reading.',
    colors: {
      primary: '#333333',
      secondary: '#666666',
      text: '#333333',
      background: '#ffffff',
      accent: '#000000', // Underlines or bold
    },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif',
    borderRadius: '0px',
  },
  {
    id: 'literary',
    name: '文艺暖',
    description: 'Warm tones, serif fonts. Great for emotional or story-telling content.',
    colors: {
      primary: '#8B5E3C', // Brownish
      secondary: '#A67B5B',
      text: '#4A4A4A',
      background: '#FDFBF7', // Off-white
      accent: '#D4A373',
    },
    fontFamily: '"Songti SC", "SimSun", serif',
    borderRadius: '4px',
  },
  {
    id: 'tech',
    name: '科技蓝',
    description: 'Professional, blue accents. Good for tutorials and news.',
    colors: {
      primary: '#1E88E5',
      secondary: '#64B5F6',
      text: '#263238',
      background: '#FFFFFF',
      accent: '#1565C0',
    },
    fontFamily: 'system-ui, sans-serif',
    borderRadius: '8px',
  },
  {
    id: 'fresh',
    name: '清新绿',
    description: 'Natural and vibrant. Suitable for lifestyle and health.',
    colors: {
      primary: '#43A047',
      secondary: '#81C784',
      text: '#1B5E20',
      background: '#FAFFF9',
      accent: '#2E7D32',
    },
    fontFamily: 'sans-serif',
    borderRadius: '12px',
  },
  {
    id: 'future',
    name: '未来风',
    description: 'Neon accents, high contrast, cyberpunk aesthetic.',
    colors: {
      primary: '#7C3AED', // Violet
      secondary: '#DB2777', // Neon Pink
      text: '#1F2937', // Dark Slate
      background: '#F5F3FF', // Very light violet tint
      accent: '#06B6D4', // Cyan
    },
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    borderRadius: '0px',
  }
];

export const INITIAL_CONTENT = `在这里输入你的文章内容...

你可以直接粘贴大段文字。
如果需要插入图片，请将光标移动到想插入的位置，点击上方的“插入图片”按钮。
点击右侧的“AI 一键排版”开始美化。`;