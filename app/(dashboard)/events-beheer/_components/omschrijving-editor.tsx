'use client'

import { Editor } from '@tinymce/tinymce-react'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  height?: number
}

export function OmschrijvingEditor({ value, onChange, placeholder, height = 280 }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY
  const tekstHint = placeholder ?? 'Beschrijving, programma, artiesten...'

  if (!apiKey) {
    return (
      <div className="space-y-2">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={8}
          placeholder={tekstHint}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opstap-orange-500 transition-colors resize-y min-h-40"
        />
        <p className="text-xs text-amber-400">
          TinyMCE is niet geladen — zet NEXT_PUBLIC_TINYMCE_API_KEY in .env.local.
        </p>
      </div>
    )
  }

  return (
    <Editor
      apiKey={apiKey}
      value={value}
      onEditorChange={html => onChange(html)}
      init={{
        height,
        menubar: false,
        branding: false,
        language: 'nl',
        plugins: 'lists link autolink',
        toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | removeformat',
        block_formats: 'Alinea=p; Kop 2=h2; Kop 3=h3; Kop 4=h4',
        placeholder: tekstHint,
        skin: 'oxide-dark',
        content_css: 'dark',
        content_style: 'body { font-family: Inter, system-ui, sans-serif; font-size: 14px; }',
        link_default_target: '_blank',
        convert_urls: false,
      }}
    />
  )
}
