import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { EVENT_CATEGORIES } from '../constants';

export const useEventCategories = () => {
  const [categories, setCategories] = useState(EVENT_CATEGORIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('event_categories')
      .select('*')
      .eq('is_active', true)
      .order('label')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setCategories(data.map(d => ({
            label: d.label,
            value: d.value,
            subcategories: Array.isArray(d.subcategories) ? d.subcategories : []
          })));
        }
        setLoading(false);
      });
  }, []);

  return { categories, loading };
};
