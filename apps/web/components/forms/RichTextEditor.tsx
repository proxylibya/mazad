/**
 * محرر نصوص غني
 */

import React, { useCallback, useRef, useState } from 'react';

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: number;
  maxLength?: number;
  disabled?: boolean;
  error?: string;
  className?: string;
  toolbar?: ('bold' | 'italic' | 'underline' | 'list' | 'link' | 'heading')[];
}

const defaultToolbar: RichTextEditorProps['toolbar'] = [
  'bold',
  'italic',
  'underline',
  'list',
  'link',
  'heading',
];

type ToolbarItem = NonNullable<RichTextEditorProps['toolbar']>[number];

type ToolbarButton = {
  icon: string;
  command: () => void;
  title: string;
  className?: string;
};

export function RichTextEditor({
  value = '',
  onChange,
  label,
  placeholder = 'اكتب هنا...',
  minHeight = 200,
  maxLength,
  disabled = false,
  error,
  className = '',
  toolbar = defaultToolbar,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const execCommand = useCallback(
    (command: string, value?: string) => {
      document.execCommand(command, false, value);
      editorRef.current?.focus();

      // تحديث القيمة
      if (editorRef.current) {
        onChange?.(editorRef.current.innerHTML);
      }
    },
    [onChange],
  );

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      let content = editorRef.current.innerHTML;

      // التحقق من الحد الأقصى للنص
      if (maxLength) {
        const textLength = editorRef.current.textContent?.length || 0;
        if (textLength > maxLength) {
          // قص النص
          return;
        }
      }

      onChange?.(content);
    }
  }, [onChange, maxLength]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  const handleLink = () => {
    const url = prompt('أدخل رابط URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const toolbarButtons: Record<ToolbarItem, ToolbarButton> = {
    bold: { icon: 'B', command: () => execCommand('bold'), title: 'عريض' },
    italic: { icon: 'I', command: () => execCommand('italic'), title: 'مائل', className: 'italic' },
    underline: {
      icon: 'U',
      command: () => execCommand('underline'),
      title: 'تسطير',
      className: 'underline',
    },
    list: { icon: '•', command: () => execCommand('insertUnorderedList'), title: 'قائمة' },
    link: { icon: '🔗', command: handleLink, title: 'رابط' },
    heading: { icon: 'H', command: () => execCommand('formatBlock', 'h3'), title: 'عنوان' },
  };

  const textLength = editorRef.current?.textContent?.length || 0;

  return (
    <div className={className}>
      {label && <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>}

      <div
        className={`overflow-hidden rounded-lg border ${error ? 'border-red-500' : isFocused ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-300'} ${disabled ? 'bg-gray-100' : 'bg-white'} `}
      >
        {/* شريط الأدوات */}
        <div className="flex items-center gap-1 border-b bg-gray-50 p-2">
          {toolbar?.map((tool) => {
            const button = toolbarButtons[tool];
            return (
              <button
                key={tool}
                type="button"
                onClick={button.command}
                disabled={disabled}
                title={button.title}
                className={`rounded px-3 py-1.5 text-sm font-medium ${disabled ? 'text-gray-400' : 'text-gray-700 hover:bg-gray-200'} ${button.className || ''} `}
              >
                {button.icon}
              </button>
            );
          })}
        </div>

        {/* منطقة التحرير */}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          dangerouslySetInnerHTML={{ __html: value }}
          data-placeholder={placeholder}
          className={`prose prose-sm max-w-none p-4 outline-none ${disabled ? 'text-gray-500' : 'text-gray-900'} [&:empty]:before:text-gray-400 [&:empty]:before:content-[attr(data-placeholder)]`}
          style={{ minHeight }}
          dir="rtl"
        />

        {/* شريط المعلومات */}
        <div className="flex items-center justify-between border-t bg-gray-50 px-3 py-2 text-xs text-gray-500">
          <span>{maxLength ? `${textLength} / ${maxLength}` : `${textLength} حرف`}</span>
          <span>HTML مدعوم</span>
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

export default RichTextEditor;
