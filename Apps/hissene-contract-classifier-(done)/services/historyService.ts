import { HistoryItem } from '../types';

const STORAGE_KEY = 'hakeem_history_v1';
const MAX_ITEMS = 50;

export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Failed to load history", error);
    return [];
  }
};

export const addToHistory = (item: HistoryItem): HistoryItem[] => {
  try {
    const current = getHistory();
    // Prepend new item, remove duplicates if exact same query/type to keep it clean, limit to MAX_ITEMS
    const filtered = current.filter(i => !(i.query === item.query && i.type === item.type));
    const updated = [item, ...filtered].slice(0, MAX_ITEMS);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    console.error("Failed to save history", error);
    return [];
  }
};

export const clearHistory = (): HistoryItem[] => {
  localStorage.removeItem(STORAGE_KEY);
  return [];
};
