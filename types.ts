export enum BlockType {
  TITLE = 'title',
  HEADING = 'heading',
  SUBHEADING = 'subheading',
  PARAGRAPH = 'paragraph',
  QUOTE = 'quote',
  LIST_ITEM = 'list_item',
  IMAGE_PLACEHOLDER = 'image_placeholder'
}

export interface ArticleBlock {
  type: BlockType;
  content: string;
  isEmphasis?: boolean;
  isGoldenQuote?: boolean;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  accent: string;
}

export interface EditorTheme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  fontFamily: string;
  borderRadius: string;
}

export interface ImageAsset {
  id: string;
  file?: File; // Optional now as generated images might not have a File object initially
  previewUrl: string;
}

export type ImageRatio = 'original' | '1:1' | '4:3';

export type ImageResolution = '1K' | '2K' | '4K';
export type ImageGenAspectRatio = '1:1' | '4:3' | '16:9';
export type ImageModelType = 'flash' | 'pro';

// New types for Article Writer
export type AppView = 'editor' | 'writer';

export interface SearchSource {
  title: string;
  uri: string;
}

export interface GeneratedArticle {
  id: string;
  timestamp: number;
  title: string;
  content: string;
  sources: SearchSource[];
}