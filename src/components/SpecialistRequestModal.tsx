import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";
import { X } from "lucide-react";

interface SpecialistRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SpecialistRequestModal({
  open,
  onClose,
  onSuccess,
}: SpecialistRequestModalProps) {
  const [email, setEmail] = useState("");
  const [specialistType, setSpecialistType] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("specialist_requests").insert({
        session_id: getSessionId(),
        email: email.trim() || null,
        specialist_type: specialistType || null,
        notes: notes.trim() || null,
      });
      if (!error) {
        setSubmitted(true);
        onSuccess?.();
        setTimeout(() => {
          onClose();
          setEmail("");
          setSpecialistType("");
          setNotes("");
          setSubmitted(false);
        }, 1500);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1e1e2e] p-5 sm:p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white/80"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-base font-semibold text-white mb-1">
          Request a specialist
        </h3>
        <p className="text-xs text-white/60 mb-4">
          Tell us which specialist you need and we&apos;ll get back to you.
        </p>
        {submitted ? (
          <p className="text-sm text-emerald-400 py-4">
            Thanks! We&apos;ll be in touch.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="specialist-email"
                className="block text-xs font-medium text-white/70 mb-1.5"
              >
                Email <span className="text-white/40">(optional)</span>
              </label>
              <Input
                id="specialist-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label
                htmlFor="specialist-type"
                className="block text-xs font-medium text-white/70 mb-1.5"
              >
                Specialist type
              </label>
              <Input
                id="specialist-type"
                type="text"
                placeholder="e.g. Legal, Financial, Technical..."
                value={specialistType}
                onChange={(e) => setSpecialistType(e.target.value)}
                disabled={submitting}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div>
              <label
                htmlFor="specialist-notes"
                className="block text-xs font-medium text-white/70 mb-1.5"
              >
                Notes <span className="text-white/40">(optional)</span>
              </label>
              <Textarea
                id="specialist-notes"
                placeholder="What do you need help with?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={submitting}
                rows={3}
                className="bg-white/5 border-white/10 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="text-white/70"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                {submitting ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
