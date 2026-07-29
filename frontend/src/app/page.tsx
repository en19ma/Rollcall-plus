import Link from 'next/link';
import { GraduationCap, QrCode, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-lg font-semibold">RollCall+</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary">Sign in</Link>
          <Link href="/register" className="btn-primary">Get started <ArrowRight className="h-4 w-4" /></Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-16 pb-24 text-center">
        <span className="badge bg-accent/10 text-accent-light mb-6">Secured University Access Portal</span>
        <h1 className="font-display text-4xl font-semibold leading-tight sm:text-6xl">
          Attendance, taken in
          <span className="bg-gradient-to-r from-accent-light to-teal bg-clip-text text-transparent"> ten seconds</span>,
          <br className="hidden sm:block" /> not ten minutes.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base-50/60 text-lg">
          RollCall+ replaces the paper sheet with a QR check-in, live analytics, and automatic
          low-attendance alerts &mdash; built for lecture halls with thousands of students.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Create your account</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">I already have one</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-3">
          <FeatureCard
            icon={<QrCode className="h-5 w-5" />}
            title="QR & geofenced check-in"
            description="Lecturers open a session, students scan and check in — with optional location and expiry enforcement."
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="Live analytics"
            description="Attendance trends by course, department, and student, with automatic low-attendance flags."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Role-based access"
            description="Students, lecturers, and administrators each see exactly what they need — nothing more."
          />
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-center text-sm text-base-50/40">
        RollCall+ &middot; Group 2 Software Engineering Project
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="glass-panel p-6 text-left">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent-light">
        {icon}
      </div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-base-50/60">{description}</p>
    </div>
  );
}
