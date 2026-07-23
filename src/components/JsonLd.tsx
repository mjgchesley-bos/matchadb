// Renders a JSON-LD <script> tag. All callers pass data sourced from our
// own database (brand/product names, prices), never raw user input, but the
// "</script>" escape is cheap insurance against a product/brand name that
// happens to contain that literal substring breaking out of the tag.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
