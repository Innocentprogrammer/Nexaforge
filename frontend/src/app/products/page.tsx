"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing-shell";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Product, Paginated } from "@/lib/types";

function statusBadge(status: Product["status"]) {
  if (status === "OPERATIONAL") return <Badge variant="success">Operational</Badge>;
  if (status === "BETA") return <Badge variant="warning">Beta</Badge>;
  return <Badge>Coming Soon</Badge>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<Paginated<Product>>("/products/", { auth: false })
      .then((res) => setProducts(res.results))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 pb-10 pt-20 text-center">
        <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">
          The NexaForge Product Suite
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground/70">
          One platform, one account, a growing set of tools for running a modern business.
          NexaInvite is live today — every product below shares the same login, the same
          design system, and the same support team.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        {isLoading ? (
          <p className="text-center text-sm text-foreground/60">Loading products…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={i * 80}>
                <Card className="card-hover flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-heading text-xl font-semibold text-primary">
                      {product.name}
                    </h2>
                    {statusBadge(product.status)}
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground/60">{product.tagline}</p>
                  <p className="mt-4 flex-1 text-sm text-foreground/60">{product.description}</p>
                  <div className="mt-6 flex gap-3">
                    {product.href ? (
                      <>
                        <Link href={product.href} className="flex-1">
                          <Button variant="outline" className="w-full">
                            Learn More
                          </Button>
                        </Link>
                        <Link href="/register" className="flex-1">
                          <Button variant="primary" className="w-full">
                            Launch App
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <Button variant="ghost" className="w-full" disabled>
                        Notify me when it launches
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
