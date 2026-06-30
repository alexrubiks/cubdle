import { useState, useEffect } from 'react';
import { API_URLS } from '../utils';

export function useDaily() {
  const [daily, setDaily] = useState(null);
  useEffect(() => {
    fetch(API_URLS.daily)
      .then(r => r.json())
      .then(setDaily);
  }, []);
  return daily;
}