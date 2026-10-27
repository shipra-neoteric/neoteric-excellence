// Tiny fetch-once-and-share cache for the department list (GET /api/departments).
// Lots of unrelated screens (Trainees, Modules, Assessment, Rotation) all need
// "code -> name" and the dropdown options, so this avoids each of them independently
// re-fetching it and avoids prop-drilling it through the component tree.
import { useEffect, useState } from 'react';
import { api } from './api/client';

let cache = null;
let inflight = null;
const listeners = new Set();

export function loadDepartments() {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = api.get('/departments').then((departments) => {
    cache = departments;
    inflight = null;
    listeners.forEach((fn) => fn(cache));
    return cache;
  });
  return inflight;
}

// Call after any create/rename/delete so every screen using useDepartments() picks
// up the change without a full page reload.
export function invalidateDepartments() {
  cache = null;
  return loadDepartments();
}

export function useDepartments() {
  const [departments, setDepartments] = useState(cache ?? []);
  useEffect(() => {
    if (cache) {
      setDepartments(cache);
    } else {
      loadDepartments().then(setDepartments);
    }
    listeners.add(setDepartments);
    return () => listeners.delete(setDepartments);
  }, []);
  return departments;
}

export function useDeptName() {
  const departments = useDepartments();
  return (code) => departments.find((d) => d.code === code)?.name ?? code;
}
