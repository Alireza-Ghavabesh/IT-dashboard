import React from 'react';

interface RichTextDisplayProps {
  content?: string | null;
  className?: string;
  fallbackText?: string;
}

export const RichTextDisplay: React.FC<RichTextDisplayProps> = ({
  content,
  className = '',
  fallbackText = ''
}) => {
  if (!content || !content.trim()) {
    return fallbackText ? <span className="text-[#9A9890] italic">{fallbackText}</span> : null;
  }

  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div
        className={`rich-text-content break-words leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}>
      {content}
    </div>
  );
};
