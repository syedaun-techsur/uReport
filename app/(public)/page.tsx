'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CategoryRecord } from '@/types/domain';

// MANDATORY: ssr: false — Leaflet accesses window at init
const ReportingMap = dynamic(() => import('@/components/maps/ReportingMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '400px',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
      }}
    >
      Loading map…
    </div>
  ),
});

const DEFAULT_CENTER_LAT = parseFloat(
  process.env.NEXT_PUBLIC_CITY_CENTER_LAT ?? '39.165325'
);
const DEFAULT_CENTER_LNG = parseFloat(
  process.env.NEXT_PUBLIC_CITY_CENTER_LNG ?? '-86.526384'
);

export default function PublicPortalPage() {
  const router = useRouter();

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState('');

  // Category state
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryRecord | null>(null);

  // Form fields
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch categories on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data: CategoryRecord[]) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {
        // Non-fatal — category picker will be empty
      });
  }, []);

  // Update selected category when category_id changes
  useEffect(() => {
    if (!categoryId) {
      setSelectedCategory(null);
      return;
    }
    const found = categories.find((c) => c.id === categoryId) ?? null;
    setSelectedCategory(found);
  }, [categoryId, categories]);

  const handleLocationChange = (newLat: number, newLng: number, newAddress?: string) => {
    setLat(newLat);
    setLng(newLng);
    if (newAddress) setAddress(newAddress);
    // Clear location error when user places a pin
    if (validationError.toLowerCase().includes('location') ||
        validationError.toLowerCase().includes('pin') ||
        validationError.toLowerCase().includes('map')) {
      setValidationError('');
    }
  };

  // Build grouped options for the category picker
  const groupedCategories = () => {
    const groups = new Map<string, { groupName: string; categories: CategoryRecord[] }>();
    for (const cat of categories) {
      const key = cat.group_id ?? '__none__';
      const label = cat.group_name ?? cat.group_id ?? 'Other';
      if (!groups.has(key)) {
        groups.set(key, { groupName: label, categories: [] });
      }
      groups.get(key)!.categories.push(cat);
    }
    return Array.from(groups.values());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setSubmitError('');

    // Client-side validation
    if (lat === null || lng === null) {
      setValidationError('Please drop a pin on the map or search for an address to set the location.');
      return;
    }
    if (!categoryId) {
      setValidationError('Please select a service category.');
      return;
    }
    if (description.length < 10) {
      setValidationError('Description must be at least 10 characters.');
      return;
    }
    if (selectedCategory && !selectedCategory.anon_allowed) {
      if (!name.trim()) {
        setValidationError('Name is required for this category.');
        return;
      }
      if (!email.trim()) {
        setValidationError('Email is required for this category.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('lat', String(lat));
      formData.append('lng', String(lng));
      formData.append('address', address || `${lat},${lng}`);
      formData.append('category_id', categoryId);
      formData.append('description', description);
      if (name) formData.append('name', name);
      if (email) formData.append('email', email);
      if (phone) formData.append('phone', phone);
      if (photo) formData.append('photo', photo);

      const res = await fetch('/api/tickets', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/tickets/${data.ticket_id}/confirm`);
      } else {
        const err = await res.json().catch(() => ({}));
        setSubmitError(err?.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const anonAllowed = selectedCategory?.anon_allowed ?? true;
  const groups = groupedCategories();

  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
        Report a Municipal Issue
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
        Use this form to report issues to city services. Your report will be reviewed and addressed.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── Location ── */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            1. Location
          </h2>
          <ReportingMap
            onLocationChange={handleLocationChange}
            defaultCenter={[DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG]}
          />
          {lat !== null && lng !== null && (
            <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
              ✓ Location set: {lat.toFixed(5)}, {lng.toFixed(5)}
              {address ? ` — ${address}` : ''}
            </p>
          )}
        </section>

        {/* ── Category ── */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            2. Service Category
          </h2>
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              background: 'white',
            }}
          >
            <option value="">— Select a category —</option>
            {groups.map((group) => (
              <optgroup key={group.groupName} label={group.groupName}>
                {group.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </section>

        {/* ── Description ── */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            3. Description
          </h2>
          <textarea
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue in detail (minimum 10 characters)…"
            rows={5}
            maxLength={4000}
            required
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'right', margin: '2px 0 0' }}>
            {description.length}/4000
          </p>
        </section>

        {/* ── Photo ── */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
            4. Photo (optional)
          </h2>
          {!showPhotoInput ? (
            <button
              type="button"
              onClick={() => setShowPhotoInput(true)}
              style={{
                padding: '8px 16px',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
              }}
            >
              + Add photo
            </button>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                style={{ fontSize: '14px' }}
              />
              {photo && (
                <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                  ✓ {photo.name} ({(photo.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── Contact Info ── */}
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
            5. Contact Information
          </h2>

          {selectedCategory && !anonAllowed && (
            <p
              role="alert"
              style={{
                color: '#dc2626',
                fontSize: '13px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
              }}
            >
              This category requires contact information for follow-up.
            </p>
          )}

          {selectedCategory && anonAllowed && (
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '12px' }}>
              Contact information is optional for this category.
            </p>
          )}

          {!selectedCategory && (
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '12px' }}>
              Contact information is optional
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label
                htmlFor="name"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}
              >
                Name{selectedCategory && !anonAllowed ? ' *' : ''}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={selectedCategory ? !anonAllowed : false}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}
              >
                Email{selectedCategory && !anonAllowed ? ' *' : ''}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={selectedCategory ? !anonAllowed : false}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}
              >
                Phone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </section>

        {/* ── Validation / submit errors ── */}
        {validationError && (
          <div
            role="alert"
            style={{
              color: '#dc2626',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {validationError}
          </div>
        )}
        {submitError && (
          <div
            role="alert"
            style={{
              color: '#dc2626',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px',
            background: submitting ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>
    </main>
  );
}
