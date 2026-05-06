import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';
import './RichTextEditor.css';

const RichTextEditor = ({ value, onChange, placeholder = 'Enter text...' }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        'aria-label': placeholder,
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const nextValue = value || '';
    if (editor.getHTML() !== nextValue) {
      editor.commands.setContent(nextValue, false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleCode().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();
  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="rich-text-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={toggleBold}
          className={`toolbar-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Bold"
        >
          <span className="material-symbols-rounded">format_bold</span>
        </button>
        <button
          type="button"
          onClick={toggleItalic}
          className={`toolbar-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Italic"
        >
          <span className="material-symbols-rounded">format_italic</span>
        </button>
        <button
          type="button"
          onClick={toggleUnderline}
          className={`toolbar-btn ${editor.isActive('code') ? 'active' : ''}`}
          title="Code/Monospace"
        >
          <span className="material-symbols-rounded">code</span>
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          onClick={toggleBulletList}
          className={`toolbar-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          title="Bullet List"
        >
          <span className="material-symbols-rounded">format_list_bulleted</span>
        </button>
        <button
          type="button"
          onClick={toggleOrderedList}
          className={`toolbar-btn ${editor.isActive('orderedList') ? 'active' : ''}`}
          title="Ordered List"
        >
          <span className="material-symbols-rounded">format_list_numbered</span>
        </button>
        <div className="toolbar-divider"></div>
        <button
          type="button"
          onClick={addLink}
          className={`toolbar-btn ${editor.isActive('link') ? 'active' : ''}`}
          title="Add Link"
        >
          <span className="material-symbols-rounded">link</span>
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};

export default RichTextEditor;
