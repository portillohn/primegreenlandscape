"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
    value: string;
    onChange: (val: string) => void;
    onSelect: (address: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export default function AddressInput({
    value,
    onChange,
    onSelect,
    placeholder = "Enter your home address...",
    className = "",
    disabled = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
    const [ready, setReady] = useState(false);

    // Wait for Google Maps to be available
    useEffect(() => {
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            if (
                typeof window !== "undefined" &&
                window.google?.maps?.places?.Autocomplete
            ) {
                setReady(true);
                clearInterval(check);
            }
            // After 10 seconds give up gracefully — input still works
            if (attempts > 100) clearInterval(check);
        }, 100);

        return () => clearInterval(check);
    }, []);

    // Initialize autocomplete once Google is ready
    useEffect(() => {
        if (!ready || !inputRef.current) return;

        // Cleanup previous instance
        if (listenerRef.current) {
            google.maps.event.removeListener(listenerRef.current);
        }

        autocompleteRef.current = new google.maps.places.Autocomplete(
            inputRef.current,
            {
                componentRestrictions: { country: "us" },
                fields: ["formatted_address", "geometry", "name"],
                types: ["address"],
                bounds: new google.maps.LatLngBounds(
                    // Montgomery County, MD bounds
                    new google.maps.LatLng(38.928, -77.351),
                    new google.maps.LatLng(39.360, -76.880)
                ),
                strictBounds: false,
            }
        );

        listenerRef.current = autocompleteRef.current.addListener(
            "place_changed",
            () => {
                const place = autocompleteRef.current?.getPlace();
                const addr = place?.formatted_address ?? inputRef.current?.value ?? "";
                if (addr) {
                    onChange(addr);
                    onSelect(addr);
                }
            }
        );

        return () => {
            if (listenerRef.current) {
                google.maps.event.removeListener(listenerRef.current);
            }
        };
    }, [ready, onChange, onSelect]);

    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={className}
            // Prevent form submit on Enter if dropdown is open
            onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
            }}
        />
    );
}
