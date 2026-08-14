"use client";

export function PrintButton() {
  return (
    <button 
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
    >
      Print PDF
    </button>
  );
}
