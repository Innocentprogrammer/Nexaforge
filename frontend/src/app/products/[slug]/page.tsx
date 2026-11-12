"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MarketingShell } from "@/components/marketing-shell";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

export default function ProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    api.get<Product>(`/products/${params.slug}/`, { auth: false })
      .then(setProduct)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  return (
    <MarketingShell>
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted hover:text-heading">
          <Icon name="arrow-left" size={15} /> All products
        </Link>
        {loading ? (
          <div className="mt-8 space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-48 w-full" /></div>
        ) : error || !product ? (
          <Card className="mt-8 p-8 text-center"><h1 className="font-heading text-2xl font-semibold">Product not found</h1><p className="mt-2 text-muted">This product may have been removed or is not currently available.</p><Link href="/products"><Button className="mt-5">Browse products</Button></Link></Card>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-4xl font-bold tracking-tight text-heading">{product.name}</h1>
              <Badge variant={product.status === "OPERATIONAL" ? "success" : product.status === "BETA" ? "warning" : "default"} dot>
                {product.status === "OPERATIONAL" ? "Operational" : product.status === "BETA" ? "Beta" : "Coming Soon"}
              </Badge>
            </div>
            <p className="mt-3 text-xl font-medium text-foreground/80">{product.tagline}</p>
            <p className="mt-6 max-w-3xl text-base leading-8 text-muted">{product.description}</p>
            {(product.legacy_tagline && product.legacy_tagline !== product.tagline) ||
            (product.legacy_description && product.legacy_description !== product.description) ? (
              <Card className="mt-6 max-w-3xl bg-surface-2/50">
                <h2 className="font-heading text-sm font-semibold text-heading">Previous product information</h2>
                {product.legacy_tagline && product.legacy_tagline !== product.tagline && (
                  <p className="mt-2 text-sm font-medium text-foreground/80">{product.legacy_tagline}</p>
                )}
                {product.legacy_description && product.legacy_description !== product.description && (
                  <p className="mt-2 text-sm leading-6 text-muted">{product.legacy_description}</p>
                )}
              </Card>
            ) : null}
            {product.highlights?.length > 0 && (
              <section className="mt-10">
                <h2 className="font-heading text-2xl font-semibold text-heading">Why it matters</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {product.highlights.map((item) => <Card key={item} className="p-5"><Icon name="check-circle" size={18} className="text-success" /><p className="mt-3 text-sm leading-6 text-muted">{item}</p></Card>)}
                </div>
              </section>
            )}
            {product.features?.length > 0 && (
              <section className="mt-10">
                <h2 className="font-heading text-2xl font-semibold text-heading">Product capabilities</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {product.features.map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"><Icon name="check" size={16} className="text-success" /><span className="text-sm text-foreground">{item}</span></div>)}
                </div>
              </section>
            )}
            {product.target_audience?.length > 0 && (
              <section className="mt-10">
                <h2 className="font-heading text-2xl font-semibold text-heading">Who it is for</h2>
                <div className="mt-4 flex flex-wrap gap-2">{product.target_audience.map((item) => <Badge key={item}>{item}</Badge>)}</div>
              </section>
            )}
            <div className="mt-12 flex flex-wrap gap-3">
              {product.status === "OPERATIONAL" ? <Link href="/templates"><Button>Explore invitation cards <Icon name="arrow-right" size={16} /></Button></Link> : <Link href="/contact"><Button>Talk to our team</Button></Link>}
              <Link href="/contact"><Button variant="outline">Contact us</Button></Link>
            </div>
          </>
        )}
      </main>
    </MarketingShell>
  );
}
