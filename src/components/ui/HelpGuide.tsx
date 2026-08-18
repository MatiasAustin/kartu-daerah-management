"use client";

import { useState } from "react";
import { HelpCircle, X, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";

export interface HelpStep {
  title: string;
  icon: string;
  content: React.ReactNode;
}

export function HelpGuide({ steps, label = "Panduan" }: { steps: HelpStep[]; label?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const open = () => { setCurrentStep(0); setIsOpen(true); };
  const close = () => setIsOpen(false);
  const prev = () => setCurrentStep(s => Math.max(0, s - 1));
  const next = () => setCurrentStep(s => Math.min(steps.length - 1, s + 1));

  const step = steps[currentStep];

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={open}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        {label}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={close} />

          {/* Card */}
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[80vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-4 shrink-0">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-200" />
                  <p className="text-xs font-medium text-indigo-200 uppercase tracking-widest">Panduan Penggunaan</p>
                </div>
                <button onClick={close} className="p-1 rounded-full hover:bg-white/20 transition-colors text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl">{step.icon}</span>
                <h2 className="text-lg font-bold text-white leading-tight">{step.title}</h2>
              </div>
            </div>

            {/* Step Dots */}
            <div className="flex justify-center gap-1.5 pt-3 pb-1 shrink-0">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-200 ${i === currentStep ? "w-6 bg-indigo-600" : "w-1.5 bg-slate-200 hover:bg-slate-300"}`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-slate-700 space-y-3">
              {step.content}
            </div>

            {/* Footer Nav */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={prev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-xs text-slate-400">{currentStep + 1} / {steps.length}</span>
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={next}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={close}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Selesai ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
