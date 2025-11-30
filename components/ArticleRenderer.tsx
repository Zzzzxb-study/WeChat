import React, { forwardRef } from 'react';
import { ArticleBlock, BlockType, EditorTheme, ImageAsset, ImageRatio } from '../types';

interface ArticleRendererProps {
  blocks: ArticleBlock[];
  theme: EditorTheme;
  images: ImageAsset[];
  imageRatio: ImageRatio;
}

const ArticleRenderer = forwardRef<HTMLDivElement, ArticleRendererProps>(({ blocks, theme, images, imageRatio }, ref) => {
  
  const getImageSrc = (tag: string) => {
    // Expected tag format: [IMG-1] or just IMG-1
    const idMatch = tag.match(/\d+/);
    if (!idMatch) return null;
    const index = parseInt(idMatch[0], 10) - 1; // 1-based to 0-based
    return images[index]?.previewUrl || null;
  };

  const getAspectRatioStyle = () => {
    switch (imageRatio) {
      case '1:1':
        return { aspectRatio: '1 / 1', objectFit: 'cover' as const };
      case '4:3':
        return { aspectRatio: '4 / 3', objectFit: 'cover' as const };
      default:
        return {};
    }
  };

  // Inline styles are used heavily here to ensure copy-paste compatibility with WeChat Editor
  const styles = {
    container: {
      fontFamily: theme.fontFamily,
      color: theme.colors.text,
      lineHeight: '1.8', // Increased line height slightly for better reading
      backgroundColor: theme.colors.background, 
      minHeight: '100%',
      padding: '24px',
    },
    title: {
      fontSize: '22px',
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: '32px',
      marginTop: '0px',
      lineHeight: '1.4',
    },
    heading: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: theme.colors.primary,
      borderLeft: `4px solid ${theme.colors.accent}`,
      paddingLeft: '12px',
      margin: '56px 0 24px 0', // SIGNIFICANTLY Increased top margin for "empty paragraph" effect
      display: 'flex',
      alignItems: 'center',
    },
    subheading: {
      fontSize: '16px',
      fontWeight: 'bold',
      color: theme.colors.secondary,
      margin: '32px 0 16px 0', // Increased spacing
    },
    paragraph: {
      fontSize: '15px', 
      marginBottom: '20px', // More breathing room between paragraphs
      textAlign: 'justify' as const,
      letterSpacing: '0.5px',
    },
    emphasis: {
      fontWeight: 'bold',
      color: theme.colors.accent,
    },
    quote: {
      backgroundColor: `${theme.colors.primary}10`, // lighter background
      borderLeft: `3px solid ${theme.colors.primary}`,
      padding: '16px 20px',
      margin: '32px 0',
      color: theme.colors.secondary,
      fontSize: '15px',
      borderRadius: theme.borderRadius,
    },
    list: {
      margin: '0 0 20px 0',
      paddingLeft: '0', // Reset padding, handle in item
    },
    imageContainer: {
      margin: '32px 0', 
    },
    image: {
      width: '100%', 
      borderRadius: theme.borderRadius,
      display: 'block',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)', // Softer shadow
      ...getAspectRatioStyle(),
    }
  };

  const renderContentWithEmbeddedImages = (content: string, isEmphasis: boolean = false) => {
    const parts = content.split(/(\[IMG-\d+\])/g);

    return parts.map((part, i) => {
      const imgMatch = part.match(/^\[IMG-(\d+)\]$/);
      if (imgMatch) {
         const src = getImageSrc(part);
         if (!src) {
           return (
             <span key={i} style={{ color: '#ccc', fontSize: '0.9em', display: 'inline-block' }}>
               {part}
             </span>
           );
         }
         return (
           <img 
             key={i} 
             src={src} 
             style={{ ...styles.image, margin: '16px 0' }} 
             alt="Asset" 
           />
         );
      }
      if (!part) return null;

      return isEmphasis ? (
         <span key={i} style={styles.emphasis}>{part}</span>
      ) : (
         <span key={i}>{part}</span>
      );
    });
  };

  const renderBlock = (block: ArticleBlock, index: number) => {
    switch (block.type) {
      case BlockType.TITLE:
        return <h1 key={index} style={styles.title}>{block.content}</h1>;
      
      case BlockType.HEADING:
        return <h2 key={index} style={styles.heading}>{block.content}</h2>;
      
      case BlockType.SUBHEADING:
        return <h3 key={index} style={styles.subheading}>{block.content}</h3>;
      
      case BlockType.PARAGRAPH:
        return (
          <p key={index} style={styles.paragraph}>
            {renderContentWithEmbeddedImages(block.content, block.isEmphasis)}
          </p>
        );

      case BlockType.QUOTE:
        return (
          <div key={index} style={styles.quote}>
            {renderContentWithEmbeddedImages(block.content)}
          </div>
        );

      case BlockType.LIST_ITEM:
        return (
           <div key={index} style={{...styles.paragraph, display: 'flex', alignItems: 'start', marginBottom: '12px'}}>
              {/* If content starts with a number (1.), use it as the marker. Else use bullet. */}
              {/^\d+\./.test(block.content) ? (
                <span style={{ fontWeight: 'bold', color: theme.colors.accent, marginRight: '12px', minWidth: '20px' }}>
                  {block.content.split(' ')[0]}
                </span>
              ) : (
                <span style={{ color: theme.colors.accent, marginRight: '12px', fontSize: '1.2em', lineHeight: '1' }}>•</span>
              )}
              
              <div style={{ flex: 1 }}>
                {/* Remove the leading number if we rendered it separately, or just render whole if complex */}
                {renderContentWithEmbeddedImages(
                  /^\d+\./.test(block.content) ? block.content.substring(block.content.indexOf(' ') + 1) : block.content
                )}
              </div>
           </div>
        );

      case BlockType.IMAGE_PLACEHOLDER:
        const src = getImageSrc(block.content);
        if (!src) {
           return (
             <div key={index} style={{ ...styles.imageContainer, border: '1px dashed #e5e7eb', borderRadius: '8px', padding: '32px', color: '#9ca3af', textAlign: 'center', fontSize: '14px' }}>
               {block.content}
             </div>
           )
        }
        return (
          <div key={index} style={styles.imageContainer}>
            <img src={src} alt="Article Asset" style={styles.image} />
          </div>
        );

      default:
        return <p key={index} style={styles.paragraph}>{block.content}</p>;
    }
  };

  return (
    <div 
      ref={ref} 
      style={styles.container}
    >
      {blocks.map((block, i) => renderBlock(block, i))}
      
      <div style={{ marginTop: '80px', textAlign: 'center', fontSize: '12px', color: '#cbd5e1' }}>
        <span style={{ display: 'inline-block', width: '24px', height: '1px', background: '#e2e8f0', verticalAlign: 'middle', margin: '0 12px' }}></span>
        END
        <span style={{ display: 'inline-block', width: '24px', height: '1px', background: '#e2e8f0', verticalAlign: 'middle', margin: '0 12px' }}></span>
      </div>
    </div>
  );
});

ArticleRenderer.displayName = 'ArticleRenderer';

export default ArticleRenderer;
