/**
 * Structured data for search engines (schema.org JSON-LD). "<" is escaped so data can never close the
 * script tag early, as the Next.js JSON-LD guide recommends.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
