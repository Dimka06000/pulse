'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AddressResult {
  address: string;
  city: string;
  postalCode: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  label?: string;
  value?: string;
  placeholder?: string;
  onSelect: (result: AddressResult) => void;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (input: HTMLInputElement, options?: Record<string, unknown>) => GoogleAutocomplete;
        };
      };
    };
    initGoogleMaps?: () => void;
  }
}

interface GoogleAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    geometry?: {
      location: { lat: () => number; lng: () => number };
    };
  };
}

let googleLoaded = false;
let googleLoading = false;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (googleLoaded) return Promise.resolve();
  if (googleLoading) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (googleLoaded) { clearInterval(check); resolve(); }
      }, 100);
    });
  }

  googleLoading = true;
  return new Promise((resolve, reject) => {
    window.initGoogleMaps = () => {
      googleLoaded = true;
      googleLoading = false;
      resolve();
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.onerror = () => { googleLoading = false; reject(); };
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({ label, value, placeholder, onSelect }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value || '');
  const [ready, setReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey).then(() => setReady(true)).catch(() => {});
  }, [apiKey]);

  const initAutocomplete = useCallback(() => {
    if (!ready || !inputRef.current || !window.google || autocompleteRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'fr' },
      fields: ['formatted_address', 'address_components', 'geometry'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place.geometry) return;

      const components = place.address_components || [];
      let city = '';
      let postalCode = '';

      for (const comp of components) {
        if (comp.types.includes('locality')) city = comp.long_name;
        if (comp.types.includes('postal_code')) postalCode = comp.long_name;
      }

      const result: AddressResult = {
        address: place.formatted_address || '',
        city,
        postalCode,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };

      setInputValue(result.address);
      onSelect(result);
    });
  }, [ready, onSelect]);

  useEffect(() => { initAutocomplete(); }, [initAutocomplete]);

  // Update if value prop changes
  useEffect(() => { if (value !== undefined) setInputValue(value); }, [value]);

  if (!apiKey) {
    // Fallback: simple text input if no API key
    return (
      <div>
        {label && <label className="text-sm font-medium text-text mb-1 block">{label}</label>}
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder || 'Entrez votre adresse'}
          className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>
    );
  }

  return (
    <div>
      {label && <label className="text-sm font-medium text-text mb-1 block">{label}</label>}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder={placeholder || 'Rechercher une adresse...'}
          className="w-full rounded-xl border border-border bg-bg px-4 py-2.5 pl-10 text-sm text-text placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3 h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      {!ready && <p className="mt-1 text-[10px] text-muted">Chargement Google Maps...</p>}
    </div>
  );
}
