import { useState, useEffect } from 'react';
import { API_URLS } from '../utils';
import { withDate } from '../utils/localProgress';

export function useDaily() {
  const [daily, setDaily] = useState(null);
  useEffect(() => {
    fetch(withDate(API_URLS.daily))
      .then(r => r.json())
      .then(setDaily);
  }, []);
  return daily;
}