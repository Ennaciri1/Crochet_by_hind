import Image from "next/image";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import { PostGrid } from "@/components/PostCard";
import { getPostsByCategory } from "@/lib/posts";
import { productFaq, productStructuredData, pinterestUrl, type ProductContent } from "@/lib/product-model";
import { SITE_URL } from "@/lib/site";
import { EtsyButton, MobilePurchase, PinterestShare, ProductView } from "./ProductActions";
import { ProductGallery, ProductVideo } from "./ProductMedia";
import "./product.css";

function Paragraphs({ text }: { text: string }) {
  return <>{text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</>;
}

export default async function ProductLanding({ product, preview = false }: { product: ProductContent; preview?: boolean }) {
  const related = await getPostsByCategory("home-decor", 3);
  const identity = { sku: product.sku, name: product.name };
  const faq = productFaq(product);
  return (
    <article className="pattern-product">
      <ProductView product={identity} preview={preview} />
      <JsonLd data={productStructuredData(product, SITE_URL)} />
      <div className="wrap">
        {preview && <div className="product-draft-banner" role="status"><strong>Private draft preview</strong><span>Not published or indexed. Physical test-knitting and content review are required before publication.</span></div>}
        <Breadcrumbs items={[{ name: preview ? "Product drafts" : "PDF patterns", href: preview ? "/admin/products" : "/patterns" }, { name: product.name, href: `/patterns/${product.slug}` }]} />
        <div className="product-hero">
          <ProductGallery images={product.gallery} product={identity} preview={preview} />
          <header className="product-presentation">
            <p className="product-eyebrow">{product.brand} · Christmas knitting</p>
            <h1>{product.headline}</h1>
            <p className="product-intro">{product.intro}</p>
            <p className="product-format">Digital PDF knitting pattern · not a finished gnome</p>
            <EtsyButton product={identity} etsyUrl={product.etsyUrl} preview={preview} placement="hero" />
            <p className="product-purchase-note">Choose your yarn. Make it your Christmas.</p>
            <div className="product-disclosure">
              <strong>{product.validated ? "About these images" : "An honest note about this draft"}</strong>
              <p>{!product.validated && "This pattern has not yet been physically test-knit. "}The images and video are generated illustrations of the intended design, not photographs of a verified sample. {!product.validated && "Measurements and yarn quantities remain estimates."}</p>
            </div>
            <dl className="product-specs">
              {[["The pattern", `${product.pdfPages} pages · digital PDF`], ["Skill level", product.skillLevel], ["Language", `${product.language} · ${product.terminology}`], ["Yarn", product.yarn], ["Needles", product.needles], ["The design", "Shelf sitter with dangling legs"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            <PinterestShare product={identity} href={pinterestUrl(product, SITE_URL)} title={product.pinterestTitle} description={product.pinterestDescription} preview={preview} />
          </header>
        </div>

        <section className="product-story product-section" aria-labelledby="product-story-title"><p className="product-eyebrow">Small details, seasonal character</p><h2 id="product-story-title">A Christmas corner, with a little company.</h2><div className="product-prose"><Paragraphs text={product.story} /></div></section>

        <section className="product-included product-section" aria-labelledby="product-included-title">
          <div><p className="product-eyebrow">Inside the pattern</p><h2 id="product-included-title">What’s included in the PDF</h2><p className="product-section-intro">Written instructions to keep beside your needles, from the first stitches to the finishing details.</p></div>
          <ol>{product.included.map((item, index) => <li key={index}><span aria-hidden="true">0{index + 1}</span><p>{item}</p></li>)}</ol>
        </section>

        <section className="product-making product-section" aria-labelledby="product-materials-title">
          <div><p className="product-eyebrow">Before you cast on</p><h2 id="product-materials-title">Materials &amp; knitting skills</h2><h3>A small, festive palette</h3><ul className="product-material-list">{product.materials.map((item, index) => <li key={index}>{item}</li>)}</ul></div>
          <div className="product-prose"><h3>The techniques to know</h3><Paragraphs text={product.skills} /></div>
        </section>

        <section className="product-film product-section" aria-labelledby="product-film-title">
          <div className="product-film-copy"><p className="product-eyebrow">A closer look</p><h2 id="product-film-title">Fifteen seconds of festive inspiration.</h2><p>Watch a quiet design presentation of the striped hat, soft-looking beard and dangling boots. This silent video is a presentation of generated illustrations, not a making tutorial or a filmed test-knit.</p><a className="product-text-link" href="#product-materials-title">Plan your materials ↓</a></div>
          <figure><ProductVideo video={product.video} product={identity} preview={preview} /><figcaption>15-second design presentation · generated illustrations · no audio</figcaption></figure>
        </section>

        <section className="product-decorating product-section" aria-labelledby="product-decorating-title">
          <figure><Image src={product.decorImage.src} width={product.decorImage.width} height={product.decorImage.height} alt={product.decorImage.alt} sizes="(max-width: 767px) 85vw, 380px" quality={85} loading="lazy" /><figcaption>{product.decorImage.caption}</figcaption></figure>
          <div><p className="product-eyebrow">Make room for Christmas</p><h2 id="product-decorating-title">From a quiet shelf to the Christmas mantel</h2><div className="product-prose"><Paragraphs text={product.decorating} /></div></div>
        </section>

        <section className="product-faq product-section" aria-labelledby="product-faq-title"><p className="product-eyebrow">A few helpful answers</p><h2 id="product-faq-title">Before you choose your pattern</h2>{faq.map((item) => <details key={item.q}><summary>{item.q}<span aria-hidden="true">+</span></summary><p>{item.a}</p></details>)}</section>

        {related.length > 0 && <section className="product-related product-section" aria-labelledby="product-related-title"><p className="product-eyebrow">Keep the festive ideas coming</p><h2 id="product-related-title">More Christmas patterns &amp; handmade ideas</h2><p>Explore related crochet projects for your seasonal shelves, tree and home.</p><PostGrid posts={related} eager={0} /></section>}

        <section className="product-final" aria-labelledby="product-final-title"><p className="product-eyebrow">Hearthside Shelf Gnome</p><h2 id="product-final-title">A little Christmas character,<br />made at your own pace.</h2><p>{product.closing}</p><EtsyButton product={identity} etsyUrl={product.etsyUrl} preview={preview} placement="final" /><small>Digital PDF knitting pattern. No physical item is included.</small></section>
      </div>
      <MobilePurchase product={identity} etsyUrl={product.etsyUrl} preview={preview} />
    </article>
  );
}
