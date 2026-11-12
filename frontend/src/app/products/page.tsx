"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { SkeletonGrid } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";
import type { Product, Paginated } from "@/lib/types";

function statusBadge(status: Product["status"]) {
  if (status === "OPERATIONAL") return <Badge variant="success" dot>Operational</Badge>;
  if (status === "BETA") return <Badge variant="warning" dot>Beta</Badge>;
  return <Badge dot>Coming Soon</Badge>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<Product>>("/products/", { auth: false })
      .then((res) => setProducts(res.results))
      .catch(() => setLoadError("Could not connect to the product catalogue. Please try again."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="ambient animate-pulse-soft -right-20 -top-24 h-80 w-80 bg-secondary/20" aria-hidden />
        <div className="relative mx-auto max-w-4xl px-4 pb-12 pt-20 text-center sm:px-6">
          <h1 className="animate-fade-in-up font-heading text-3xl font-bold tracking-tight text-heading sm:text-4xl">
            The NexaForge Product Suite
          </h1>
          <p
            className="animate-fade-in-up mx-auto mt-5 max-w-2xl text-lg leading-8 text-foreground/70"
            style={{ animationDelay: "100ms" }}
          >
            One platform, one account, a growing set of tools for running a modern business.
            NexaInvite is live today — every product below shares the same login, the same design
            system, and the same support team.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {isLoading ? (
          <SkeletonGrid count={6} />
        ) : loadError ? (
          <Card className="p-6 text-center text-sm text-muted">{loadError}</Card>
        ) : products.length === 0 ? (
          <Card className="p-0">
            <EmptyState
              icon="inbox"
              title="Products couldn't be loaded"
              description="Refresh the page, or get in touch and we'll walk you through the suite."
              action={
                <Link href="/contact">
                  <Button variant="outline">Contact us</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={i * 80}>
                <Card interactive className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-xl font-semibold tracking-tight text-heading">
                      {product.name}
                    </h2>
                    {statusBadge(product.status)}
                  </div>
                  <p className="mt-1.5 text-sm font-medium text-foreground/70">{product.tagline}</p>
                  <p className="mt-4 flex-1 text-sm leading-6 text-muted">{product.description}</p>
                  <div className="mt-6 flex gap-3">
                    <Link href={product.href || `/products/${product.slug}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        Learn More
                      </Button>
                    </Link>
                    {product.status === "OPERATIONAL" ? (
                      <Link href="/templates" className="flex-1">
                        <Button variant="primary" className="w-full">
                          Launch App
                          <Icon name="arrow-up-right" size={16} />
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="ghost" className="flex-1" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </Card>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </MarketingShell>
  );
}
