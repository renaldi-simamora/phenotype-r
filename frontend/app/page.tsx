'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Radio,
  Gauge,
  Sliders,
  Binary,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  CheckCircle2,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  // Refs for GSAP targets
  const heroRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subtextRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const hardwareCardRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const pill1Ref = useRef<HTMLDivElement>(null);
  const pill2Ref = useRef<HTMLDivElement>(null);
  const accuracyValueRef = useRef<HTMLDivElement>(null);

  const techSectionRef = useRef<HTMLDivElement>(null);
  const howSectionRef = useRef<HTMLDivElement>(null);
  const fusionSectionRef = useRef<HTMLDivElement>(null);
  const fusionCardRef = useRef<HTMLDivElement>(null);
  const ctaSectionRef = useRef<HTMLDivElement>(null);

  const confBarARef = useRef<HTMLDivElement>(null);
  const confBarBRef = useRef<HTMLDivElement>(null);
  const confBarCRef = useRef<HTMLDivElement>(null);
  const confValARef = useRef<HTMLSpanElement>(null);
  const confValBRef = useRef<HTMLSpanElement>(null);
  const confValCRef = useRef<HTMLSpanElement>(null);
  const confidencePctRef = useRef<HTMLDivElement>(null);

  const spectralBands = [
    { label: 'F1', nm: '415nm', color: 'from-violet-500 to-indigo-600', height: '65%' },
    { label: 'F2', nm: '445nm', color: 'from-indigo-500 to-blue-600', height: '78%' },
    { label: 'F3', nm: '480nm', color: 'from-blue-500 to-cyan-500', height: '88%' },
    { label: 'F4', nm: '515nm', color: 'from-cyan-400 to-teal-500', height: '94%' },
    { label: 'F5', nm: '555nm', color: 'from-emerald-400 to-green-500', height: '72%' },
    { label: 'F6', nm: '590nm', color: 'from-yellow-400 to-amber-500', height: '60%' },
    { label: 'F7', nm: '630nm', color: 'from-orange-500 to-red-500', height: '52%' },
    { label: 'F8', nm: '680nm', color: 'from-red-500 to-rose-700', height: '42%' },
    { label: 'CLR', nm: 'Clear', color: 'from-slate-400 to-slate-600', height: '98%' },
    { label: 'NIR', nm: '850nm', color: 'from-purple-800 to-slate-900', height: '46%' },
  ];

  // ---------- Hero entrance timeline ----------
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        eyebrowRef.current,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.6 }
      )
        .fromTo(
          headlineRef.current,
          { opacity: 0, y: 30 },
          { opacity: 1, y: 0, duration: 0.8 },
          '-=0.3'
        )
        .fromTo(
          subtextRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6 },
          '-=0.4'
        )
        .fromTo(
          ctaRef.current?.children ?? [],
          { opacity: 0, y: 16, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.12 },
          '-=0.3'
        )
        .fromTo(
          trustRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.6 },
          '-=0.2'
        )
        .fromTo(
          hardwareCardRef.current,
          { opacity: 0, y: 40, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.9 },
          '-=0.9'
        )
        .fromTo(
          [pill1Ref.current, pill2Ref.current],
          { opacity: 0, scale: 0.7 },
          { opacity: 1, scale: 1, duration: 0.5, stagger: 0.15, ease: 'back.out(1.7)' },
          '-=0.3'
        );

      // Spectral bars grow in
      if (barsRef.current) {
        const bars = barsRef.current.querySelectorAll('[data-bar]');
        gsap.fromTo(
          bars,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: 0.8,
            stagger: 0.06,
            ease: 'elastic.out(1, 0.6)',
            transformOrigin: 'bottom',
            delay: 0.8,
          }
        );
      }

      // Animated confidence counter (76.2%)
      const counter = { val: 0 };
      gsap.to(counter, {
        val: 76.2,
        duration: 1.6,
        delay: 1.1,
        ease: 'power2.out',
        onUpdate: () => {
          if (accuracyValueRef.current) {
            accuracyValueRef.current.textContent = `Class C (Confidence ${counter.val.toFixed(1)}%)`;
          }
        },
      });

      // Ambient float loop on hero blurs
      gsap.to(heroRef.current?.querySelectorAll('.ambient-blur') ?? [], {
        y: 18,
        x: 10,
        duration: 6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        stagger: 0.5,
      });

      // Gentle continuous float on the floating pills
      gsap.to(pill1Ref.current, {
        y: -8,
        duration: 2.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2,
      });
      gsap.to(pill2Ref.current, {
        y: 8,
        duration: 2.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 2.2,
      });
    }, heroRef);

    return () => ctx.revert();
  }, []);

  // ---------- Scroll-triggered section reveals ----------
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Technology section header + cards
      if (techSectionRef.current) {
        const header = techSectionRef.current.querySelector('[data-section-header]');
        const cards = techSectionRef.current.querySelectorAll('[data-tech-card]');

        gsap.fromTo(
          header,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: header,
              start: 'top 85%',
            },
          }
        );

        gsap.fromTo(
          cards,
          { opacity: 0, y: 40, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: techSectionRef.current,
              start: 'top 70%',
            },
          }
        );
      }

      // How it works section
      if (howSectionRef.current) {
        const header = howSectionRef.current.querySelector('[data-section-header]');
        const steps = howSectionRef.current.querySelectorAll('[data-step-card]');

        gsap.fromTo(
          header,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
            scrollTrigger: { trigger: header, start: 'top 85%' },
          }
        );

        gsap.fromTo(
          steps,
          { opacity: 0, x: -30 },
          {
            opacity: 1,
            x: 0,
            duration: 0.6,
            stagger: 0.15,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: howSectionRef.current,
              start: 'top 65%',
            },
          }
        );
      }

      // Fusion section
      if (fusionSectionRef.current) {
        const textCol = fusionSectionRef.current.querySelector('[data-fusion-text]');
        const items = fusionSectionRef.current.querySelectorAll('[data-fusion-item]');

        gsap.fromTo(
          textCol,
          { opacity: 0, x: -40 },
          {
            opacity: 1,
            x: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: fusionSectionRef.current, start: 'top 70%' },
          }
        );

        gsap.fromTo(
          items,
          { opacity: 0, x: -20 },
          {
            opacity: 1,
            x: 0,
            duration: 0.5,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: fusionSectionRef.current, start: 'top 60%' },
          }
        );

        gsap.fromTo(
          fusionCardRef.current,
          { opacity: 0, x: 40, scale: 0.96 },
          {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: fusionSectionRef.current, start: 'top 70%' },
          }
        );

        // Probability bars fill + counters count up on scroll
        const probTargets = [
          { bar: confBarARef, val: confValARef, to: 4.98 },
          { bar: confBarBRef, val: confValBRef, to: 18.78 },
          { bar: confBarCRef, val: confValCRef, to: 76.24 },
        ];

        ScrollTrigger.create({
          trigger: fusionCardRef.current,
          start: 'top 75%',
          once: true,
          onEnter: () => {
            probTargets.forEach(({ bar, val, to }, i) => {
              gsap.fromTo(
                bar.current,
                { width: '0%' },
                { width: `${to}%`, duration: 1.1, delay: i * 0.15, ease: 'power2.out' }
              );
              const counter = { n: 0 };
              gsap.to(counter, {
                n: to,
                duration: 1.1,
                delay: i * 0.15,
                ease: 'power2.out',
                onUpdate: () => {
                  if (val.current) val.current.textContent = `${counter.n.toFixed(2)}%`;
                },
              });
            });

            if (confidencePctRef.current) {
              const counter = { n: 0 };
              gsap.to(counter, {
                n: 76.24,
                duration: 1.3,
                ease: 'power2.out',
                onUpdate: () => {
                  if (confidencePctRef.current) {
                    confidencePctRef.current.textContent = `${counter.n.toFixed(2)}%`;
                  }
                },
              });
            }
          },
        });
      }

      // Bottom CTA section
      if (ctaSectionRef.current) {
        gsap.fromTo(
          ctaSectionRef.current.children,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: ctaSectionRef.current, start: 'top 80%' },
          }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // ---------- Hover tilt interaction on hardware console card ----------
  useEffect(() => {
    const card = hardwareCardRef.current;
    if (!card) return;

    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -4;
      const rotateY = ((x - centerX) / centerX) * 4;

      gsap.to(card, {
        rotateX,
        rotateY,
        transformPerspective: 1000,
        duration: 0.4,
        ease: 'power2.out',
      });
    };

    const handleLeave = () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'power3.out' });
    };

    card.addEventListener('mousemove', handleMove);
    card.addEventListener('mouseleave', handleLeave);
    return () => {
      card.removeEventListener('mousemove', handleMove);
      card.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  // Helper for tech/step card hover pop
  const handleCardEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { y: -6, duration: 0.3, ease: 'power2.out' });
  };
  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    gsap.to(e.currentTarget, { y: 0, duration: 0.4, ease: 'power2.out' });
  };

  return (
    <div className="min-h-screen bg-[#E8EEF5] text-slate-900 selection:bg-slate-950 selection:text-white overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative min-h-[calc(100dvh-5rem)] flex items-center px-6 lg:px-12 py-12 overflow-hidden"
      >
        {/* Soft background ambient blurs */}
        <div className="ambient-blur absolute top-1/4 right-10 w-96 h-96 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="ambient-blur absolute bottom-10 left-10 w-80 h-80 bg-blue-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Typography & Action CTAs */}
          <div className="lg:col-span-6 space-y-6">
            {/* Eyebrow Pill */}
            <div
              ref={eyebrowRef}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/75 backdrop-blur-md border border-white/90 shadow-2xs text-xs font-semibold text-slate-700"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Sensor IoT & SVM Platform</span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="text-4xl sm:text-6xl lg:text-[68px] font-extrabold tracking-tight leading-[1.05] text-slate-950"
            >
              Next-Gen <br />
              Multi-Sensor <br />
              Scanner Platform
            </h1>

            {/* Subtext */}
            <p ref={subtextRef} className="text-sm sm:text-base text-slate-600 max-w-[50ch] leading-relaxed">
              Precision multi-sensor data acquisition powered by ESP32-S3 and an integrated SVM pipeline for robust biometric feature classification.
            </p>

            {/* Dual Pill Action Buttons */}
            <div ref={ctaRef} className="flex flex-wrap items-center gap-4 pt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                    onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                    className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>Enter Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/history"
                    onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                    onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                    className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-slate-800 bg-white/80 hover:bg-white border border-white/90 rounded-full transition-colors shadow-2xs backdrop-blur-md cursor-pointer"
                  >
                    View History
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                    onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                    className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors shadow-md active:scale-95 cursor-pointer"
                  >
                    <span>Sign In to Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/register"
                    onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                    onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                    className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-slate-800 bg-white/80 hover:bg-white border border-white/90 rounded-full transition-colors shadow-2xs backdrop-blur-md cursor-pointer"
                  >
                    Register Subject
                  </Link>
                </>
              )}
            </div>

            {/* Hardware Validation Guarantee */}
            <div ref={trustRef} className="pt-6 flex items-center gap-4">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  AS
                </div>
                <div className="w-8 h-8 rounded-full bg-cyan-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  TC
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  VL
                </div>
              </div>
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-950">100% Calibrated</span> & Tested with Multi-Sensor Hardware
              </div>
            </div>
          </div>

          {/* Right Column: Engineering Hardware Architecture Display */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            {/* Main Interactive Hardware Console Card */}
            <div
              ref={hardwareCardRef}
              style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
              className="w-full max-w-xl glass-panel p-7 sm:p-8 rounded-3xl border border-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.07)] space-y-6"
            >
              {/* Card Header: Node Status */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-sm">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">PHENOTYPE Core Unit</h3>
                    <p className="text-[11px] text-slate-500">ESP32-S3 Dual-Core 240MHz · Node A</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Simulation Ready
                </span>
              </div>

              {/* AS7341 Optical Spectroscopy Waveform Visualization */}
              <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-950">
                    <Radio className="w-4 h-4 text-cyan-600" />
                    <span>AS7341 Spectral Channels (10 Bands)</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">415nm - 850nm</span>
                </div>

                <div ref={barsRef} className="grid grid-cols-10 gap-1.5 items-end h-28 pt-2 pb-1 border-b border-slate-200/60">
                  {spectralBands.map((band) => (
                    <div key={band.label} className="flex flex-col items-center h-full justify-end group">
                      <div
                        data-bar
                        className={`w-full rounded-t-md bg-gradient-to-t ${band.color} transition-opacity duration-500 shadow-2xs hover:opacity-90`}
                        style={{ height: band.height, transformOrigin: 'bottom' }}
                        title={`${band.label} (${band.nm})`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-10 gap-1.5 text-center text-[10px] text-slate-500 font-medium">
                  {spectralBands.map((band) => (
                    <div key={band.label} className="truncate">
                      {band.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Laser Focal Distance (VL53L1X) & Color (TCS34725) Telemetry Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Distance Gauge */}
                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1.5">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-amber-600" />
                    <span>VL53L1X ToF Distance</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-slate-950">38.2 mm</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Optimal Range
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">Target window: 35 to 50 mm</div>
                </div>

                {/* Color Sensor Readout */}
                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1.5">
                  <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-purple-600" />
                    <span>TCS34725 Chromatic Vector</span>
                  </div>
                  <div className="flex items-center gap-3 pt-0.5">
                    <div
                      className="w-6 h-6 rounded-lg border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: 'rgb(185, 142, 122)' }}
                    />
                    <div className="font-mono text-xs font-bold text-slate-900">
                      R:185 G:142 B:122
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">IR filter active · CCT 4850K</div>
                </div>
              </div>

              {/* Machine Learning Decision Output */}
              <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/70 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-950 text-white flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Active Classification</div>
                    <div ref={accuracyValueRef} className="font-bold text-slate-950">
                      Class C (Confidence 0.0%)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
                  SVM Model v1.0
                </span>
              </div>
            </div>

            {/* Floating Glass Pill 1: Top Right */}
            <div
              ref={pill1Ref}
              className="hidden sm:flex absolute -top-4 -right-4 px-4 py-2 rounded-full glass-pill border border-white/90 shadow-md items-center gap-2.5 text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div className="font-bold text-slate-900">10 Spectral Bands</div>
            </div>

            {/* Floating Glass Pill 2: Bottom Left */}
            <div
              ref={pill2Ref}
              className="hidden sm:flex absolute -bottom-4 -left-4 px-4 py-2 rounded-full glass-pill border border-white/90 shadow-md items-center gap-2.5 text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="font-bold text-slate-900">80.0% Model Accuracy</div>
                <div className="text-[10px] text-slate-500">on synthetic research dataset</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section id="technology" ref={techSectionRef} className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto space-y-12">
          <div data-section-header className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              High-Precision Hardware Architecture
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Industrial grade optical, spectral, and time-of-flight components combined into a cohesive data acquisition unit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Tech 1 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">ESP32-S3 Microcontroller</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dual-core Xtensa processor handling real-time I2C bus acquisition, sensor range checks, and secure Wi-Fi REST synchronization.
              </p>
            </div>

            {/* Tech 2 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">AS7341 Spectral Sensor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                11-channel optical spectrometer measuring visible spectrum channels (F1 to F8, clear, and NIR) with high spectral selectivity.
              </p>
            </div>

            {/* Tech 3 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">TCS34725 RGB Color</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Color light-to-digital converter capturing calibrated red, green, blue, and clear chromatic coordinates with integrated IR filter.
              </p>
            </div>

            {/* Tech 4 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Gauge className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">VL53L1X ToF Sensor</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Time-of-flight laser distance measurement validating that the target is positioned at the configured 35 to 50 mm focal threshold.
              </p>
            </div>

            {/* Tech 5 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">15-Feature Fusion</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Canonical 15-dimensional feature vector combining 10 spectral channels, 4 chromatic coordinates, and 1 laser distance reading.
              </p>
            </div>

            {/* Tech 6 */}
            <div
              data-tech-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/85 shadow-sm space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center">
                <Binary className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">SVM Machine Learning</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Support Vector Machine classification pipeline utilizing StandardScaler normalization and probability confidence scoring.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={howSectionRef}
        className="py-24 px-6 lg:px-12 border-t border-slate-200/60 bg-white/40 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div data-section-header className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Four-Stage Lifecycle
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Every sample moves through four distinct operational stages to guarantee scientific consistency and data integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div
              data-step-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/90 shadow-sm space-y-4"
            >
              <div className="text-xs font-bold text-emerald-700">STEP 01</div>
              <h3 className="text-lg font-bold text-slate-950">Measure</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Subject hand is positioned over the aperture. Laser sensor validates position before optical sampling begins.
              </p>
            </div>

            {/* Step 2 */}
            <div
              data-step-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/90 shadow-sm space-y-4"
            >
              <div className="text-xs font-bold text-emerald-700">STEP 02</div>
              <h3 className="text-lg font-bold text-slate-950">Validate</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Microcontroller performs noise filtering, range checks, and averaging before packaging telemetry into JSON.
              </p>
            </div>

            {/* Step 3 */}
            <div
              data-step-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/90 shadow-sm space-y-4"
            >
              <div className="text-xs font-bold text-emerald-700">STEP 03</div>
              <h3 className="text-lg font-bold text-slate-950">Analyze</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Backend API securely validates payload, saves raw readings, and invokes the Python SVM service.
              </p>
            </div>

            {/* Step 4 */}
            <div
              data-step-card
              onMouseEnter={handleCardEnter}
              onMouseLeave={handleCardLeave}
              className="p-7 rounded-3xl glass-panel border border-white/90 shadow-sm space-y-4"
            >
              <div className="text-xs font-bold text-emerald-700">STEP 04</div>
              <h3 className="text-lg font-bold text-slate-950">Classify</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                SVM produces system class labels and confidence percentages, updated live in dashboard console.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Sensor Fusion Feature Section */}
      <section id="fusion" ref={fusionSectionRef} className="py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div data-fusion-text className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
              Multi-Sensor Fusion & Intelligent Alignment
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              PHENOTYPE is designed to fuse spectral optical channels, chromatic coordinate vectors, and laser distance readings to reduce spatial positioning errors. Hardware integration is pending; current data is simulation-based.
            </p>

            <div className="space-y-4">
              <div
                data-fusion-item
                className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-950">Guided Distance Validation</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Planned: sampling will not initiate unless the target is within the optimal 35 to 50 mm focal distance. Hardware integration pending.
                  </p>
                </div>
              </div>

              <div
                data-fusion-item
                className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-950">Dual Trigger Control</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Planned: initiate measurements either by pressing the physical button on the ESP32 enclosure or via the web console. Hardware integration pending.
                  </p>
                </div>
              </div>

              <div
                data-fusion-item
                className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-950">Fail-Safe Data Persistence</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Raw sensor readings remain safely preserved in the database even if the ML service is temporarily unreachable.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Preview Card */}
          <div ref={fusionCardRef} className="p-8 rounded-3xl glass-panel border border-white/90 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-950">Simulated Classification Preview</span>
              </div>
              <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold shadow-2xs">
                Simulation Only
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Class Label</div>
                <div className="text-2xl font-black text-slate-950">Class C</div>
                <div className="text-[10px] text-slate-500">System label</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/70 space-y-1">
                <div className="text-[11px] text-slate-400 font-medium">Confidence</div>
                <div ref={confidencePctRef} className="text-2xl font-black text-emerald-700">
                  0.00%
                </div>
                <div className="text-[10px] text-slate-500">Decision score</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-500 text-[11px] font-medium">
                <span>Class Probabilities</span>
                <span>Model SVM-v1.0</span>
              </div>
              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between text-slate-600 text-[11px] mb-1 font-medium">
                    <span>Class A</span>
                    <span ref={confValARef}>0.00%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div ref={confBarARef} className="h-full bg-slate-400 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 text-[11px] mb-1 font-medium">
                    <span>Class B</span>
                    <span ref={confValBRef}>0.00%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div ref={confBarBRef} className="h-full bg-slate-500 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-950 text-[11px] mb-1 font-bold">
                    <span>Class C (classification output)</span>
                    <span ref={confValCRef}>0.00%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                    <div ref={confBarCRef} className="h-full bg-slate-950 rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Section */}
      <section ref={ctaSectionRef} className="py-24 px-6 lg:px-12 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950">
            Ready to explore PHENOTYPE?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
            Access the measurement console to initialize sensor nodes, conduct live calibration, and inspect machine learning evaluations.
          </p>
          <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors shadow-md active:scale-95 cursor-pointer"
              >
                <span>Enter System Console</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                  onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                  className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-colors shadow-md active:scale-95 cursor-pointer"
                >
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/login"
                  onMouseEnter={(e) => gsap.to(e.currentTarget, { scale: 1.05, duration: 0.25, ease: 'power2.out' })}
                  onMouseLeave={(e) => gsap.to(e.currentTarget, { scale: 1, duration: 0.25, ease: 'power2.out' })}
                  className="inline-flex items-center gap-2 px-8 py-4 text-xs font-semibold text-slate-800 bg-white/80 hover:bg-white border border-white/90 rounded-full transition-colors shadow-2xs backdrop-blur-md cursor-pointer"
                >
                  <span>Operator Sign In</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}