import { useState, useEffect } from 'react';

export default function useScrolled(threshold = 40) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > threshold);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, [threshold]);

  return isScrolled;
}
