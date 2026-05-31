import React, { useState, useEffect } from "react";
import { useSessionStore } from "../store/sessionStore";
import { useStream } from "../hooks/useStream";

interface BirthFormProps {
  isOpen: boolean;
  onClose: () => void;
  pendingMessage?: string;
  onSuccess?: () => void;
}

export const BirthForm: React.FC<BirthFormProps> = ({
  isOpen,
  onClose,
  pendingMessage,
  onSuccess,
}) => {
  const store = useSessionStore();
  const { sendMessage } = useStream();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [place, setPlace] = useState("");

  const [errors, setErrors] = useState<{ date?: string; place?: string }>({});

  useEffect(() => {
    if (isOpen) {
      if (store.birthDetails) {
        setDate(store.birthDetails.date);
        setPlace(store.birthDetails.place);
        if (store.birthDetails.time) {
          setTime(store.birthDetails.time);
          setUnknownTime(false);
        } else {
          setTime("");
          setUnknownTime(true);
        }
      } else {
        setDate("");
        setTime("");
        setUnknownTime(false);
        setPlace("");
      }
      setErrors({});
    }
  }, [isOpen, store.birthDetails]);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  const validate = (): boolean => {
    const newErrors: { date?: string; place?: string } = {};

    if (!date) {
      newErrors.date = "Birth date is required.";
    } else if (date > todayStr) {
      newErrors.date = "Birth date cannot be in the future.";
    } else {
      const year = new Date(date).getFullYear();
      if (year < 1800 || year > 2100) {
        newErrors.date = "Birth year must be between 1800 and 2100.";
      }
    }

    if (!place.trim()) {
      newErrors.place = "Place of birth is required.";
    } else if (place.trim().length < 3) {
      newErrors.place = "Please enter at least 3 characters for the location.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const birthDetails = {
      date,
      time: unknownTime ? null : time || null,
      place: place.trim(),
    };

    store.setBirthDetails(birthDetails);

    if (pendingMessage) {
      sendMessage(pendingMessage, birthDetails);
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-primary transition-colors duration-200 text-xl font-light"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="text-3xl text-primary font-serif mb-2 select-none">
            ✧ Birth Details ✧
          </div>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Provide your birth information to compute an accurate Swiss Ephemeris chart and fetch your transits.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
              Date of Birth *
            </label>
            <input
              type="date"
              value={date}
              max={todayStr}
              onChange={(e) => setDate(e.target.value)}
              className={`w-full bg-input text-foreground border rounded-xl px-4 py-2.5 outline-none transition-all duration-200 text-sm font-sans focus:border-primary focus:ring-1 focus:ring-primary/30 ${
                errors.date ? "border-destructive" : "border-border"
              }`}
            />
            {errors.date && (
              <p className="text-xs text-destructive mt-1.5 font-light">{errors.date}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-primary uppercase tracking-wider">
                Time of Birth
              </label>
              <div className="flex items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  id="unknown-time"
                  checked={unknownTime}
                  onChange={(e) => setUnknownTime(e.target.checked)}
                  className="rounded border-border bg-input text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <label
                  htmlFor="unknown-time"
                  className="text-xs text-muted-foreground cursor-pointer font-light"
                >
                  I don't know my time
                </label>
              </div>
            </div>
            <input
              type="time"
              value={time}
              disabled={unknownTime}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-input text-foreground border border-border rounded-xl px-4 py-2.5 outline-none transition-all duration-200 text-sm font-sans focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary uppercase tracking-wider mb-1.5">
              Place of Birth *
            </label>
            <input
              type="text"
              value={place}
              placeholder="e.g. New Delhi, India"
              onChange={(e) => setPlace(e.target.value)}
              className={`w-full bg-input text-foreground border rounded-xl px-4 py-2.5 outline-none transition-all duration-200 text-sm font-sans placeholder:text-muted-foreground/40 focus:border-primary focus:ring-1 focus:ring-primary/30 ${
                errors.place ? "border-destructive" : "border-border"
              }`}
            />
            {errors.place && (
              <p className="text-xs text-destructive mt-1.5 font-light">{errors.place}</p>
            )}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-transparent hover:bg-input/60 text-muted-foreground border border-border rounded-xl py-3 text-sm font-semibold tracking-wider uppercase transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 text-sm font-bold tracking-wider uppercase shadow-lg shadow-primary/15 transition-all duration-200"
            >
              Save &amp; Cast
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
