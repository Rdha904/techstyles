"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Fingerprint,
  Globe,
  Users,
} from "lucide-react";
import type { BrandProfile } from "@/lib/brand-types";
import "./concept-overview.css";

export function ConceptOverview() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/brand-profile", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load profile");
        return response.json() as Promise<{ profile: BrandProfile | null }>;
      })
      .then(({ profile }) => {
        setProfile(profile);
        setStatus("loaded");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const cards = [
    {
      title: "Brand Profile",
      slug: "brand-profile",
      icon: Fingerprint,
      tone: "blue",
      eyebrow: "YOUR FOUNDATION",
      description:
        "Define your identity, values and visual direction. One shared profile for your designs and marketing.",
      status:
        status === "loading"
          ? "Loading…"
          : status === "error"
            ? "Status unavailable"
            : profile
              ? "Saved profile"
              : "Not started",
      action:
        status !== "loaded"
          ? "Open brand profile"
          : profile
            ? "View brand profile"
            : "Create brand profile",
      detail: profile
        ? profile.name
        : "Start with a website, files or a clothing template.",
      available: true,
    },
    {
      title: "Brand Book",
      slug: "brand-book",
      icon: BookOpen,
      tone: "violet",
      eyebrow: "YOUR GUIDELINES",
      description:
        "Bring your logo, colors, typography and tone of voice together in a consistent brand guide.",
      status: "Coming soon",
      action: "View brand book workspace",
      detail: "A home for the rules behind your brand.",
      available: false,
    },
    {
      title: "Target Audience",
      slug: "target-audience",
      icon: Users,
      tone: "teal",
      eyebrow: "YOUR PEOPLE",
      description:
        "Explore who you design for: their style, needs and buying habits, from first discovery to loyalty.",
      status: "Coming soon",
      action: "View audience workspace",
      detail: "Turn audience insights into a clear creative direction.",
      available: false,
    },
    {
      title: "Brand Website",
      slug: "brand-website",
      icon: Globe,
      tone: "amber",
      eyebrow: "YOUR ONLINE PRESENCE",
      description:
        "Shape a digital home for your clothing brand, from its story and collections to its visual identity.",
      status: "Coming soon",
      action: "View website workspace",
      detail: "Bring your brand identity to the web.",
      available: false,
    },
  ];

  return (
    <section
      className="concept-overview"
      aria-labelledby="concept-overview-title"
    >
      <header className="concept-overview-intro">
        <span className="module-eyebrow">CONCEPT &amp; AUDIENCE</span>
        <h2 id="concept-overview-title">Build the foundation of your brand</h2>
        <p>
          Define who you are, who you create for and how your brand shows up.
        </p>
      </header>
      <div className="concept-overview-grid">
        {cards.map((card) => (
          <Link
            key={card.slug}
            href={`/modules/concept/${card.slug}`}
            className={`concept-area-card ${card.tone}`}
          >
            <div className="concept-area-top">
              <span className="concept-area-icon">
                <card.icon size={26} strokeWidth={1.7} />
              </span>
              <span
                className={`concept-area-status ${card.available ? "available" : ""}`}
              >
                {card.status}
              </span>
            </div>
            <div className="concept-area-copy">
              <span className="concept-area-eyebrow">{card.eyebrow}</span>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
            <div className="concept-area-detail">{card.detail}</div>
            <div className="concept-area-action">
              <span>{card.action}</span>
              <ArrowUpRight size={19} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
