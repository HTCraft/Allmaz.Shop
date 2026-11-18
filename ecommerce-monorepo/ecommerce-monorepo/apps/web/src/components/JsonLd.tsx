/** Микроразметка schema.org (JSON-LD). Символ «<» экранируется, чтобы текст из БД не мог закрыть тег script */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
